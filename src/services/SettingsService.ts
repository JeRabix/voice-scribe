import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';

export interface AppSettings {
    provider: 'yandex' | 'vk';
    apiKey: string;
    selectedDevice?: string;
    hotkey?: {
        key: string;
        modifiers: string[];
    };
}

export class SettingsService {
    private settingsPath: string;
    private settings: AppSettings;

    constructor() {
        // Путь к файлу настроек в папке пользователя
        this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
        // Инициализируем настройки по умолчанию
        this.settings = {
            provider: 'yandex',
            apiKey: '',  // Пустой ключ по умолчанию
            hotkey: {
                key: 'R',
                modifiers: ['LEFT ALT', 'RIGHT ALT']
            }
        };
    }

    async load(): Promise<AppSettings> {
        try {
            const data = await fs.readFile(this.settingsPath, 'utf-8');
            this.settings = JSON.parse(data);
        } catch (error) {
            // Если файл не существует или поврежден, используем настройки по умолчанию
            console.log('Используются настройки по умолчанию');
        }
        return this.settings;
    }

    async save(settings: AppSettings): Promise<void> {
        try {
            // Проверяем наличие необходимых ключей
            if (settings.provider === 'yandex' && !settings.apiKey) {
                throw new Error('Не указан API ключ Яндекс');
            }
            if (settings.provider === 'vk' && !settings.apiKey) {
                throw new Error('Не указан токен VK');
            }
            if (!settings.selectedDevice) {
                throw new Error('Не выбрано устройство записи');
            }

            this.settings = settings;
            await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
        } catch (error: any) {
            throw new Error(`Ошибка сохранения настроек: ${error.message}`);
        }
    }

    getSettings(): AppSettings {
        return this.settings;
    }
} 