# План развития приложения

## UI/UX улучшения
- [ ] Визуализация уровня громкости при записи
- [ ] Поддержка темной/светлой темы
- [ ] Индикатор прогресса распознавания
- [ ] История распознанных текстов
  - [ ] Сохранение истории в локальной БД
  - [ ] Возможность копирования старых записей
  - [ ] Поиск по истории
- [x] Улучшенный интерфейс выбора микрофона
- [x] Всплывающие уведомления о статусе операций

## Функции распознавания речи
- [x] Базовое распознавание речи через Yandex Speech Kit
- [x] Поддержка VK Cloud Voice
- [ ] Потоковое распознавание в реальном времени
- [ ] Автоматическое определение языка
- [ ] Поддержка других сервисов распознавания речи
  - [ ] Google Speech-to-Text
  - [ ] Microsoft Azure Speech
  - [ ] Amazon Transcribe
- [ ] Автоматическая пунктуация и форматирование текста
- [ ] Пользовательский словарь для специфических терминов

## Работа с аудио
- [ ] Предварительное прослушивание микрофона
- [ ] Настройка чувствительности микрофона
- [ ] Автоматическая регулировка громкости
- [ ] Фильтрация шумов при записи
- [ ] Распознавание аудио из файла
  - [ ] Поддержка различных форматов (MP3, WAV, OGG)
  - [ ] Drag & Drop файлов
- [x] Настройка качества записи
  - [x] Выбор битрейта
  - [x] Выбор частоты дискретизации

## Оптимизация и надежность
- [ ] Автосохранение записей
- [ ] Очередь распознавания для длинных записей
- [ ] Кэширование частых фраз
- [ ] Оптимизация использования памяти
- [x] Обработка ошибок и автоматическое восстановление
- [x] Логирование для отладки
- [ ] Автоматическое обновление приложения

## Дополнительные функции
- [ ] Экспорт текста в различные форматы
  - [ ] TXT
  - [ ] DOC/DOCX
  - [ ] PDF
  - [ ] RTF
- [ ] Интеграция с текстовыми редакторами
- [x] Горячие клавиши для всех основных функций
- [ ] Автозапуск при старте системы
- [ ] Настройка формата вывода текста
- [ ] Статистика использования
  - [ ] Время записи
  - [ ] Количество распознанных слов
  - [ ] Точность распознавания

## Безопасность
- [x] Шифрование сохраненных записей
- [x] Безопасное хранение API ключей
- [ ] Защита от несанкционированного доступа
- [ ] Политика конфиденциальности

## Документация
- [ ] Руководство пользователя
- [ ] Документация по API
- [x] Инструкции по установке
- [x] Описание настроек
- [ ] Примеры использования

## Тестирование
- [ ] Модульные тесты
- [ ] Интеграционные тесты
- [ ] Тесты производительности
- [ ] Тесты безопасности
- [ ] Автоматизированное тестирование UI

## Локализация
- [x] Поддержка нескольких языков интерфейса
  - [ ] Английский
  - [x] Русский
  - [ ] Другие языки
- [ ] Автоматическое определение языка системы

## Инфраструктура
- [ ] CI/CD пайплайн
- [ ] Автоматическая сборка для разных платформ
- [ ] Система отчетов об ошибках
- [ ] Аналитика использования
- [ ] Мониторинг производительности

---
**Обозначения:**
- [x] Выполнено
- [ ] В планах 