import { GoogleGenAI, Chat, Modality, Content } from '@google/genai';

export class GeminiService {
  private ai: GoogleGenAI;
  private chatRef: Chat | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Initialize or get a chat session
   */
  getChat(history: Content[] = []): Chat {
    if (!this.chatRef) {
      this.chatRef = this.ai.chats.create({
        history,
        generationConfig: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
        },
      });
    }
    return this.chatRef;
  }

  /**
   * Reset the chat session
   */
  resetChat(): void {
    this.chatRef = null;
  }

  /**
   * Generate speech from text using TTS
   */
  async generateSpeech(text: string, voice: string = 'Zephyr'): Promise<string> {
    // This would integrate with Google's TTS service
    // For now, this is a placeholder implementation
    throw new Error('TTS generation not implemented - integrate with Google TTS service');
  }

  /**
   * Create a new GeminiService instance
   */
  static create(apiKey: string): GeminiService {
    if (!apiKey) {
      throw new Error('API key is required for GeminiService');
    }
    return new GeminiService(apiKey);
  }

  /**
   * Validate API key
   */
  static validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && apiKey.trim().length > 0;
  }
}