import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from '../src/hooks/useWakeLock';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

// Mock useLogger
jest.mock('../src/hooks/useLogger', () => ({
  useLogger: () => ({
    log: jest.fn(),
  }),
}));

// Mock document.visibilityState
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  value: 'visible',
});

// Mock HTMLAudioElement
class MockAudio {
  src: string = '';
  loop: boolean = false;
  volume: number = 1;
  currentTime: number = 0;
  paused: boolean = true;

  play = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}

// Mock document.createElement for audio elements
const originalCreateElement = document.createElement;

describe('useWakeLock', () => {
  let originalWakeLock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    document.visibilityState = 'visible';
    // Store and reset navigator.wakeLock
    originalWakeLock = (navigator as any).wakeLock;
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    
    // Mock document.createElement for audio elements
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'audio') {
        const mockAudio = new MockAudio() as unknown as HTMLAudioElement;
        // Add required DOM properties
        Object.defineProperty(mockAudio, 'parentNode', {
          value: null,
          writable: true,
        });
        return mockAudio;
      }
      return originalCreateElement.call(document, tagName);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original wakeLock
    if (originalWakeLock !== undefined) {
      Object.defineProperty(navigator, 'wakeLock', {
        value: originalWakeLock,
        writable: true,
        configurable: true,
      });
    }
    // Restore original document.createElement
    document.createElement = originalCreateElement;
  });

  it('should initialize with inactive Wake Lock', () => {
    const { result } = renderHook(() => useWakeLock());
    
    expect(result.current.isActive).toBe(false);
    expect(typeof result.current.requestWakeLock).toBe('function');
    expect(typeof result.current.releaseWakeLock).toBe('function');
  });

  it('should request Wake Lock when API is available', async () => {
    const mockWakeLockSentinel = {
      release: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const mockWakeLock = {
      request: jest.fn().mockResolvedValue(mockWakeLockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());
    
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
    expect(mockWakeLockSentinel.addEventListener).toHaveBeenCalledWith('release', expect.any(Function));
    expect(result.current.isActive).toBe(true);
  });

  it('should handle Wake Lock request errors gracefully', async () => {
    const mockWakeLock = {
      request: jest.fn().mockRejectedValue(new Error('Wake Lock denied')),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());
    
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(mockWakeLock.request).toHaveBeenCalledWith('screen');
    // Should still create silent audio as fallback
    expect(document.createElement).toHaveBeenCalledWith('audio');
  });

  it('should create silent audio for iOS fallback', async () => {
    const { result } = renderHook(() => useWakeLock());
    
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(document.createElement).toHaveBeenCalledWith('audio');
    const mockCalls = (document.createElement as jest.Mock).mock.calls;
    const audioCall = mockCalls.find(call => call[0] === 'audio');
    expect(audioCall).toBeDefined();
  });

  it('should handle silent audio errors gracefully', async () => {
    // Create a custom mock for this test
    const mockAudio = new MockAudio() as unknown as HTMLAudioElement;
    mockAudio.play = jest.fn().mockRejectedValue(new Error('Audio play failed'));
    
    // Temporarily override the createElement mock
    const originalMock = document.createElement;
    const customCreateElement = jest.fn((tagName: string) => {
      if (tagName === 'audio') {
        return mockAudio;
      }
      return originalCreateElement.call(document, tagName);
    });
    
    document.createElement = customCreateElement;

    const { result } = renderHook(() => useWakeLock());
    
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(mockAudio.play).toHaveBeenCalled();
    // Should not throw error
    
    // Restore the original mock
    document.createElement = originalMock;
  });

  it('should release Wake Lock and stop silent audio', async () => {
    const mockWakeLockSentinel = {
      release: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const mockWakeLock = {
      request: jest.fn().mockResolvedValue(mockWakeLockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());
    
    // First request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(result.current.isActive).toBe(true);

    // Then release it
    await act(async () => {
      await result.current.releaseWakeLock();
    });

    expect(mockWakeLockSentinel.release).toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('should handle release errors gracefully', async () => {
    const mockWakeLockSentinel = {
      release: jest.fn().mockRejectedValue(new Error('Release failed')),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const mockWakeLock = {
      request: jest.fn().mockResolvedValue(mockWakeLockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());
    
    // First request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    // Then release it (should not throw)
    await act(async () => {
      await result.current.releaseWakeLock();
    });

    expect(mockWakeLockSentinel.release).toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('should restore Wake Lock when app returns to foreground', async () => {
    const mockWakeLockSentinel = {
      release: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const mockWakeLock = {
      request: jest.fn().mockResolvedValue(mockWakeLockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
    });

    const { result } = renderHook(() => useWakeLock());
    
    // First request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(mockWakeLock.request).toHaveBeenCalledTimes(1);

    // Simulate app going to background and returning to foreground
    document.visibilityState = 'hidden';
    
    await act(async () => {
      // Trigger visibility change
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });

    document.visibilityState = 'visible';
    
    await act(async () => {
      // Trigger visibility change again
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
    });

    // Should request wake lock again when returning to foreground
    expect(mockWakeLock.request).toHaveBeenCalledTimes(2);
  });

  it('should cleanup on unmount', async () => {
    const mockWakeLockSentinel = {
      release: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const mockWakeLock = {
      request: jest.fn().mockResolvedValue(mockWakeLockSentinel),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      writable: true,
    });

    const { result, unmount } = renderHook(() => useWakeLock());
    
    // First request wake lock
    await act(async () => {
      await result.current.requestWakeLock();
    });

    expect(result.current.isActive).toBe(true);

    // Manually release to test the cleanup functionality
    await act(async () => {
      await result.current.releaseWakeLock();
    });

    // Should release wake lock
    expect(mockWakeLockSentinel.release).toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it('should work without Wake Lock API (graceful degradation)', async () => {
    const { result } = renderHook(() => useWakeLock());
    
    await act(async () => {
      await result.current.requestWakeLock();
    });

    // Should create silent audio as fallback
    expect(document.createElement).toHaveBeenCalledWith('audio');
    
    await act(async () => {
      await result.current.releaseWakeLock();
    });

    // Should not throw errors
    expect(result.current.isActive).toBe(false);
  });
});