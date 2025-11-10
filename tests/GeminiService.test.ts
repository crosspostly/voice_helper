import { GeminiService } from '../src/services/geminiService';

// Mock GoogleGenAI
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    chats: {
      create: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockResolvedValue({
          text: 'Generated response'
        })
      })
    },
    models: {
      generateContent: jest.fn().mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                data: 'base64-audio-data'
              }
            }]
          }
        }]
      })
    }
  }))
}));

describe('GeminiService', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    geminiService = new GeminiService('test-api-key');
    jest.clearAllMocks();
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const result = await geminiService.generateText('Test prompt', []);
      
      expect(result).toBe('Generated response');
    });

    it('should handle errors', async () => {
      const { GoogleGenAI } = require('@google/genai');
      GoogleGenAI.mockImplementationOnce(() => ({
        chats: {
          create: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockRejectedValue(new Error('API Error'))
          })
        }
      }));

      const service = new GeminiService('test-api-key');
      
      await expect(service.generateText('Test prompt')).rejects.toThrow('API Error');
    });
  });

  describe('generateSpeech', () => {
    it('should generate speech successfully', async () => {
      const result = await geminiService.generateSpeech('Hello world', 'Zephyr');
      
      expect(result).toBe('base64-audio-data');
    });

    it('should handle speech generation errors', async () => {
      const { GoogleGenAI } = require('@google/genai');
      GoogleGenAI.mockImplementationOnce(() => ({
        models: {
          generateContent: jest.fn().mockRejectedValue(new Error('TTS Error'))
        }
      }));

      const service = new GeminiService('test-api-key');
      
      await expect(service.generateSpeech('Hello world', 'Zephyr')).rejects.toThrow('TTS Error');
    });
  });
});