import { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob } from '../services/audioUtils';
import { Assistant, Transcript } from '../types';
import { PROXY_CONFIG } from '../proxy';
import { metricsCollector } from '../services/proxyMetrics';


// CRITICAL: Force WebSocket through proxy BEFORE any connections
if (typeof globalThis !== 'undefined' && !((globalThis as any)._wsProxyPatched)) {
  const OriginalWebSocket = globalThis.WebSocket;
  
  // Use Proxy with Reflect.construct to avoid constructor issues
  (globalThis as any).WebSocket = new Proxy(OriginalWebSocket, {
    construct(target, args) {
      let [url, protocols] = args;
      let useProxy = false;
      let startTime = performance.now();
      
      // Transform URL before creating WebSocket
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        url = url.replace('wss://generativelanguage.googleapis.com', 'wss://subbot.sheepoff.workers.dev');
        useProxy = true;
        console.log('🌐 WebSocket FORCED to proxy:', url);
      }
      
      // Create the original WebSocket with the transformed URL using Reflect.construct
      const ws = Reflect.construct(target, [url, protocols]);
      
      // Add metrics collection
      const duration = performance.now() - startTime;
      ws.addEventListener('open', () => {
        metricsCollector.recordMetric({
          timestamp: Date.now(),
          type: useProxy ? 'proxy' : 'direct',
          operation: 'websocket',
          success: true,
          duration: Math.round(performance.now() - startTime),
        });
      });

      ws.addEventListener('error', (error: any) => {
        metricsCollector.recordMetric({
          timestamp: Date.now(),
          type: useProxy ? 'proxy' : 'direct',
          operation: 'websocket',
          success: false,
          duration: Math.round(performance.now() - startTime),
          error: error.message || 'Unknown WebSocket error',
        });
      });
      
      return ws;
    }
  });
  
  (globalThis as any)._wsProxyPatched = true;
}

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

export type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR' | 'PROCESSING' | 'RECONNECTING';

interface UseLiveSessionProps {
  ai: GoogleGenAI | null;
  selectedAssistant: Assistant;
  selectedVoice: string;
  userId: string;
  setTranscript: Dispatch<SetStateAction<Transcript[]>>;
  transcript: Transcript[];
  playAudio: (base64Audio: string) => Promise<void>;
  stopPlayback: () => void;
  log: (message: string, level?: 'INFO' | 'ERROR' | 'DEBUG') => void;
  onResponseComplete?: () => void;
}

const TURN_TAKING_INSTRUCTION = "Crucial rule: Your primary function is to be an active listener. Never interrupt the user while they are speaking. Wait for a clear pause in their speech before you begin to respond. Your responses should be timely but not rushed.";

export const useLiveSession = ({
  ai,
  selectedAssistant,
  selectedVoice,
  userId,
  setTranscript,
  transcript,
  playAudio,
  stopPlayback,
  log,
  onResponseComplete,
}: UseLiveSessionProps) => {
  const [status, setStatus] = useState<Status>('IDLE');
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isSessionActiveRef = useRef(false);
  const statusRef = useRef<Status>('IDLE');

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopSession = useCallback(async (isRestarting = false) => {
    log(`stopSession called. isRestarting: ${isRestarting}`);
    if (!isRestarting) {
      setIsSessionActive(false);
    }

    if (keepAliveIntervalRef.current) {
        window.clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
        log('Keep-alive interval cleared.');
    }

    if (sessionPromiseRef.current) {
      log('Closing existing session...');
      try {
        const session = await sessionPromiseRef.current;
        if (session?.ws && session.ws.readyState !== 3 && session.ws.readyState !== 2) {
          session.ws.close();
        }
        session.close();
        log('Session.close() called.');
      } catch (e) {
        log(`Error closing session: ${(e as Error).message}`, 'ERROR');
      }
      sessionPromiseRef.current = null;
    }

    if (audioWorkletNodeRef.current) {
        log('Disconnecting AudioWorklet...');
        audioWorkletNodeRef.current.port.onmessage = null;
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      log('Disconnecting media stream source...');
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      log('Closing input audio context...');
      await inputAudioContextRef.current.close().catch(e => log(`Error closing input audio context: ${e.message}`, 'ERROR'));
      inputAudioContextRef.current = null;
    }
    if (wakeLockRef.current) {
        log('Releasing screen wake lock...');
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        log('Screen Wake Lock released.');
    }
    if (!isRestarting) {
        setStatus('IDLE');
        setTranscript(prev => prev.map(t => ({...t, isFinal: true})));
        log('Session stopped gracefully.', 'INFO');
    } else {
        log('Session resources cleaned up for restart.');
    }
  }, [log, setTranscript]);


  const startSession = useCallback(async () => {
    const currentStatus = statusRef.current;
    log(`🎤 startSession called. Current status: ${currentStatus}`);
    if (currentStatus !== 'IDLE' && currentStatus !== 'ERROR' && currentStatus !== 'RECONNECTING') {
      log(`startSession called with invalid status: ${currentStatus}. Aborting.`, 'INFO');
      return;
    }
    if (!selectedAssistant) {
      log('Cannot start session: No assistant selected', 'ERROR');
      setStatus('ERROR');
      return;
    }
    if (!ai) {
      log('Cannot start session, Gemini AI not initialized.', 'ERROR');
      setStatus('ERROR');
      return;
    }
    
    if (currentStatus !== 'RECONNECTING') {
        log('Starting new session...', 'INFO');
        setStatus('CONNECTING');
    } else {
        log(`Reconnection attempt #${reconnectAttemptsRef.current + 1}...`, 'INFO');
    }
    setIsSessionActive(true);
    try {
      if (navigator.wakeLock) {
        try { wakeLockRef.current = await navigator.wakeLock.request('screen'); log('Screen Wake Lock acquired.'); } catch (err) { log(`Wake Lock request failed: ${(err as Error).message}. This is non-critical.`, 'INFO'); }
      }
      const handleReconnect = async () => {
        if (!isSessionActiveRef.current) { log('Reconnect cancelled: Session was intentionally stopped.', 'INFO'); return; }
        await stopSession(true); 
        if (reconnectAttemptsRef.current < 5) {
            reconnectAttemptsRef.current++;
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
            setStatus('RECONNECTING');
            log(`Connection lost. Attempting to reconnect in ${delay / 1000}s...`, 'INFO');
            setTimeout(() => { if (isSessionActiveRef.current) { startSession(); } }, delay);
        } else { log('Max reconnection attempts reached. Please start a new session.', 'ERROR'); setStatus('ERROR'); setIsSessionActive(false); }
      };
      log('Requesting microphone access with echo cancellation...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      log('Microphone access granted with echo cancellation enabled.', 'INFO');
      stream.getTracks().forEach(track => {
        track.onended = () => { log('Microphone stream track ended unexpectedly.', 'ERROR'); if (isSessionActiveRef.current) { handleReconnect(); } };
      });
      const callbacks = {
        onopen: () => {
          (async () => {
            log('Connection opened successfully.', 'INFO');
            reconnectAttemptsRef.current = 0;
            setStatus('LISTENING');
            log('Setting up audio processing pipeline...');
            if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
              inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
              log('Input AudioContext created.');
            }
            const ctx = inputAudioContextRef.current;
            const workletCode = `class RecorderProcessor extends AudioWorkletProcessor { process(inputs, outputs, parameters) { const inputChannelData = inputs[0][0]; if (inputChannelData) { this.port.postMessage(inputChannelData.slice(0)); } return true; } } registerProcessor('recorder-processor', RecorderProcessor);`;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            log('AudioWorklet code prepared.');
            try { await ctx.audioWorklet.addModule(blobUrl); log('AudioWorklet module added.'); } catch (e) { log(`FATAL: Error loading audio worklet: ${(e as Error).message}`, 'ERROR'); setStatus('ERROR'); return; } finally { URL.revokeObjectURL(blobUrl); }
            mediaStreamSourceRef.current = ctx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(ctx, 'recorder-processor');
            audioWorkletNodeRef.current = workletNode;
            log('AudioWorkletNode created.');
            workletNode.port.onmessage = (event) => {
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  if (session?.ws && session.ws.readyState !== 1) {
                    log('sendRealtimeInput aborted: WebSocket not OPEN (state=' + session.ws.readyState + ')', 'ERROR');
                    stopSession();
                    return;
                  }
                  try {
                    session.sendRealtimeInput({ media: createBlob(event.data) });
                  } catch (e) {
                    log('WebSocket sendRealtimeInput fatal error: ' + (e.message || e), 'ERROR');
                    stopSession();
                  }
                });
              }
            };
            mediaStreamSourceRef.current.connect(workletNode);
            log('Microphone stream connected to AudioWorklet.');
            if (keepAliveIntervalRef.current) window.clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = window.setInterval(() => {
                sessionPromiseRef.current?.then(session => {
                    if (session?.ws && session.ws.readyState !== 1) {
                      log('Keep-alive skipped: ws not OPEN', 'INFO');
                      return;
                    }
                    const silentBlob = createBlob(new Float32Array(160)); 
                    session.sendRealtimeInput({ media: silentBlob });
                });
                log('Sent keep-alive packet.', 'DEBUG');
            }, 20000);
            log('Keep-alive interval started.');
          })().catch(e => { log(`FATAL: Error in onopen async setup: ${(e as Error).message}`, 'ERROR'); setStatus('ERROR'); });
        },
        onmessage: async (message: LiveServerMessage) => {
          const messageType = Object.keys(message.serverContent || {}).join(', ') || 'unknown';
          log(`Received message from server. Type: ${messageType}`, 'DEBUG');
          if (message.serverContent?.interrupted) {
             log('User interruption signal received from server. Stopping playback.', 'INFO');
             stopPlayback();
             setStatus('LISTENING');
             setTranscript(prev => { const newTranscript = [...prev]; const last = newTranscript[newTranscript.length - 1]; if (last?.speaker === 'Gemini' && !last.isFinal) { last.isFinal = true; } return newTranscript; });
          }
          if (message.serverContent?.inputTranscription) {
            const { text } = message.serverContent.inputTranscription;
            setTranscript(prev => { const newTranscript = [...prev]; const last = newTranscript[newTranscript.length - 1]; if (last?.speaker === 'You' && !last.isFinal) { last.text += text; } else { newTranscript.push({ speaker: 'You', text, isFinal: false }); } return newTranscript; });
          }
          if (message.serverContent?.outputTranscription) {
            const { text } = message.serverContent.outputTranscription;
            setTranscript(prev => { const newTranscript = [...prev]; const last = newTranscript[newTranscript.length - 1]; if (last?.speaker === 'Gemini' && !last.isFinal) { last.text += text; } else { newTranscript.push({ speaker: 'Gemini', text, isFinal: false }); } return newTranscript; });
          }
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) { log(`Received audio chunk, size: ${base64Audio.length} bytes.`, 'DEBUG'); setStatus('SPEAKING'); await playAudio(base64Audio); }
          if (message.serverContent?.turnComplete) { log('Turn complete signal received.', 'INFO'); setTranscript(prev => prev.filter(entry => entry.text.trim() !== '').map(entry => ({ ...entry, isFinal: true }))); if (onResponseComplete) { onResponseComplete(); } }
        },
        onerror: async (e: ErrorEvent) => {
          log(`Session error: ${e.message}.`, 'ERROR');
          const permanentErrors = ['permission', 'API key', 'quota', 'billing', 'PERMISSION_DENIED', 'UNAUTHENTICATED', '429', 'rate limit'];
          const isPermanentError = permanentErrors.some(err => e.message.toLowerCase().includes(err.toLowerCase()));
          if (isPermanentError) {
              log('Permanent error detected. Halting reconnection attempts.', 'ERROR');
              log('Please check your custom API key in settings, or ensure the default key has the "Generative Language API" enabled in its Google Cloud project.', 'INFO');
              await stopSession();
              setStatus('ERROR');
          } else {
            await handleReconnect();
          }
        },
        onclose: async (e: CloseEvent) => {
          log(`Session closed remotely. Code: ${e.code}, Reason: "${e.reason}", Was Clean: ${e.wasClean}`, 'INFO');
          if (!isSessionActiveRef.current) { log('onclose triggered for an intentionally stopped session. No further action needed.'); return; }
          if (!e.wasClean) { await handleReconnect(); } else { log('Session closed cleanly by server. Returning to idle state.', 'INFO'); await stopSession(); }
        },
      };
      const historyText = transcript.slice(-10).map(t => `${t.speaker}: ${t.text}`).join('\n');
      const contextInstruction = historyText ? `\n\nPREVIOUS CONVERSATION HISTORY:\n${historyText}` : '';
      const finalSystemInstruction = `${TURN_TAKING_INSTRUCTION}\n\n${selectedAssistant.prompt || ''}${contextInstruction}`;
      const liveConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
        systemInstruction: finalSystemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };
      log(`Connecting to Gemini Live API with config: ${JSON.stringify({ ...liveConfig, systemInstruction: '...' })}`);
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: liveConfig,
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      log(`FATAL: Failed to start session: ${errorMessage}`, 'ERROR');
      if (errorMessage.includes('permission denied')) { log('Please grant microphone permissions in your browser settings.', 'INFO'); }
      setStatus('ERROR');
      setIsSessionActive(false);
    }
  }, [ai, selectedAssistant, selectedVoice, log, setTranscript, onResponseComplete, playAudio, stopPlayback]);

  useEffect(() => {
    log('🎤 useLiveSession effect mounted');
    return () => {
      if (isSessionActiveRef.current) {
        log('Component unmounting, ensuring session is stopped.');
        // Call cleanup directly without depending on stopSession to avoid re-renders
        (async () => {
          if (keepAliveIntervalRef.current) {
            window.clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
            log('Keep-alive interval cleared.');
          }

          if (sessionPromiseRef.current) {
            log('Closing existing session...');
            try {
              const session = await sessionPromiseRef.current;
              if (session?.ws && session.ws.readyState !== 3 && session.ws.readyState !== 2) {
                session.ws.close();
              }
              session.close();
              log('Session.close() called.');
            } catch (e) {
              log(`Error closing session: ${(e as Error).message}`, 'ERROR');
            }
            sessionPromiseRef.current = null;
          }

          if (audioWorkletNodeRef.current) {
            log('Disconnecting AudioWorklet...');
            audioWorkletNodeRef.current.port.onmessage = null;
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
          }
          if (mediaStreamSourceRef.current) {
            log('Disconnecting media stream source...');
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
          }
          if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            log('Closing input audio context...');
            await inputAudioContextRef.current.close().catch(e => log(`Error closing input audio context: ${e.message}`, 'ERROR'));
            inputAudioContextRef.current = null;
          }
          if (wakeLockRef.current) {
            log('Releasing screen wake lock...');
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            log('Screen Wake Lock released.');
          }

          setIsSessionActive(false);
          setStatus('IDLE');
          log('Session cleanup completed.');
        })();
      }
    };
  }, [log]);

  const sendTextMessage = useCallback(async (text: string) => {
    log('Text messaging not implemented in live session', 'ERROR');
    return false;
  }, [log]);

  return { 
    status, 
    startSession, 
    stopSession, 
    isSessionActive, 
    setStatus,
    sendTextMessage,
  };
};
