import { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Assistant, Transcript } from '../types';
import { TranscriptService } from '../services/transcriptService';
import { GeminiService } from '../services/geminiService';
import { useLiveSession, Status } from './useLiveSession';
import { useAutoReconnectTimer } from './useAutoReconnectTimer';
import { useTranscript } from './useTranscript';
import { useLogger } from './useLogger';
import { useAudioEngine } from './useAudioEngine';
import { useLinguisticsSession } from './useLinguisticsSession';
import { useLanguageManager } from './useLanguageManager';

interface UseSessionManagerOptions {
  customApiKey?: string | null;
  defaultApiKey?: string;
  userId?: string;
}

interface UseSessionManagerReturn {
  // Session state
  status: Status;
  isActive: boolean;
  timeLeft: number;
  reconnecting: boolean;
  errorState: string | null;
  selectedAssistant: Assistant | null;
  
  // Session actions
  start: (assistant: Assistant) => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  
  // Communication actions
  sendText: (text: string) => Promise<void>;
  sendStructuredMessage: (message: any) => Promise<void>;
  
  // Configuration
  setSelectedAssistant: (assistant: Assistant) => void;
  setVoice: (voice: string) => void;
  
  // Sub-hooks access
  transcript: ReturnType<typeof useTranscript>;
  audioEngine: ReturnType<typeof useAudioEngine>;
  logger: ReturnType<typeof useLogger>;
  linguisticsSession: ReturnType<typeof useLinguisticsSession>;
  languageManager: ReturnType<typeof useLanguageManager>;
}

/**
 * High-level hook for managing live sessions with auto-reconnect
 */
export function useSessionManager(options: UseSessionManagerOptions = {}): UseSessionManagerReturn {
  const { 
    customApiKey, 
    defaultApiKey = 'AIzaSyCrPJN5yn3QAmHEydsmQ8XK_vQPCJvamSA',
    userId = 'user-1'
  } = options;

  // Core hooks
  const logger = useLogger({ enablePersistence: process.env.NODE_ENV === 'development' });
  const transcript = useTranscript();
  const audioEngine = useAudioEngine();
  const timer = useAutoReconnectTimer();
  const languageManager = useLanguageManager();
  
  // State
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [reconnecting, setReconnecting] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Gemini service
  const geminiService = useMemo(() => {
    const apiKey = customApiKey || defaultApiKey;
    if (!apiKey) {
      logger.log('No API key provided for Gemini service', 'ERROR');
      return null;
    }
    try {
      return GeminiService.create(apiKey);
    } catch (error) {
      logger.log(`Failed to create Gemini service: ${error}`, 'ERROR');
      return null;
    }
  }, [customApiKey, defaultApiKey, logger]);

  const ai = useMemo(() => {
    const apiKey = customApiKey || defaultApiKey;
    if (!apiKey) {
      return null;
    }
    try {
      return new GoogleGenAI({ apiKey });
    } catch (error) {
      logger.log(`Failed to initialize GoogleGenAI: ${error}`, 'ERROR');
      return null;
    }
  }, [customApiKey, defaultApiKey, logger]);

  // Live session hook
  const { 
    status, 
    startSession, 
    stopSession, 
    isSessionActive, 
    setStatus,
    sendTextMessage: sendLinguisticsMessage,
    linguisticsSession
  } = useLiveSession({
    ai,
    selectedAssistant: selectedAssistant || { id: '', prompt: '' },
    selectedVoice,
    userId,
    setTranscript: transcript.setTranscript,
    transcript: transcript.transcript,
    playAudio: audioEngine.playBase64Audio,
    stopPlayback: audioEngine.stopAll,
    log: logger.log,
    onResponseComplete: useCallback(() => {
      if (timer.shouldReconnect()) {
        logger.log('⏰ Session age ≥ 4.5 min, triggering auto-reconnect...', 'INFO');
        triggerAutoReconnect();
      }
    }, [timer.shouldReconnect, logger]),
  });

  // Auto-reconnect logic
  const triggerAutoReconnect = useCallback(async () => {
    if (status !== 'LISTENING' && status !== 'IDLE') {
      logger.log('Auto-reconnect skipped (Gemini speaking)', 'DEBUG');
      return;
    }
    
    logger.log('🔄 Auto-reconnect: Refreshing session to prevent timeout...', 'INFO');
    setReconnecting(true);
    
    try {
      await stopSession(false);
      await new Promise(resolve => setTimeout(resolve, 300));
      await startSession();
      timer.resetTimer();
      logger.log('✅ Auto-reconnect: New session started', 'INFO');
    } catch (error) {
      logger.log(`Auto-reconnect failed: ${error}`, 'ERROR');
      setErrorState('Auto-reconnect failed');
    } finally {
      setReconnecting(false);
    }
  }, [status, stopSession, startSession, timer, logger]);

  // Session actions
  const start = useCallback(async (assistant: Assistant) => {
    try {
      setErrorState(null);
      setSelectedAssistant(assistant);
      timer.startTimer();
      
      if (assistant.isLinguisticsService) {
        // Use linguistics session
        logger.log('Starting linguistics session', 'INFO');
      }
      
      await startSession();
      logger.log('Session started successfully', 'INFO');
    } catch (error) {
      logger.log(`Failed to start session: ${error}`, 'ERROR');
      setErrorState('Failed to start session');
      timer.stopTimer();
    }
  }, [startSession, timer, logger]);

  const stop = useCallback(async () => {
    try {
      setErrorState(null);
      await stopSession();
      timer.stopTimer();
      logger.log('Session stopped successfully', 'INFO');
    } catch (error) {
      logger.log(`Failed to stop session: ${error}`, 'ERROR');
      setErrorState('Failed to stop session');
    }
  }, [stopSession, timer, logger]);

  const restart = useCallback(async () => {
    if (!selectedAssistant) {
      logger.log('Cannot restart: no assistant selected', 'ERROR');
      return;
    }
    
    logger.log('Restarting session...', 'INFO');
    await stop();
    await new Promise(resolve => setTimeout(resolve, 500));
    await start(selectedAssistant);
  }, [selectedAssistant, stop, start, logger]);

  // Communication actions
  const sendText = useCallback(async (text: string) => {
    try {
      if (selectedAssistant?.isLinguisticsService) {
        await sendLinguisticsMessage(text);
      } else {
        // Regular Gemini session - text would be handled by live session
        transcript.addMessage('You', text);
        logger.log(`Text sent: ${text}`, 'DEBUG');
      }
    } catch (error) {
      logger.log(`Failed to send text: ${error}`, 'ERROR');
      setErrorState('Failed to send message');
    }
  }, [selectedAssistant, sendLinguisticsMessage, transcript, logger]);

  const sendStructuredMessage = useCallback(async (message: any) => {
    try {
      // This would send structured data to the session
      logger.log(`Structured message sent: ${JSON.stringify(message)}`, 'DEBUG');
    } catch (error) {
      logger.log(`Failed to send structured message: ${error}`, 'ERROR');
      setErrorState('Failed to send message');
    }
  }, [logger]);

  return {
    // Session state
    status,
    isActive: isSessionActive && timer.isActive,
    timeLeft: timer.sessionTimeLeft,
    reconnecting,
    errorState,
    selectedAssistant,
    
    // Session actions
    start,
    stop,
    restart,
    
    // Communication actions
    sendText,
    sendStructuredMessage,
    
    // Configuration
    setSelectedAssistant,
    setVoice: setSelectedVoice,
    
    // Sub-hooks access
    transcript,
    audioEngine,
    logger,
    linguisticsSession,
    languageManager,
  };
}