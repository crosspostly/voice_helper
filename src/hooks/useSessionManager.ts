import { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Assistant, Transcript } from '../types';
import { TranscriptService } from '../services/transcriptService';
import { GeminiService } from '../services/geminiService';
import { useLiveSession, Status } from './useLiveSession';
import { useAutoReconnectTimer } from './useAutoReconnectTimer';
import { useTranscript } from './useTranscript';
import { useLogger } from './useLogger';
import { useAudioEngine } from './useAudioEngine';
import { useLanguageManager } from './useLanguageManager';
import { useWakeLock } from './useWakeLock';
import { PROXY_CONFIG } from '../proxy';

interface UseSessionManagerOptions {
  customApiKey?: string | null;
  defaultApiKey?: string;
  userId?: string;
}

// New: Proxy constants
const { HTTP_PROXY_URL, WSS_PROXY_URL } = PROXY_CONFIG;
export function useSessionManager(options: UseSessionManagerOptions = {}) {
  const { 
    customApiKey, 
    defaultApiKey = 'AIzaSyCrPJN5yn3QAmHEydsmQ8XK_vQPCJvamSA',
    userId = 'user-1'
  } = options;

  const logger = useLogger({ enablePersistence: process.env.NODE_ENV === 'development' });
  const transcript = useTranscript();
  const audioEngine = useAudioEngine();
  const timer = useAutoReconnectTimer();
  const languageManager = useLanguageManager();
  const { requestWakeLock, releaseWakeLock, isActive: isWakeLockActive } = useWakeLock();

  // Proxy state (default: ON)  const [useProxy, setUseProxy] = useState(true);
  const [autoDetectedBlock, setAutoDetectedBlock] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [reconnecting, setReconnecting] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Gemini service instantiation with proxy, if enabled
  const ai = useMemo(() => {
    const apiKey = customApiKey || defaultApiKey;
    if (!apiKey) return null;
    try {
      // Patch global fetch for proxy where needed
      if (useProxy) {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (url, options) => {
          if (typeof url === 'string' && url.startsWith('https://generativelanguage.googleapis.com')) {
            return originalFetch(url.replace('https://generativelanguage.googleapis.com', HTTP_PROXY_URL), options);
          }
          return originalFetch(url, options);
        };
        const client = new GoogleGenAI({ apiKey });
        globalThis.fetch = originalFetch; // cleanup
        return client;
      }
      return new GoogleGenAI({ apiKey });
    } catch (error) {
      return null;
    }
  }, [customApiKey, defaultApiKey, useProxy]);

  // ...proxy error handler as callback
  const handleGeoBlockError = useCallback((error: any) => {
    const errorMessage = error?.message || error?.toString() || '';
    if (
      errorMessage.includes('User location is not supported') ||
      errorMessage.includes('FAILED_PRECONDITION') ||
      error?.code === 400
    ) {
      logger.log('🚨 Geo-blocking detected! Auto-enabling proxy...', 'INFO');
      setUseProxy(true);
      setAutoDetectedBlock(true);
      alert('Geo-blocking detected. Proxy enabled automatically.');
      return true;
    }
    return false;
  }, [logger]);

  const { 
    status, 
    startSession, 
    stopSession, 
    isSessionActive, 
    setStatus,
    sendTextMessage,
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
        setTimeout(() => triggerAutoReconnect(), 0);
      }
    }, [timer]),
  });

  // Auto-reconnect logic (unchanged)
  const triggerAutoReconnect = useCallback(async () => {
    if (status !== 'LISTENING' && status !== 'IDLE') {
      logger.log('Auto-reconnect skipped (Gemini speaking)', 'DEBUG');
      return;
    }
    logger.log('🔄 Auto-reconnect: Refreshing session...', 'INFO');
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

  // Session actions (with proxy-aware retry)
  const start = useCallback(async (assistant: Assistant) => {
    try {
      setErrorState(null);
      setSelectedAssistant(assistant);
      timer.startTimer();
      await requestWakeLock();
      if (assistant.isLinguisticsService) {
        logger.log('Linguistics service was requested but is removed', 'WARN');
      }
      await startSession();
      logger.log('Session started with Wake Lock active', 'INFO');
    } catch (error) {
      logger.log(`Failed to start session: ${error}`, 'ERROR');
      // Автопрокси при ошибке гео
      if (handleGeoBlockError(error)) {
        logger.log('Retrying start with proxy...', 'INFO');
        await startSession();
      } else {
        setErrorState('Failed to start session');
      }
      timer.stopTimer();
      await releaseWakeLock();
    }
  }, [startSession, timer, logger, requestWakeLock, releaseWakeLock, handleGeoBlockError]);

  const stop = useCallback(async () => {
    try {
      setErrorState(null);
      await stopSession();
      timer.stopTimer();
      await releaseWakeLock();
      logger.log('Session stopped, Wake Lock released', 'INFO');
    } catch (error) {
      logger.log(`Error stopping session: ${error}`, 'ERROR');
      setErrorState('Failed to stop session');
      await releaseWakeLock();
    }
  }, [stopSession, timer, logger, releaseWakeLock]);

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

  // Communication actions (proxy-aware)
  const sendText = useCallback(async (text: string) => {
    try {
      if (selectedAssistant?.isLinguisticsService) {
        logger.log('Linguistics service removed - falling back to regular session', 'WARN');
        transcript.addMessage('You', text);
      } else {
        await sendTextMessage(text);
        transcript.addMessage('You', text);
        logger.log(`Text sent: ${text}`, 'DEBUG');
      }
    } catch (error) {
      logger.log(`Failed to send text: ${error}`, 'ERROR');
      // Автопрокси при ошибке гео
      if (handleGeoBlockError(error)) {
        logger.log('Retrying text send with proxy...', 'INFO');
        await sendTextMessage(text);
      } else {
        setErrorState('Failed to send message');
      }
    }
  }, [selectedAssistant, sendTextMessage, transcript, logger, handleGeoBlockError]);

  const sendStructuredMessage = useCallback(async (message: any) => {
    try {
      logger.log(`Structured message sent: ${JSON.stringify(message)}`, 'DEBUG');
    } catch (error) {
      logger.log(`Failed to send structured message: ${error}`, 'ERROR');
      setErrorState('Failed to send message');
    }
  }, [logger]);

  // Make proxy/geo-blocking state accessible
  (useSessionManager as any).useProxy = useProxy;
  (useSessionManager as any).setUseProxy = setUseProxy;
  (useSessionManager as any).autoDetectedBlock = autoDetectedBlock;
  (useSessionManager as any).setAutoDetectedBlock = setAutoDetectedBlock;

  return {
    status,
    isActive: isSessionActive && timer.isActive,
    timeLeft: timer.sessionTimeLeft,
    reconnecting,
    errorState,
    selectedAssistant,
    start,
    stop,
    restart,
    sendText,
    sendStructuredMessage,
    setSelectedAssistant,
    setVoice: setSelectedVoice,
    transcript,
    audioEngine,
    logger,
    languageManager,
    wakeLock: {
      isActive: isWakeLockActive,
    },
  };
}
