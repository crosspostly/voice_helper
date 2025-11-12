import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useSessionManager } from '../src/hooks/useSessionManager';
import { Assistant } from '../src/types';

// Mock useWakeLock specifically for testing integration
const mockRequestWakeLock = vi.fn().mockResolvedValue(undefined);
const mockReleaseWakeLock = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/hooks/useWakeLock', () => ({
  useWakeLock: () => ({
    requestWakeLock: mockRequestWakeLock,
    releaseWakeLock: mockReleaseWakeLock,
    isActive: false,
  }),
}));

// Mock all other hooks to prevent infinite re-renders
vi.mock('../src/hooks/useLogger', () => ({
  useLogger: () => ({
    log: vi.fn(),
  }),
}));

vi.mock('../src/hooks/useLiveSession', () => ({
  useLiveSession: () => ({
    status: 'IDLE',
    startSession: vi.fn().mockResolvedValue(undefined),
    stopSession: vi.fn().mockResolvedValue(undefined),
    isSessionActive: false,
    setStatus: vi.fn(),
    sendTextMessage: vi.fn().mockResolvedValue(undefined),
    linguisticsSession: null,
  }),
}));

vi.mock('../src/hooks/useTranscript', () => ({
  useTranscript: () => ({
    setTranscript: vi.fn(),
    transcript: [],
    addMessage: vi.fn(),
  }),
}));

vi.mock('../src/hooks/useAudioEngine', () => ({
  useAudioEngine: () => ({
    playBase64Audio: vi.fn(),
    stopAll: vi.fn(),
  }),
}));

vi.mock('../src/hooks/useAutoReconnectTimer', () => ({
  useAutoReconnectTimer: () => ({
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    resetTimer: vi.fn(),
    isActive: true,
    sessionTimeLeft: 300,
    shouldReconnect: vi.fn(() => false),
  }),
}));

vi.mock('../src/hooks/useLanguageManager', () => ({
  useLanguageManager: () => ({
    currentLanguage: 'en',
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
  }),
}));

vi.mock('../src/hooks/useLinguisticsSession', () => ({
  useLinguisticsSession: () => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isActive: false,
    error: null,
  }),
}));

// Mock services to prevent issues
vi.mock('../src/services/geminiService', () => ({
  GeminiService: {
    create: vi.fn(() => ({
      initialize: vi.fn(),
    })),
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    initialize: vi.fn(),
  })),
}));

describe('useSessionManager with Wake Lock Integration', () => {
  const mockAssistant: Assistant = {
    id: 'test-assistant',
    name: 'Test Assistant',
    prompt: 'You are a test assistant',
    voice: 'Zephyr',
    isLinguisticsService: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestWakeLock.mockClear();
    mockReleaseWakeLock.mockClear();
  });

  it('should expose Wake Lock status in return value', () => {
    const { result } = renderHook(() => useSessionManager());
    
    expect(result.current.wakeLock).toBeDefined();
    expect(typeof result.current.wakeLock.isActive).toBe('boolean');
  });

  it('should request Wake Lock when starting a session', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    // Check if the hook initializes properly
    expect(result.current).toBeDefined();
    expect(result.current.start).toBeDefined();
    
    await act(async () => {
      try {
        await result.current.start(mockAssistant);
      } catch (error) {
        console.log('Start error:', error);
      }
    });

    expect(mockRequestWakeLock).toHaveBeenCalled();
  });

  it('should release Wake Lock when stopping a session', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    await act(async () => {
      await result.current.start(mockAssistant);
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(mockReleaseWakeLock).toHaveBeenCalled();
  });

  it('should handle linguistics sessions with Wake Lock', async () => {
    const linguisticsAssistant: Assistant = {
      ...mockAssistant,
      isLinguisticsService: true,
    };

    const { result } = renderHook(() => useSessionManager());
    
    await act(async () => {
      await result.current.start(linguisticsAssistant);
    });

    expect(mockRequestWakeLock).toHaveBeenCalled();
    expect(result.current.selectedAssistant?.isLinguisticsService).toBe(true);
  });

  it('should handle Wake Lock when no assistant is selected', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    await act(async () => {
      await result.current.restart(); // Should do nothing without assistant
    });

    expect(mockRequestWakeLock).not.toHaveBeenCalled();
  });
});