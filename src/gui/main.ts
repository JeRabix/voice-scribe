import { app, BrowserWindow, ipcMain, clipboard, Tray, Menu } from 'electron';
import * as path from 'path';
import { AudioRecorderService } from '../services/AudioRecorderService';
import { YandexSpeechService } from '../services/YandexSpeechService';
import { VKCloudSpeechService } from '../services/VKCloudSpeechService';
import { ISpeechService } from '../services/ISpeechService';
import { SettingsService } from '../services/SettingsService';
import * as dotenv from 'dotenv';
import { GlobalKeyboardListener } from 'node-global-key-listener';

dotenv.config();

let audioRecorder: AudioRecorderService;
const settingsService = new SettingsService();
let speechService: ISpeechService;
let mainWindow: BrowserWindow | null = null;
let isRecording = false;
let isQuitting = false;
let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;

// Настройка глобальных хоткеев
let keyboardListener: GlobalKeyboardListener | null = null;

// Добавляем сохранение размеров окна
let windowBounds = { width: 500, height: 140, x: 0, y: 0 };

async function setupGlobalHotkeys() {
    // Удаляем предыдущий слушатель, если он существует
    if (keyboardListener) {
        keyboardListener.kill();
    }

    keyboardListener = new GlobalKeyboardListener();
    const settings = await settingsService.load();
    
    keyboardListener.addListener((_e, down) => {
        // Проверяем наличие настроек горячих клавиш
        if (!settings.hotkey) return;
        
        const { key, modifiers } = settings.hotkey;
        const isModifierPressed = modifiers.some(mod => {
            // Проверяем наличие модификатора в объекте down
            return Object.prototype.hasOwnProperty.call(down, mod) && down[mod as keyof typeof down];
        });
        
        // Проверяем наличие клавиши в объекте down
        const isKeyPressed = Object.prototype.hasOwnProperty.call(down, key) && down[key as keyof typeof down];
        
        if (isModifierPressed && isKeyPressed) {
            handleHotkey();
        }
    });
}

// Очистка при выходе
app.on('before-quit', () => {
    isQuitting = true;
    if (tray) {
        tray.destroy();
    }
    if (keyboardListener) {
        keyboardListener.kill();
    }
});

// Инициализация сервиса распознавания речи на основе настроек
async function initializeSpeechService() {
    const settings = await settingsService.load();
    console.log('Загруженные настройки:', settings);
    
    if (!settings.provider || !settings.apiKey) {
        throw new Error('Не настроен провайдер распознавания речи или API ключ');
    }

    if (settings.provider === 'vk') {
        speechService = new VKCloudSpeechService(settings.apiKey);
    } else if (settings.provider === 'yandex') {
        speechService = new YandexSpeechService(settings.apiKey);
    } else {
        throw new Error('Неизвестный провайдер распознавания речи');
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 140,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        frame: false,
        transparent: true,
        focusable: true,
        skipTaskbar: false,
        title: 'VoiceScribe',
        resizable: false,
        maximizable: false,
        minimizable: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '..', '..', 'assets', 'logo.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    // Сохраняем начальные размеры
    windowBounds = mainWindow.getBounds();

    // Закомментируем открытие DevTools для production
    // mainWindow.webContents.openDevTools();

    // Обработка закрытия окна
    mainWindow.on('close', function(event) {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Обработка восстановления окна
    mainWindow.on('restore', () => {
        if (mainWindow) {
            // Восстанавливаем сохраненные размеры
            mainWindow.setBounds(windowBounds);
        }
    });

    // Обработка показа окна
    mainWindow.on('show', () => {
        if (mainWindow) {
            // Восстанавливаем сохраненные размеры при показе
            mainWindow.setBounds(windowBounds);
        }
    });
}

// Обработка хоткея
async function handleHotkey() {
    if (!mainWindow) return;

    mainWindow.setAlwaysOnTop(true);

    mainWindow.minimize();
    mainWindow.restore();

    mainWindow.show();
    mainWindow.focus();

    mainWindow.setAlwaysOnTop(false);

    // Переключаем состояние записи
    if (!isRecording) {
        mainWindow.webContents.send('hotkey-start-recording');
    } else {
        mainWindow.webContents.send('hotkey-stop-recording');
    }
}

// Добавляем обработчики настроек
ipcMain.handle('get-settings', async () => {
    const settings = await settingsService.load();
    return {
        provider: settings.provider || 'yandex',
        apiKey: settings.apiKey || '',
        selectedDevice: settings.selectedDevice || '',
        hotkey: settings.hotkey || {
            key: 'R',
            modifiers: ['LEFT ALT']
        }
    };
});

ipcMain.handle('save-settings', async (event, settings) => {
    console.log('Сохранение настроек:', settings);
    
    if (!settings.provider) {
        throw new Error('Не выбран провайдер распознавания речи');
    }
    if (!settings.apiKey) {
        throw new Error('Не указан API ключ');
    }

    // Сохраняем настройки
    await settingsService.save({
        provider: settings.provider,
        apiKey: settings.apiKey,
        selectedDevice: settings.selectedDevice,
        hotkey: settings.hotkey
    });

    // Переинициализируем сервис распознавания речи
    await initializeSpeechService();
    
    // Перенастраиваем хоткеи
    await setupGlobalHotkeys();
    
    return true;
});

ipcMain.handle('get-audio-devices', async () => {
    try {
        console.log('Получение списка устройств...');
        const devices = await audioRecorder.listAudioDevices();
        console.log('Найдены устройства:', devices);
        return devices;
    } catch (error: any) {
        console.error('Ошибка при получении списка устройств:', error);
        throw new Error(`Ошибка получения списка устройств: ${error.message}`);
    }
});

// Создание иконки в трее
function createTray() {
    tray = new Tray(path.join(__dirname, '..', '..', 'assets', 'logo.png'));
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Открыть',
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            }
        },
        {
            label: isRecording ? 'Остановить запись' : 'Начать запись',
            click: () => {
                if (isRecording) {
                    mainWindow?.webContents.send('hotkey-stop-recording');
                } else {
                    mainWindow?.webContents.send('hotkey-start-recording');
                }
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Выход',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('VoiceScribe');

    // Обработка клика по иконке в трее
    tray.on('click', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
}

// Создание окна настроек
function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 400,
        height: 520,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        parent: mainWindow || undefined,
        modal: true,
        frame: false,
        transparent: true,
        resizable: false,
        maximizable: false,
        minimizable: false
    });

    settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

    // settingsWindow.webContents.openDevTools();

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// Обработчики для окна настроек
ipcMain.handle('open-settings', () => {
    createSettingsWindow();
});

ipcMain.handle('close-settings-window', () => {
    settingsWindow?.close();
    settingsWindow = null;
});

// Инициализация приложения
app.whenReady().then(async () => {
    audioRecorder = new AudioRecorderService();
    createWindow();
    await setupGlobalHotkeys();
    await initializeSpeechService();
    createTray();

    app.on('activate', function () {
        if (mainWindow === null) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Обработчики для записи с обновлением меню трея
ipcMain.handle('start-recording', async (event, deviceName?: string) => {
    try {
        console.log('Запрошено устройство:', deviceName);
        
        // Если устройство не указано, получаем список и берем первое
        if (!deviceName) {
            const devices = await audioRecorder.listAudioDevices();
            if (devices.length > 0) {
                deviceName = devices[0].name;
                console.log('Автоматически выбрано первое устройство:', deviceName);
            } else {
                throw new Error('Нет доступных устройств записи');
            }
        }

        console.log('Начало записи с устройства:', deviceName);
        audioRecorder.setAudioDevice(deviceName);
        const recordingFile = await audioRecorder.startRecording();
        isRecording = true;
        
        // Обновляем меню трея
        if (tray) {
            const contextMenu = Menu.buildFromTemplate([
                {
                    label: 'Открыть',
                    click: () => {
                        mainWindow?.show();
                        mainWindow?.focus();
                    }
                },
                {
                    label: 'Остановить запись',
                    click: () => {
                        mainWindow?.webContents.send('hotkey-stop-recording');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Выход',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]);
            tray.setContextMenu(contextMenu);
        }
        
        console.log('Запись начата, файл:', recordingFile);
        return recordingFile;
    } catch (error: any) {
        console.error('Ошибка при начале записи:', error);
        throw error;
    }
});

ipcMain.handle('stop-recording', async () => {
    try {
        console.log('Остановка записи...');
        await audioRecorder.stopRecording();
        isRecording = false;
        
        // Обновляем меню трея
        if (tray) {
            const contextMenu = Menu.buildFromTemplate([
                {
                    label: 'Открыть',
                    click: () => {
                        mainWindow?.show();
                        mainWindow?.focus();
                    }
                },
                {
                    label: 'Начать запись',
                    click: () => {
                        mainWindow?.webContents.send('hotkey-start-recording');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Выход',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]);
            tray.setContextMenu(contextMenu);
        }
        
        console.log('Запись остановлена');
        return true;
    } catch (error: any) {
        console.error('Ошибка при остановке записи:', error);
        throw new Error(`Ошибка остановки записи: ${error.message}`);
    }
});

// Добавляем обработчик для clipboard
ipcMain.handle('clipboard-write', async (event, text) => {
    clipboard.writeText(text);
});

ipcMain.handle('recognize-speech', async (event, audioFile: string) => {
    try {
        console.log('Распознавание речи из файла:', audioFile);
        const text = await speechService.speechToText(audioFile);
        console.log('Распознанный текст:', text);
        
        // Удаляем файл после успешного распознавания
        await audioRecorder.deleteFile(audioFile);
        
        return text;
    } catch (error: any) {
        console.error('Ошибка при распознавании речи:', error);
        throw new Error(`Ошибка распознавания речи: ${error.message}`);
    }
});

// Обработчики управления окном
ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
        windowBounds = mainWindow.getBounds();
        mainWindow.hide();
    }
});

ipcMain.handle('close-window', () => {
    if (!isQuitting) {
        if (mainWindow) {
            windowBounds = mainWindow.getBounds();
            mainWindow.hide();
        }
    } else {
        mainWindow?.close();
    }
}); 