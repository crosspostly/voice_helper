import { GoogleGenAI } from '@google/genai';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateText(prompt: string, history: any[] = []): Promise<string> {
    try {
      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: prompt,
        },
        history: history,
      });

      const response = await chat.sendMessage({ message: 'Hello' });
      return response.text || '';
    } catch (error) {
      console.error('GeminiService error:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceName: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName 
              } 
            },
          },
        },
      });

      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }
}