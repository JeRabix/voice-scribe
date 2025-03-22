import { ISpeechService } from './ISpeechService';
import axios from 'axios';
import * as fs from 'fs/promises';

interface YandexSpeechResponse {
    result: string;
}

export class YandexSpeechService implements ISpeechService {
    private readonly baseUrlStt = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';
    private readonly baseUrlTts = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

    constructor(private readonly apiKey: string) {}

    async speechToText(audioData: Buffer | string): Promise<string> {
        console.log('YandexSpeechService: Начало распознавания речи');
        console.log('YandexSpeechService: Тип входных данных:', typeof audioData);
        
        const data = typeof audioData === 'string' 
            ? await fs.readFile(audioData)
            : audioData;

        console.log('YandexSpeechService: Отправка запроса к API');
        const response = await axios.post<YandexSpeechResponse>(
            `${this.baseUrlStt}?lang=ru-RU&format=oggopus`, 
            data,
            {
                headers: {
                    'Authorization': `Api-Key ${this.apiKey}`,
                    'Content-Type': 'audio/ogg'
                }
            }
        );

        console.log('YandexSpeechService: Получен ответ от API:', JSON.stringify(response.data, null, 2));
        return response.data.result;
    }

    async textToSpeech(text: string): Promise<Buffer> {
        const formData = new URLSearchParams();
        formData.append('text', text);
        formData.append('voice', 'marina');
        formData.append('emotion', 'whisper');

        const response = await axios.post<ArrayBuffer>(this.baseUrlTts, formData, {
            headers: {
                'Authorization': `Api-Key ${this.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            responseType: 'arraybuffer'
        });

        return Buffer.from(response.data);
    }
} 