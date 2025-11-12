import { renderHook, act } from '@testing-library/react';
import { useLogger } from '../hooks/useLogger';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

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

describe('useLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with empty logs', () => {
    const { result } = renderHook(() => useLogger());
    
    expect(result.current.logs).toEqual([]);
    expect(result.current.logCount).toBe(0);
  });

  it('should add INFO level log by default', () => {
    const { result } = renderHook(() => useLogger());
    
    act(() => {
      result.current.log('Test message');
    });
    
    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0]).toMatchObject({
      message: 'Test message',
      level: 'INFO',
    });
    expect(result.current.logs[0].timestamp).toBeDefined();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('[Test message')
    );
  });

  it('should handle different log levels', () => {
    const { result } = renderHook(() => useLogger());
    
    act(() => {
      result.current.log('Debug message', 'DEBUG');
      result.current.log('Info message', 'INFO');
      result.current.log('Warning message', 'WARN');
      result.current.log('Error message', 'ERROR');
    });
    
    expect(result.current.logs).toHaveLength(4);
    expect(result.current.logs[0].level).toBe('DEBUG');
    expect(result.current.logs[1].level).toBe('INFO');
    expect(result.current.logs[2].level).toBe('WARN');
    expect(result.current.logs[3].level).toBe('ERROR');
    
    expect(mockConsoleDebug).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalled();
    expect(mockConsoleWarn).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should filter logs by minimum level', () => {
    const { result } = renderHook(() => useLogger({ minLevel: 'WARN' }));
    
    act(() => {
      result.current.log('Debug message', 'DEBUG');
      result.current.log('Info message', 'INFO');
      result.current.log('Warning message', 'WARN');
      result.current.log('Error message', 'ERROR');
    });
    
    expect(result.current.logs).toHaveLength(2); // Only WARN and ERROR
    expect(result.current.logs[0].level).toBe('WARN');
    expect(result.current.logs[1].level).toBe('ERROR');
  });

  it('should limit log entries to maxLogEntries', () => {
    const { result } = renderHook(() => useLogger({ maxLogEntries: 3 }));
    
    act(() => {
      result.current.log('Message 1', 'INFO');
      result.current.log('Message 2', 'INFO');
      result.current.log('Message 3', 'INFO');
      result.current.log('Message 4', 'INFO');
      result.current.log('Message 5', 'INFO');
    });
    
    expect(result.current.logs).toHaveLength(3);
    expect(result.current.logs[0].message).toBe('Message 3');
    expect(result.current.logs[2].message).toBe('Message 5');
  });

  it('should clear logs', () => {
    const { result } = renderHook(() => useLogger());
    
    act(() => {
      result.current.log('Test message', 'INFO');
      result.current.clearLogs();
    });
    
    expect(result.current.logs).toEqual([]);
    expect(result.current.logCount).toBe(0);
  });

  it('should get filtered logs', () => {
    const { result } = renderHook(() => useLogger());
    
    act(() => {
      result.current.log('Debug message', 'DEBUG');
      result.current.log('Info message', 'INFO');
      result.current.log('Warning message', 'WARN');
      result.current.log('Error message', 'ERROR');
    });
    
    const warnAndAbove = result.current.getFilteredLogs('WARN');
    expect(warnAndAbove).toHaveLength(2);
    expect(warnAndAbove[0].level).toBe('WARN');
    expect(warnAndAbove[1].level).toBe('ERROR');
    
    const errorOnly = result.current.getFilteredLogs('ERROR');
    expect(errorOnly).toHaveLength(1);
    expect(errorOnly[0].level).toBe('ERROR');
  });

  it('should persist logs to localStorage when enabled', () => {
    const { result } = renderHook(() => useLogger({ enablePersistence: true }));
    
    act(() => {
      result.current.log('Test message', 'INFO');
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'app-logs',
      expect.stringContaining('Test message')
    );
  });

  it('should not persist logs when disabled', () => {
    const { result } = renderHook(() => useLogger({ enablePersistence: false }));
    
    act(() => {
      result.current.log('Test message', 'INFO');
    });
    
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});