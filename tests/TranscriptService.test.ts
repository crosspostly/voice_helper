import { TranscriptService } from '../src/services/transcriptService';
import { Transcript } from '../src/types';

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

// Mock jsPDF
const mockJsPDF = jest.fn().mockImplementation(() => ({
  text: jest.fn(),
  splitTextToSize: jest.fn().mockReturnValue(['line1', 'line2']),
  addPage: jest.fn(),
  save: jest.fn(),
  setFont: jest.fn(),
}));

const mockJsPDFObj = {
  text: jest.fn(),
  splitTextToSize: jest.fn().mockReturnValue(['line1', 'line2']),
  addPage: jest.fn(),
  save: jest.fn(),
  setFont: jest.fn(),
};

Object.defineProperty(window, 'jspdf', {
  value: { 
    jsPDF: jest.fn(() => mockJsPDFObj)
  },
});

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  configurable: true,
});

describe('TranscriptService', () => {
  let transcriptService: TranscriptService;
  const mockTranscript: Transcript[] = [
    { speaker: 'You', text: 'Hello', isFinal: true },
    { speaker: 'Gemini', text: 'Hi there!', isFinal: true },
  ];

  beforeEach(() => {
    transcriptService = new TranscriptService();
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('loadTranscript', () => {
    it('should load transcript from localStorage', () => {
      localStorageMock.setItem('transcript', JSON.stringify(mockTranscript));
      
      const result = transcriptService.loadTranscript();
      
      expect(result).toEqual(mockTranscript);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('transcript');
    });

    it('should return empty array when no transcript exists', () => {
      const result = transcriptService.loadTranscript();
      
      expect(result).toEqual([]);
    });

    it('should handle localStorage errors', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = transcriptService.loadTranscript();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load transcript from localStorage", expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON', () => {
      localStorageMock.setItem('transcript', 'invalid-json');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = transcriptService.loadTranscript();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load transcript from localStorage", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveTranscript', () => {
    it('should save transcript to localStorage', () => {
      transcriptService.saveTranscript(mockTranscript);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('transcript', JSON.stringify(mockTranscript));
    });

    it('should handle save errors', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      transcriptService.saveTranscript(mockTranscript);
      
      expect(consoleSpy).toHaveBeenCalledWith("Error saving transcript to localStorage", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearTranscript', () => {
    it('should clear transcript from localStorage', () => {
      transcriptService.clearTranscript();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('transcript');
    });

    it('should handle clear errors', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      transcriptService.clearTranscript();
      
      expect(consoleSpy).toHaveBeenCalledWith("Error clearing transcript from localStorage", expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('exportToText', () => {
    it('should export transcript as text', () => {
      const result = transcriptService.exportToText(mockTranscript);
      
      expect(result).toBe('You: Hello\nGemini: Hi there!');
    });
  });

  describe('exportToPdf', () => {
    it('should export transcript as PDF', async () => {
      await transcriptService.exportToPdf(mockTranscript, 'test.pdf');
      
      expect(mockJsPDF).toHaveBeenCalled();
      expect(mockJsPDF().setFont).toHaveBeenCalledWith('Helvetica');
      expect(mockJsPDF().save).toHaveBeenCalledWith('test.pdf');
    });

    it('should throw error when jsPDF is not available', async () => {
      delete (window as any).jspdf;
      
      await expect(transcriptService.exportToPdf(mockTranscript)).rejects.toThrow('jsPDF not loaded');
    });
  });

  describe('exportToJson', () => {
    it('should export transcript as JSON', () => {
      const result = transcriptService.exportToJson(mockTranscript);
      
      expect(result).toBe(JSON.stringify(mockTranscript, null, 2));
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard', async () => {
      await transcriptService.copyToClipboard('test text');
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
    });
  });
});