import { renderHook, act } from '@testing-library/react';
import { useLanguageManager } from '../hooks/useLanguageManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  writable: true,
});

// Mock console.warn
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

describe('useLanguageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with browser locale', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    expect(result.current.locale).toBe('en');
  });

  it('should initialize with Russian locale for Russian browser', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'ru-RU',
    });
    
    const { result } = renderHook(() => useLanguageManager());
    
    expect(result.current.locale).toBe('ru');
  });

  it('should load locale from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('ru');
    
    const { result } = renderHook(() => useLanguageManager());
    
    expect(result.current.locale).toBe('ru');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('language');
  });

  it('should set locale', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.setLocale('ru');
    });
    
    expect(result.current.locale).toBe('ru');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('language', 'ru');
  });

  it('should reject invalid locale', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.setLocale('fr' as any);
    });
    
    expect(result.current.locale).toBe('en'); // Should remain unchanged
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should return correct strings for English', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.setLocale('en');
    });
    
    expect(result.current.strings.title).toBe('Live Voice Assistant');
    expect(result.current.strings.sendMessage).toBe('Send Message');
  });

  it('should return correct strings for Russian', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.setLocale('ru');
    });
    
    expect(result.current.strings.title).toBe('Голосовой Ассистент');
    expect(result.current.strings.sendMessage).toBe('Отправить Сообщение');
  });

  it('should translate keys correctly', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    expect(result.current.t('title')).toBe('Live Voice Assistant');
    expect(result.current.t('sendMessage')).toBe('Send Message');
  });

  it('should use fallback for missing translation', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    // Use custom fallback
    expect(result.current.t('nonexistent_key', 'Fallback')).toBe('Fallback');
    
    // Use key as fallback
    expect(result.current.t('nonexistent_key')).toBe('nonexistent_key');
  });

  it('should fallback to English for missing Russian translation', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.setLocale('ru');
    });
    
    // This key exists in Russian
    expect(result.current.t('title')).toBe('Голосовой Ассистент');
    
    // This key doesn't exist in Russian but exists in English
    expect(result.current.t('nonexistent_ru_key')).toBe('nonexistent_ru_key');
  });

  it('should log warning for missing translation in dev mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const { result } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.t('completely_missing_key');
    });
    
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Missing translation for key "completely_missing_key" in all locales'
    );
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should return available languages', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    expect(result.current.availableLanguages).toEqual(['en', 'ru']);
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage error');
    });
    
    const { result } = renderHook(() => useLanguageManager());
    
    // Should not throw
    act(() => {
      result.current.setLocale('ru');
    });
    
    // Locale should still change in state
    expect(result.current.locale).toBe('ru');
  });

  it('should persist locale changes', () => {
    const { result, rerender } = renderHook(() => useLanguageManager());
    
    act(() => {
      result.current.setLocale('ru');
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('language', 'ru');
    
    // Simulate component remount - should load from localStorage
    localStorageMock.getItem.mockReturnValue('ru');
    
    rerender();
    
    expect(result.current.locale).toBe('ru');
  });

  it('should handle complex translation scenarios', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    // Test with various scenarios
    expect(result.current.t('status_IDLE')).toBe('Ready');
    
    act(() => {
      result.current.setLocale('ru');
    });
    
    expect(result.current.t('status_IDLE')).toBe('Готов');
    
    // Test with fallback
    expect(result.current.t('missing_in_ru', 'English fallback')).toBe('English fallback');
  });

  it('should handle edge cases', () => {
    const { result } = renderHook(() => useLanguageManager());
    
    // Empty key
    expect(result.current.t('', 'Empty fallback')).toBe('Empty fallback');
    
    // Key with special characters
    expect(result.current.t('key.with.dots', 'Dot fallback')).toBe('Dot fallback');
    
    // Very long key
    const longKey = 'a'.repeat(1000);
    expect(result.current.t(longKey, 'Long fallback')).toBe('Long fallback');
  });
});