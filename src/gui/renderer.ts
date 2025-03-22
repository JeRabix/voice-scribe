const { ipcRenderer, clipboard } = window.electron;

const recordButton = document.getElementById('recordButton') as HTMLButtonElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const resultElement = document.getElementById('result') as HTMLDivElement;

let isRecording = false;
let currentRecordingFile: string | null = null;

// Обработка нажатия кнопки записи
async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        await stopRecording();
    }
}

// Начало записи
async function startRecording() {
    try {
        const settings = await ipcRenderer.invoke('get-settings');
        currentRecordingFile = await ipcRenderer.invoke('start-recording', settings.selectedDevice);
        isRecording = true;
        
        // Меняем иконку на квадрат (стоп)
        recordButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6h12v12H6z" fill="currentColor"/>
            </svg>
        `;
        recordButton.classList.add('recording');
        statusElement.textContent = 'Идет запись...';
    } catch (error: any) {
        statusElement.textContent = `Ошибка: ${error.message}`;
    }
}

// Остановка записи
async function stopRecording() {
    try {
        await ipcRenderer.invoke('stop-recording');
        isRecording = false;
        
        // Возвращаем иконку микрофона
        recordButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor"/>
                <path d="M17.91 11C17.91 11 17.91 11 17.91 11C17.63 14.49 14.68 17 11.17 17C7.66 17 4.71 14.49 4.43 11C4.43 11 4.43 11 4.43 11H3C3.02 14.81 5.91 18 9.66 18.13V22H12.66V18.13C16.41 18 19.3 14.81 19.32 11H17.91Z" fill="currentColor"/>
            </svg>
        `;
        recordButton.classList.remove('recording');
        statusElement.textContent = 'Обработка записи...';

        if (currentRecordingFile) {
            const recognizedText = await ipcRenderer.invoke('recognize-speech', currentRecordingFile);
            resultElement.textContent = recognizedText;
            statusElement.textContent = 'Запись обработана и скопирована в буфер обмена';
            
            // Копируем текст в буфер обмена
            clipboard.writeText(recognizedText);
        }
    } catch (error: any) {
        statusElement.textContent = `Ошибка: ${error.message}`;
    }
}

// Обработчики событий от хоткеев
ipcRenderer.on('hotkey-start-recording', async () => {
    console.log('Получено событие hotkey-start-recording');
    console.log('Текущее состояние записи:', isRecording);
    
    if (!isRecording) {
        console.log('Начинаем запись...');
        await startRecording();
    } else {
        console.log('Запись уже идет, пропускаем...');
    }
});

ipcRenderer.on('hotkey-stop-recording', async () => {
    if (isRecording) {
        await stopRecording();
    }
});

// Обработчики для кнопок управления окном
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');

if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
        window.electron.minimizeWindow();
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        window.electron.closeWindow();
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    recordButton.addEventListener('click', toggleRecording);

    // Обработчик кнопки настроек
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.electron.openSettings();
        });
    }
}); 