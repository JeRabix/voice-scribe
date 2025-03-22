import { ISpeechService } from './ISpeechService';
import axios from 'axios';
import * as fs from 'fs/promises';

interface VKCloudSpeechResponse {
    qid: string;
    result: {
        texts: Array<{
            text: string;
            confidence: number;
            punctuated_text: string;
        }>;
        phrase_id: string;
    };
}

export class VKCloudSpeechService implements ISpeechService {
    private readonly baseUrlStt = 'https://voice.mcs.mail.ru/asr';
    private readonly baseUrlTts = 'https://voice.mcs.mail.ru/tts';

    constructor(private readonly token: string) {}

    async speechToText(audioData: Buffer | string): Promise<string> {
        console.log('VKCloudSpeechService: Начало распознавания речи');
        console.log('VKCloudSpeechService: Тип входных данных:', typeof audioData);
        console.log('VKCloudSpeechService: Размер входных данных:', typeof audioData === 'string' ? 'файл' : `${audioData.length} байт`);
        
        const data = typeof audioData === 'string' 
            ? await fs.readFile(audioData)
            : audioData;

        console.log('VKCloudSpeechService: Отправка запроса к API');
        try {
            const response = await axios.post<VKCloudSpeechResponse>(
                this.baseUrlStt,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'audio/ogg; codecs=opus'
                    }
                }
            );

            console.log('VKCloudSpeechService: Получен ответ от API:', JSON.stringify(response.data, null, 2));
            
            if (response.data.result.texts && response.data.result.texts.length > 0) {
                // Возвращаем текст с пунктуацией, если он есть
                const recognizedText = response.data.result.texts[0].punctuated_text || 
                                     response.data.result.texts[0].text;
                console.log('VKCloudSpeechService: Длина распознанного текста:', recognizedText.length);
                return recognizedText;
            }
            
            return '';
        } catch (error: any) {
            console.error('VKCloudSpeechService: Ошибка при распознавании:', error.response?.data || error.message);
            throw new Error(`Ошибка распознавания речи: ${error.response?.data?.error || error.message}`);
        }
    }

    async textToSpeech(text: string): Promise<Buffer> {
        // На данный момент реализация синтеза речи не требуется
        throw new Error('Метод textToSpeech пока не реализован для VK Cloud Voice');
    }
} 