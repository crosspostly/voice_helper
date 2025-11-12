import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { VoiceAppProvider, useVoiceAppContext } from '../components/VoiceApp/VoiceAppContext';
import { Assistant } from '../types';

// Mock all the hooks used by VoiceAppProvider
jest.mock('../hooks/useSessionManager');
jest.mock('../hooks/useLanguageManager');

// Import the mocked modules
import { useSessionManager } from '../hooks/useSessionManager';
import { useLanguageManager } from '../hooks/useLanguageManager';

const mockUseSessionManager = useSessionManager as jest.MockedFunction<typeof useSessionManager>;
const mockUseLanguageManager = useLanguageManager as jest.MockedFunction<typeof useLanguageManager>;

// Test wrapper component
const wrapper = ({ children }: { children: ReactNode }) => (
  <VoiceAppProvider>{children}</VoiceAppProvider>
);

describe('VoiceAppContext', () => {
  const mockSessionManager = {
    status: 'IDLE',
    isActive: false,
    timeLeft: 0,
    reconnecting: false,
    errorState: null,
    selectedAssistant: null,
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    sendText: jest.fn(),
    sendStructuredMessage: jest.fn(),
    setSelectedAssistant: jest.fn(),
    setVoice: jest.fn(),
    transcript: {
      transcript: [],
      displayedTranscript: [],
      numMessagesToDisplay: 50,
      addMessage: jest.fn(),
      appendPartial: jest.fn(),
      finalizeLast: jest.fn(),
      clear: jest.fn(),
      setNumMessagesToDisplay: jest.fn(),
      loadMoreMessages: jest.fn(),
      exportToPdf: jest.fn(),
      exportToJson: jest.fn(() => '[]'),
      copyToClipboard: jest.fn(),
      canLoadMore: false,
      transcriptEndRef: { current: null },
    },
    audioEngine: {
      isPlaying: false,
      playBase64Audio: jest.fn(),
      playText: jest.fn(),
      stopAll: jest.fn(),
      attachOnEnded: jest.fn(),
      audioContextRef: { current: null },
    },
    logger: {
      logs: [],
      log: jest.fn(),
      clearLogs: jest.fn(),
      getFilteredLogs: jest.fn(() => []),
      logCount: 0,
    },
    linguisticsSession: {
      // Mock linguistics session properties
    },
  };

  const mockLanguageManager = {
    locale: 'en',
    setLocale: jest.fn(),
    strings: { title: 'Test App' },
    t: jest.fn((key, fallback) => fallback || key),
    availableLanguages: ['en', 'ru'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSessionManager.mockReturnValue(mockSessionManager as any);
    mockUseLanguageManager.mockReturnValue(mockLanguageManager as any);
  });

  it('should provide context value when used within provider', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.session).toBeDefined();
    expect(result.current.transcript).toBeDefined();
    expect(result.current.audio).toBeDefined();
    expect(result.current.language).toBeDefined();
    expect(result.current.logger).toBeDefined();
    expect(result.current.ui).toBeDefined();
  });

  it('should throw error when used outside provider', () => {
    const { result } = renderHook(() => useVoiceAppContext());
    
    expect(result.error).toEqual(
      new Error('useVoiceAppContext must be used within a VoiceAppProvider')
    );
  });

  it('should provide session management functionality', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.session.status).toBe('IDLE');
    expect(result.current.session.isActive).toBe(false);
    expect(result.current.session.start).toBeDefined();
    expect(result.current.session.stop).toBeDefined();
    expect(result.current.session.restart).toBeDefined();
    expect(result.current.session.sendText).toBeDefined();
  });

  it('should provide transcript management functionality', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.transcript.transcript).toEqual([]);
    expect(result.current.transcript.displayedTranscript).toEqual([]);
    expect(result.current.transcript.addMessage).toBeDefined();
    expect(result.current.transcript.clear).toBeDefined();
    expect(result.current.transcript.exportToPdf).toBeDefined();
    expect(result.current.transcript.copyToClipboard).toBeDefined();
  });

  it('should provide audio management functionality', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.audio.isPlaying).toBe(false);
    expect(result.current.audio.playBase64Audio).toBeDefined();
    expect(result.current.audio.playText).toBeDefined();
    expect(result.current.audio.stopAll).toBeDefined();
    expect(result.current.audio.attachOnEnded).toBeDefined();
  });

  it('should provide language management functionality', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.language.locale).toBe('en');
    expect(result.current.language.setLocale).toBeDefined();
    expect(result.current.language.t).toBeDefined();
    expect(result.current.language.availableLanguages).toEqual(['en', 'ru']);
  });

  it('should provide logger functionality', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.logger.logs).toEqual([]);
    expect(result.current.logger.log).toBeDefined();
    expect(result.current.logger.clearLogs).toBeDefined();
    expect(result.current.logger.logCount).toBe(0);
  });

  it('should provide UI state management', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.ui.customAssistants).toEqual([]);
    expect(result.current.ui.customApiKey).toBe('');
    expect(result.current.ui.isDevMode).toBe(false);
    expect(result.current.ui.isSettingsModalOpen).toBe(false);
    expect(result.current.ui.showLogs).toBe(false);
  });

  it('should pass API key props to session manager', () => {
    const customApiKey = 'custom-api-key';
    const defaultApiKey = 'default-api-key';
    
    renderHook(() => useVoiceAppContext(), {
      wrapper: ({ children }) => (
        <VoiceAppProvider 
          customApiKey={customApiKey} 
          defaultApiKey={defaultApiKey}
        >
          {children}
        </VoiceAppProvider>
      ),
    });
    
    expect(mockUseSessionManager).toHaveBeenCalledWith({
      customApiKey,
      defaultApiKey,
    });
  });

  it('should handle session state changes', () => {
    const modifiedMock = {
      ...mockSessionManager,
      status: 'LISTENING' as const,
      isActive: true,
      selectedAssistant: { id: 'test', prompt: 'test prompt' } as Assistant,
    };
    mockUseSessionManager.mockReturnValue(modifiedMock as any);
    
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.session.status).toBe('LISTENING');
    expect(result.current.session.isActive).toBe(true);
    expect(result.current.session.selectedAssistant).toEqual({
      id: 'test',
      prompt: 'test prompt',
    });
  });

  it('should handle transcript changes', () => {
    const modifiedMock = {
      ...mockSessionManager,
      transcript: {
        ...mockSessionManager.transcript,
        transcript: [{ speaker: 'You', text: 'Hello', isFinal: true }],
        displayedTranscript: [{ speaker: 'You', text: 'Hello', isFinal: true }],
        canLoadMore: true,
      },
    };
    mockUseSessionManager.mockReturnValue(modifiedMock as any);
    
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.transcript.transcript).toHaveLength(1);
    expect(result.current.transcript.displayedTranscript).toHaveLength(1);
    expect(result.current.transcript.canLoadMore).toBe(true);
  });

  it('should handle audio state changes', () => {
    const modifiedMock = {
      ...mockSessionManager,
      audioEngine: {
        ...mockSessionManager.audioEngine,
        isPlaying: true,
      },
    };
    mockUseSessionManager.mockReturnValue(modifiedMock as any);
    
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.audio.isPlaying).toBe(true);
  });

  it('should handle language changes', () => {
    const modifiedMock = {
      ...mockLanguageManager,
      locale: 'ru',
      strings: { title: 'Тестовое приложение' },
    };
    mockUseLanguageManager.mockReturnValue(modifiedMock as any);
    
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    expect(result.current.language.locale).toBe('ru');
    expect(result.current.language.strings.title).toBe('Тестовое приложение');
  });

  it('should propagate function calls correctly', async () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    const testAssistant = { id: 'test', prompt: 'test' } as Assistant;
    
    await result.current.session.start(testAssistant);
    expect(mockSessionManager.start).toHaveBeenCalledWith(testAssistant);
    
    result.current.session.setVoice('new-voice');
    expect(mockSessionManager.setVoice).toHaveBeenCalledWith('new-voice');
    
    result.current.transcript.addMessage('You', 'Hello');
    expect(mockSessionManager.transcript.addMessage).toHaveBeenCalledWith('You', 'Hello');
    
    result.current.audio.stopAll();
    expect(mockSessionManager.audioEngine.stopAll).toHaveBeenCalled();
    
    result.current.language.setLocale('ru');
    expect(mockLanguageManager.setLocale).toHaveBeenCalledWith('ru');
    
    result.current.logger.log('Test message');
    expect(mockSessionManager.logger.log).toHaveBeenCalledWith('Test message');
  });

  it('should handle context value shape consistency', () => {
    const { result } = renderHook(() => useVoiceAppContext(), { wrapper });
    
    // Check that all expected properties exist
    const contextValue = result.current;
    
    expect(contextValue).toHaveProperty('session');
    expect(contextValue).toHaveProperty('transcript');
    expect(contextValue).toHaveProperty('audio');
    expect(contextValue).toHaveProperty('language');
    expect(contextValue).toHaveProperty('logger');
    expect(contextValue).toHaveProperty('ui');
    
    // Check session properties
    expect(contextValue.session).toHaveProperty('status');
    expect(contextValue.session).toHaveProperty('isActive');
    expect(contextValue.session).toHaveProperty('start');
    expect(contextValue.session).toHaveProperty('stop');
    expect(contextValue.session).toHaveProperty('sendText');
    
    // Check transcript properties
    expect(contextValue.transcript).toHaveProperty('transcript');
    expect(contextValue.transcript).toHaveProperty('addMessage');
    expect(contextValue.transcript).toHaveProperty('clear');
    expect(contextValue.transcript).toHaveProperty('exportToPdf');
    
    // Check audio properties
    expect(contextValue.audio).toHaveProperty('isPlaying');
    expect(contextValue.audio).toHaveProperty('playBase64Audio');
    expect(contextValue.audio).toHaveProperty('stopAll');
    
    // Check language properties
    expect(contextValue.language).toHaveProperty('locale');
    expect(contextValue.language).toHaveProperty('t');
    expect(contextValue.language).toHaveProperty('availableLanguages');
    
    // Check logger properties
    expect(contextValue.logger).toHaveProperty('logs');
    expect(contextValue.logger).toHaveProperty('log');
    expect(contextValue.logger).toHaveProperty('clearLogs');
    
    // Check UI properties
    expect(contextValue.ui).toHaveProperty('customAssistants');
    expect(contextValue.ui).toHaveProperty('isDevMode');
    expect(contextValue.ui).toHaveProperty('isSettingsModalOpen');
  });
});