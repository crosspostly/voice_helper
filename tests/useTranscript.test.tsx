import { renderHook, act } from '@testing-library/react';
import { useTranscript } from '../hooks/useTranscript';
import { TranscriptService } from '../services/transcriptService';

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

// Mock TranscriptService methods
jest.mock('../../services/transcriptService', () => ({
  TranscriptService: {
    transcriptToHistory: jest.fn(),
    exportToText: jest.fn(),
    copyToClipboard: jest.fn().mockResolvedValue(undefined),
    exportToPdf: jest.fn().mockResolvedValue(undefined),
    exportToJson: jest.fn().mockReturnValue('[]'),
    trimHistory: jest.fn(),
    addMessage: jest.fn(),
    appendPartial: jest.fn(),
    finalizeLast: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockTranscriptService = TranscriptService as any;

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock window.jspdf
const mockJsPDF = jest.fn().mockImplementation(() => ({
  text: jest.fn(),
  setFontSize: jest.fn(),
  splitTextToSize: jest.fn().mockReturnValue(['line1', 'line2']),
  internal: {
    pageSize: { height: 300 },
  },
  save: jest.fn(),
  addPage: jest.fn(),
}));

Object.assign(window, {
  jspdf: {
    jsPDF: mockJsPDF,
  },
});

describe('useTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Reset window.jspdf mock
    Object.assign(window, {
      jspdf: {
        jsPDF: mockJsPDF,
      },
    });
  });

  it('should initialize with empty transcript', () => {
    const { result } = renderHook(() => useTranscript());
    
    expect(result.current.transcript).toEqual([]);
    expect(result.current.displayedTranscript).toEqual([]);
    expect(result.current.numMessagesToDisplay).toBe(50);
    expect(result.current.canLoadMore).toBe(false);
  });

  it('should add a new message', () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('You', 'Hello world');
    });
    
    expect(result.current.transcript).toHaveLength(1);
    expect(result.current.transcript[0]).toMatchObject({
      speaker: 'You',
      text: 'Hello world',
      isFinal: true,
    });
  });

  it('should append partial text', () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('Gemini', 'Hello');
    });
    act(() => {
      result.current.appendPartial(' world');
    });
    
    expect(result.current.transcript).toHaveLength(1);
    expect(result.current.transcript[0].text).toBe('Hello world');
    expect(result.current.transcript[0].isFinal).toBe(false);
  });

  it('should finalize last entry', () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('Gemini', 'Hello');
    });
    act(() => {
      result.current.finalizeLast();
    });
    
    expect(result.current.transcript[0].isFinal).toBe(true);
  });

  it('should clear transcript', () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('You', 'Hello');
      result.current.addMessage('Gemini', 'Hi there');
      result.current.clear();
    });
    
    expect(result.current.transcript).toEqual([]);
    expect(result.current.numMessagesToDisplay).toBe(50);
  });

  it('should limit displayed transcript', () => {
    const { result } = renderHook(() => useTranscript({ maxDisplayEntries: 3 }));
    
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.addMessage('You', `Message ${i}`);
      });
    }
    
    expect(result.current.transcript).toHaveLength(10);
    expect(result.current.displayedTranscript).toHaveLength(3);
    expect(result.current.canLoadMore).toBe(true);
  });

  it('should load more messages', () => {
    const { result } = renderHook(() => useTranscript({ maxDisplayEntries: 3 }));
    
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.addMessage('You', `Message ${i}`);
      });
    }
    act(() => {
      result.current.loadMoreMessages();
    });
    
    expect(result.current.numMessagesToDisplay).toBe(6);
    expect(result.current.displayedTranscript).toHaveLength(6);
  });

  it('should export to JSON', () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('You', 'Hello');
    });
    act(() => {
      result.current.addMessage('Gemini', 'Hi there');
    });
    
    const json = result.current.exportToJson();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].speaker).toBe('You');
    expect(parsed[1].speaker).toBe('Gemini');
  });

  it('should copy to clipboard', async () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('You', 'Hello');
    });
    
    await act(async () => {
      await result.current.copyToClipboard();
    });
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('You: Hello');
  });

  it('should export to PDF', async () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('You', 'Hello');
    });
    
    await act(async () => {
      await result.current.exportToPdf('test.pdf');
    });
    
    expect(window.jspdf.jsPDF).toHaveBeenCalled();
    const mockPdf = (window.jspdf.jsPDF as jest.Mock).mock.results[0].value;
    expect(mockPdf.save).toHaveBeenCalledWith('test.pdf');
  });

  it('should persist transcript to localStorage', () => {
    const { result } = renderHook(() => useTranscript());
    
    act(() => {
      result.current.addMessage('You', 'Hello');
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'transcript',
      expect.stringContaining('Hello')
    );
  });

  it('should load transcript from localStorage', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { speaker: 'You', text: 'Loaded message', isFinal: true }
    ]));
    
    const { result } = renderHook(() => useTranscript());
    
    expect(result.current.transcript).toHaveLength(1);
    expect(result.current.transcript[0].text).toBe('Loaded message');
  });

  it('should handle metadata in messages', () => {
    const { result } = renderHook(() => useTranscript());
    
    const metadata = {
      response_type: 'structured' as const,
      exercises: [{
        title: 'Test Exercise',
        description: 'Test Description',
        difficulty: 'beginner' as const,
      }],
    };
    
    act(() => {
      result.current.addMessage('Gemini', 'Response', metadata);
    });
    
    expect(result.current.transcript[0]).toMatchObject({
      speaker: 'Gemini',
      text: 'Response',
      isFinal: true,
      metadata,
    });
  });
});