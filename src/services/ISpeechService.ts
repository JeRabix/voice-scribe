export interface ISpeechService {
    /**
     * Преобразует речь в текст
     * @param audioData Аудио данные в формате Buffer или путь к файлу
     * @returns Распознанный текст
     */
    speechToText(audioData: Buffer | string): Promise<string>;

    /**
     * Преобразует текст в речь
     * @param text Текст для синтеза речи
     * @returns Аудио данные в формате Buffer
     */
    textToSpeech(text: string): Promise<Buffer>;
} 