import { contextBridge, ipcRenderer } from 'electron';

// Объявляем типы для нашего API
declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                invoke(channel: string, ...args: any[]): Promise<any>;
                on(channel: string, func: (...args: any[]) => void): void;
            };
            clipboard: {
                writeText(text: string): void;
            };
            minimizeWindow: () => Promise<void>;
            closeWindow: () => Promise<void>;
            openSettings: () => Promise<void>;
            closeSettingsWindow: () => Promise<void>;
        };
    }
}

// Экспортируем API в renderer процесс
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, func: (...args: any[]) => void) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    clipboard: {
        writeText: (text: string) => {
            ipcRenderer.invoke('clipboard-write', text);
        }
    },
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    openSettings: () => ipcRenderer.invoke('open-settings'),
    closeSettingsWindow: () => ipcRenderer.invoke('close-settings-window')
}); 