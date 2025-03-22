document.addEventListener('DOMContentLoaded', async () => {
    // Получаем элементы формы
    const deviceSelect = document.getElementById('deviceSelect');
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const hotkeyModSelect = document.getElementById('hotkeyMod');
    const hotkeyKeyInput = document.getElementById('hotkeyKey');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.getElementById('closeBtn');

    let devices = [];

    // Загружаем список устройств
    try {
        devices = await window.electron.ipcRenderer.invoke('get-audio-devices');
        console.log('Загруженные устройства:', devices);
        
        deviceSelect.innerHTML = '<option value="">Выберите устройство записи</option>';
        devices.forEach((device) => {
            const option = document.createElement('option');
            option.value = device.name;
            option.textContent = device.description || device.name;
            deviceSelect.appendChild(option);
        });
        
        console.log('Текущее значение deviceSelect:', deviceSelect.value);
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
    }

    // Загружаем текущие настройки
    try {
        const settings = await window.electron.ipcRenderer.invoke('get-settings');
        console.log('Загруженные настройки:', settings);
        
        providerSelect.value = settings.provider || 'yandex';
        apiKeyInput.value = settings.apiKey || '';
        
        // Если устройство не выбрано в настройках, выбираем первое доступное
        if (!settings.selectedDevice && devices.length > 0) {
            deviceSelect.value = devices[0].name;
            console.log('Автоматически выбрано первое устройство:', devices[0].name);
        } else {
            deviceSelect.value = settings.selectedDevice || '';
        }
        
        if (settings.hotkey) {
            hotkeyModSelect.value = settings.hotkey.modifiers[0] || 'LEFT ALT';
            hotkeyKeyInput.value = settings.hotkey.key || 'R';
        }
        
        console.log('После загрузки настроек deviceSelect:', deviceSelect.value);
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        // Если произошла ошибка загрузки настроек, все равно выбираем первое устройство
        if (devices.length > 0) {
            deviceSelect.value = devices[0].name;
            console.log('Автоматически выбрано первое устройство после ошибки:', devices[0].name);
        }
    }

    // Обработка ввода горячей клавиши
    hotkeyKeyInput.addEventListener('keydown', (event) => {
        event.preventDefault();
        
        // Игнорируем клавиши-модификаторы
        if (['Alt', 'Control', 'Shift'].includes(event.key)) {
            return;
        }
        
        hotkeyKeyInput.value = event.key.toUpperCase();
    });

    // Обработчик сохранения настроек
    saveBtn.addEventListener('click', async () => {
        try {
            console.log('Значения перед сохранением:');
            console.log('- provider:', providerSelect.value);
            console.log('- apiKey:', apiKeyInput.value ? '***' : 'пусто');
            console.log('- device:', deviceSelect.value);
            console.log('- hotkey:', hotkeyKeyInput.value);
            console.log('- hotkeyMod:', hotkeyModSelect.value);

            // Валидация
            if (!providerSelect.value) {
                alert('Пожалуйста, выберите провайдер распознавания речи');
                return;
            }
            if (!apiKeyInput.value) {
                alert('Пожалуйста, введите API ключ');
                return;
            }
            if (!hotkeyKeyInput.value) {
                alert('Пожалуйста, укажите горячую клавишу');
                return;
            }
            if (!deviceSelect.value) {
                // Если устройство не выбрано, пробуем выбрать первое доступное
                if (devices.length > 0) {
                    deviceSelect.value = devices[0].name;
                    console.log('Автоматически выбрано первое устройство при сохранении:', devices[0].name);
                } else {
                    alert('Пожалуйста, выберите устройство записи');
                    return;
                }
            }

            const settings = {
                provider: providerSelect.value,
                apiKey: apiKeyInput.value,
                selectedDevice: deviceSelect.value,
                hotkey: {
                    key: hotkeyKeyInput.value,
                    modifiers: [hotkeyModSelect.value]
                }
            };

            console.log('Отправляемые настройки:', {...settings, apiKey: '***'});
            await window.electron.ipcRenderer.invoke('save-settings', settings);
            window.electron.closeSettingsWindow();
        } catch (error) {
            console.error('Ошибка при сохранении:', error);
            alert('Ошибка при сохранении настроек: ' + error.message);
        }
    });

    // Обработчики закрытия окна
    closeBtn.addEventListener('click', () => {
        console.log('Closing settings window...');
        window.electron.closeSettingsWindow();
    });

    cancelBtn.addEventListener('click', () => {
        console.log('Cancelling settings...');
        window.electron.closeSettingsWindow();
    });
});