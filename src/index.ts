import { GlobalKeyboardListener } from 'node-global-key-listener';
import { YandexSpeechService } from './services/YandexSpeechService';
import { VKCloudSpeechService } from './services/VKCloudSpeechService';
import { AudioRecorderService } from './services/AudioRecorderService';
import { ISpeechService } from './services/ISpeechService';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import Clipboard from '@crosscopy/clipboard';

// Загружаем переменные окружения
dotenv.config();

type SpeechProvider = 'yandex' | 'vkcloud';

class SpeechToTextApp {
    private isRecording: boolean = false;
    private keyListener: GlobalKeyboardListener;
    private audioRecorder: AudioRecorderService;
    private speechService: ISpeechService;
    private currentRecordingFile: string | null = null;

    constructor(provider: SpeechProvider = 'yandex') {
        const yandexApiKey = process.env.YANDEX_API_KEY;
        const vkCloudToken = process.env.VK_CLOUD_TOKEN;

        this.keyListener = new GlobalKeyboardListener();
        this.audioRecorder = new AudioRecorderService();

        // Выбираем провайдер распознавания речи
        switch (provider) {
            case 'vkcloud':
                if (!vkCloudToken) {
                    throw new Error('VK_CLOUD_TOKEN not found in environment variables');
                }
                this.speechService = new VKCloudSpeechService(vkCloudToken);
                break;
            case 'yandex':
            default:
                if (!yandexApiKey) {
                    throw new Error('YANDEX_API_KEY not found in environment variables');
                }
                this.speechService = new YandexSpeechService(yandexApiKey);
                break;
        }
    }

    private setupHotkey() {
        this.keyListener.addListener((_e, down) => {
            const isAltPressed = down['LEFT ALT'] || down['RIGHT ALT'];
            const isRPressed = down['R'];
            
            if (isAltPressed && isRPressed) {
                this.toggleRecording();
            }
        });
    }

    private async selectAudioDevice(): Promise<void> {
        const devices = await this.audioRecorder.listAudioDevices();
        
        if (devices.length === 0) {
            throw new Error('Не найдены аудио устройства');
        }

        console.log('\nДоступные аудио устройства:');
        devices.forEach((device, index) => {
            console.log(`${index + 1}. ${device.description}`);
        });

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve, reject) => {
            rl.question('\nВыберите номер устройства: ', (answer) => {
                rl.close();
                
                const index = parseInt(answer) - 1;
                if (isNaN(index) || index < 0 || index >= devices.length) {
                    reject(new Error('Неверный номер устройства'));
                    return;
                }

                this.audioRecorder.setAudioDevice(devices[index].name);
                console.log(`\nВыбрано устройство: ${devices[index].description}`);
                resolve();
            });
        });
    }

    private async toggleRecording() {
        try {
            if (!this.isRecording) {
                console.log('Начинаем запись...');
                this.currentRecordingFile = await this.audioRecorder.startRecording();
                this.isRecording = true;
            } else {
                console.log('Останавливаем запись...');
                await this.audioRecorder.stopRecording();
                this.isRecording = false;

                if (this.currentRecordingFile) {
                    console.log('Преобразуем речь в текст...');
                    const text = await this.speechService.speechToText(this.currentRecordingFile);
                    await Clipboard.setText(text);
                    console.log('Текст скопирован в буфер обмена');
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    public async cleanup() {
        await this.audioRecorder.cleanup();
    }

    public async start() {
        try {
            await this.selectAudioDevice();
            this.setupHotkey();
            console.log('\nПриложение запущено. Нажмите Alt + R для начала/остановки записи.');
        } catch (error) {
            console.error('Ошибка при запуске:', error);
            process.exit(1);
        }
    }
}

// Создаем и запускаем приложение
const app = new SpeechToTextApp();
app.start();

// Обработка выхода из приложения
process.on('SIGINT', async () => {
    console.log('\nЗавершение работы...');
    await app.cleanup();
    process.exit();
}); 