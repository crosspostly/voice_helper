import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from '../hooks/usePersistentState';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
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

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default value when no stored value exists', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'default-value'));
    
    expect(result.current[0]).toBe('default-value');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
  });

  it('should initialize with stored value when it exists', () => {
    localStorageMock.setItem('test-key', JSON.stringify('stored-value'));
    
    const { result } = renderHook(() => usePersistentState('test-key', 'default-value'));
    
    expect(result.current[0]).toBe('stored-value');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
  });

  it('should update state and localStorage when setter is called', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'default-value'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(result.current[0]).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
  });

  it('should handle complex objects', () => {
    const defaultValue = { name: 'John', age: 30 };
    const newValue = { name: 'Jane', age: 25 };
    
    const { result } = renderHook(() => usePersistentState('test-key', defaultValue));
    
    expect(result.current[0]).toEqual(defaultValue);
    
    act(() => {
      result.current[1](newValue);
    });
    
    expect(result.current[0]).toEqual(newValue);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(newValue));
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage error');
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { result } = renderHook(() => usePersistentState('test-key', 'default-value'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Error setting localStorage key "test-key":', expect.any(Error));
    expect(result.current[0]).toBe('new-value'); // State should still update
    
    consoleSpy.mockRestore();
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      if (key === 'test-key') {
        return 'invalid-json';
      }
      return null;
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { result } = renderHook(() => usePersistentState('test-key', 'default-value'));
    
    expect(result.current[0]).toBe('default-value');
    expect(consoleSpy).toHaveBeenCalledWith('Error reading localStorage key "test-key":', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});