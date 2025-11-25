// Тест для функции transformUrlForProxy
import { transformUrlForProxy } from '../proxyConfig';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('transformUrlForProxy', () => {
  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    localStorageMock.getItem.mockReturnValue('true'); // Включаем прокси
  });

  it('should fix double slashes after workers.dev domain', () => {
    const urlWithDoubleSlash = 'wss://generativelanguage.googleapis.com//ws/something';
    const result = transformUrlForProxy(urlWithDoubleSlash);
    
    // Должен заменить домен и убрать двойной слэш
    expect(result).toBe('wss://subbot.sheepoff.workers.dev/ws/something');
  });

  it('should handle URLs without double slashes correctly', () => {
    const normalUrl = 'wss://generativelanguage.googleapis.com/ws/something';
    const result = transformUrlForProxy(normalUrl);
    
    expect(result).toBe('wss://subbot.sheepoff.workers.dev/ws/something');
  });

  it('should not modify URLs that are not Google APIs', () => {
    const otherUrl = 'wss://example.com/ws/something';
    const result = transformUrlForProxy(otherUrl);
    
    expect(result).toBe(otherUrl);
  });

  it('should return original URL when proxy is disabled', () => {
    localStorageMock.getItem.mockReturnValue('false'); // Выключаем прокси
    const url = 'wss://generativelanguage.googleapis.com/ws/something';
    const result = transformUrlForProxy(url);
    
    expect(result).toBe(url);
  });

  it('should fix multiple double slashes in URL', () => {
    const urlWithMultipleSlashes = 'wss://generativelanguage.googleapis.com//ws//path//to//resource';
    const result = transformUrlForProxy(urlWithMultipleSlashes);
    
    expect(result).toBe('wss://subbot.sheepoff.workers.dev/ws/path/to/resource');
  });

  it('should handle real Gemini Live API URL format', () => {
    // Это типичный URL который может генерировать @google/genai библиотека
    const realGeminiUrl = 'wss://generativelanguage.googleapis.com//ws/google.generativelanguage.v1alpha.LiveConnectModel?alt=proto';
    const result = transformUrlForProxy(realGeminiUrl);
    
    expect(result).toBe('wss://subbot.sheepoff.workers.dev/ws/google.generativelanguage.v1alpha.LiveConnectModel?alt=proto');
  });

  it('should preserve query parameters correctly', () => {
    const urlWithQuery = 'wss://generativelanguage.googleapis.com//ws/something?param=value&other=test';
    const result = transformUrlForProxy(urlWithQuery);
    
    expect(result).toBe('wss://subbot.sheepoff.workers.dev/ws/something?param=value&other=test');
  });
});
