import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';

const execAsync = promisify(exec);

interface AudioDevice {
    name: string;
    description: string;
    alternativeName: string;
}

export class AudioRecorderService {
    private process: any = null;
    private outputPath: string;
    private isRecording: boolean = false;
    private selectedDevice: string | null = null;
    private readonly MAX_FILE_AGE_MS = 10 * 60 * 1000; // 10 минут

    constructor() {
        // Используем папку AppData для хранения временных файлов
        this.outputPath = path.join(app.getPath('userData'), 'recordings');
        this.setupCleanup();
    }

    private async setupCleanup() {
        // Создаем директорию, если её нет
        await fs.mkdir(this.outputPath, { recursive: true });
        
        // Чистим старые файлы при запуске
        await this.cleanupOldFiles();
    }

    private async cleanupOldFiles() {
        try {
            const now = Date.now();
            const files = await fs.readdir(this.outputPath);
            
            for (const file of files) {
                const filePath = path.join(this.outputPath, file);
                const stats = await fs.stat(filePath);
                
                // Удаляем файлы старше 10 минут
                if (now - stats.mtimeMs > this.MAX_FILE_AGE_MS) {
                    await fs.unlink(filePath);
                    console.log(`Удален старый файл записи: ${file}`);
                }
            }
        } catch (error) {
            console.error('Ошибка при очистке старых файлов:', error);
        }
    }

    private async checkFFmpeg(): Promise<void> {
        try {
            await execAsync('ffmpeg -version');
        } catch (error) {
            throw new Error(
                'FFmpeg не установлен. Пожалуйста, установите FFmpeg:\n' +
                '1. Скачайте FFmpeg с https://ffmpeg.org/download.html\n' +
                '2. Распакуйте архив\n' +
                '3. Добавьте путь к папке bin в системную переменную PATH'
            );
        }
    }

    async listAudioDevices(): Promise<AudioDevice[]> {
        // Проверяем наличие FFmpeg перед поиском устройств
        await this.checkFFmpeg();
        
        try {
            // FFmpeg на Windows выводит список устройств в stderr
            const { stderr } = await execAsync('ffmpeg -list_devices true -f dshow -i dummy');
            const devices: AudioDevice[] = [];
            
            // Разбиваем вывод на строки для анализа
            const lines = stderr.split('\n');
            let currentDevice: Partial<AudioDevice> = {};
            
            for (const line of lines) {
                // Ищем строку с именем аудио устройства
                const deviceMatch = line.match(/"([^"]+)"\s+\(audio\)/);
                if (deviceMatch) {
                    // Если у нас есть предыдущее устройство, добавляем его в список
                    if (currentDevice.name) {
                        devices.push(currentDevice as AudioDevice);
                    }
                    // Начинаем новое устройство
                    currentDevice = {
                        name: deviceMatch[1],
                        description: deviceMatch[1]
                    };
                    continue;
                }

                // Ищем альтернативное имя для текущего устройства
                const alternativeMatch = line.match(/Alternative name\s+"([^"]+)"/);
                if (alternativeMatch && currentDevice.name) {
                    currentDevice.alternativeName = alternativeMatch[1];
                    // Добавляем устройство в список, так как альтернативное имя - последняя строка информации об устройстве
                    devices.push(currentDevice as AudioDevice);
                    currentDevice = {};
                }
            }
            
            // Проверяем, нашли ли мы хоть одно устройство
            if (devices.length === 0) {
                throw new Error('Не удалось найти аудио устройства. Проверьте, что микрофон подключен и работает.');
            }
            
            return devices;
        } catch (error: any) {
            // Если это наша ошибка про отсутствие устройств, пробрасываем её дальше
            if (error.message.includes('Не удалось найти аудио устройства')) {
                throw error;
            }
            // Иначе формируем более понятное сообщение об ошибке
            throw new Error(`Ошибка при получении списка устройств: ${error.message}`);
        }
    }

    setAudioDevice(deviceName: string) {
        this.selectedDevice = deviceName;
    }

    async startRecording(): Promise<string> {
        // Проверяем наличие FFmpeg перед началом записи
        await this.checkFFmpeg();

        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }

        if (!this.selectedDevice) {
            throw new Error('Аудио устройство не выбрано. Пожалуйста, выберите устройство через setAudioDevice()');
        }

        // Чистим старые файлы перед началом новой записи
        await this.cleanupOldFiles();

        // Создаем временную директорию, если её нет
        await fs.mkdir(this.outputPath, { recursive: true });

        const outputFile = path.join(this.outputPath, `recording_${Date.now()}.ogg`);
        
        // Используем FFmpeg для записи с микрофона
        this.process = spawn('ffmpeg', [
            '-f', 'dshow',
            '-i', `audio=${this.selectedDevice}`,
            // Конвертируем в моно и устанавливаем частоту дискретизации
            '-ac', '1',
            '-ar', '48000',
            // Используем кодек Opus вместо Vorbis
            '-acodec', 'libopus',
            // Устанавливаем битрейт для лучшего качества
            '-b:a', '48k',
            // Формат контейнера
            '-f', 'ogg',
            outputFile
        ]);

        // Обработка ошибок FFmpeg
        this.process.stderr.on('data', (data: Buffer) => {
            console.error('FFmpeg stderr:', data.toString());
        });

        this.process.on('error', (err: Error) => {
            console.error('FFmpeg error:', err);
            throw err;
        });

        this.isRecording = true;
        return outputFile;
    }

    async stopRecording(): Promise<void> {
        if (!this.isRecording || !this.process) {
            throw new Error('No recording in progress');
        }

        return new Promise((resolve, reject) => {
            this.process.on('close', () => {
                this.isRecording = false;
                this.process = null;
                resolve();
            });

            this.process.on('error', (err: Error) => {
                reject(err);
            });

            // Отправляем сигнал для завершения записи
            this.process.stdin.write('q');
        });
    }

    async cleanup(): Promise<void> {
        try {
            await fs.rm(this.outputPath, { recursive: true, force: true });
        } catch (error) {
            console.error('Error cleaning up temp files:', error);
        }
    }

    // Удаляем конкретный файл после успешного распознавания
    async deleteFile(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
            console.log(`Файл успешно удален: ${filePath}`);
        } catch (error) {
            console.error('Ошибка при удалении файла:', error);
        }
    }
} 