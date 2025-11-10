import { renderHook, act } from '@testing-library/react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { decode } from '../services/audioUtils';

// Mock AudioContext and related APIs
const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  createBuffer: jest.fn().mockReturnValue({
    duration: 1.0,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(100)),
  }),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null,
    playbackState: 'playing',
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: { value: 1.0 },
  }),
  destination: {},
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  suspend: jest.fn().mockResolvedValue(undefined),
};

const mockAudioBufferSourceNode = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  onended: null,
  playbackState: 'playing',
};

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn().mockImplementation(() => mockAudioContext),
  writable: true,
});

Object.defineProperty(window, 'webkitAudioContext', {
  value: window.AudioContext,
  writable: true,
});

// Mock audioUtils
jest.mock('../../services/audioUtils');
const mockDecode = decode as jest.MockedFunction<typeof decode>;

// Mock console.error to avoid test output noise
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useAudioEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContext.currentTime = 0;
    mockAudioContext.state = 'running';
    mockAudioContext.createBufferSource.mockReturnValue(mockAudioBufferSourceNode);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with isPlaying false', () => {
    const { result } = renderHook(() => useAudioEngine());
    
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.audioContextRef.current).toBeNull();
  });

  it('should create AudioContext lazily', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    // Initially null
    expect(result.current.audioContextRef.current).toBeNull();
    
    // Should create when playing audio
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    expect(window.AudioContext).toHaveBeenCalled();
    expect(result.current.audioContextRef.current).toBe(mockAudioContext);
  });

  it('should play base64 audio', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    const fakeAudioData = new Uint8Array(100);
    mockDecode.mockReturnValue(fakeAudioData);
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    expect(mockDecode).toHaveBeenCalledWith('fake-audio-data');
    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    expect(mockAudioBufferSourceNode.connect).toHaveBeenCalled();
    expect(mockAudioBufferSourceNode.start).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
  });

  it('should handle audio playback with custom options', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    mockAudioContext.currentTime = 1.0;
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data', {
        startTime: 2.0,
        volume: 0.5,
      });
    });
    
    expect(mockAudioBufferSourceNode.start).toHaveBeenCalledWith(2.0);
    expect(mockAudioContext.createGain().gain.value).toBe(0.5);
  });

  it('should stop all playback', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    // Start multiple audio sources
    await act(async () => {
      await result.current.playBase64Audio('audio1');
      await result.current.playBase64Audio('audio2');
    });
    
    expect(result.current.isPlaying).toBe(true);
    
    act(() => {
      result.current.stopAll();
    });
    
    expect(mockAudioBufferSourceNode.stop).toHaveBeenCalledTimes(2);
    expect(result.current.isPlaying).toBe(false);
  });

  it('should handle on-ended callbacks', async () => {
    const { result } = renderHook(() => useAudioEngine());
    const onEndedCallback = jest.fn();
    
    const detachCallback = result.current.attachOnEnded(onEndedCallback);
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    // Simulate audio ending
    act(() => {
      if (mockAudioBufferSourceNode.onended) {
        mockAudioBufferSourceNode.onended(new Event('ended'));
      }
    });
    
    expect(onEndedCallback).toHaveBeenCalled();
    
    // Cleanup
    detachCallback();
    
    // Should not call after detach
    act(() => {
      if (mockAudioBufferSourceNode.onended) {
        mockAudioBufferSourceNode.onended(new Event('ended'));
      }
    });
    
    expect(onEndedCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle playText errors', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    await act(async () => {
      await expect(result.current.playText('Hello world')).rejects.toThrow(
        'TTS not implemented - integrate with GeminiService.generateSpeech'
      );
    });
  });

  it('should handle audio context suspended state', async () => {
    mockAudioContext.state = 'suspended';
    
    const { result } = renderHook(() => useAudioEngine());
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it('should handle audio context closed state', async () => {
    mockAudioContext.state = 'closed';
    
    const { result } = renderHook(() => useAudioEngine());
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    expect(window.AudioContext).toHaveBeenCalledTimes(2); // New context created
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useAudioEngine());
    
    // Simulate context being created
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    unmount();
    
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('should handle audio playback errors', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    mockDecode.mockImplementation(() => {
      throw new Error('Decode error');
    });
    
    await act(async () => {
      await expect(result.current.playBase64Audio('invalid-audio')).rejects.toThrow('Decode error');
    });
    
    expect(mockConsoleError).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('should handle stop errors gracefully', async () => {
    const { result } = renderHook(() => useAudioEngine());
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    mockAudioBufferSourceNode.stop.mockImplementation(() => {
      throw new Error('Already stopped');
    });
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    act(() => {
      result.current.stopAll();
    });
    
    // Should not throw despite stop error
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should use custom sample rate and channels', async () => {
    const { result } = renderHook(() => useAudioEngine({
      sampleRate: 48000,
      numChannels: 2,
    }));
    
    mockDecode.mockReturnValue(new Uint8Array(100));
    
    await act(async () => {
      await result.current.playBase64Audio('fake-audio-data');
    });
    
    expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
      2, // numChannels
      expect.any(Number), // frameCount
      48000 // sampleRate
    );
  });
});