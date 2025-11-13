import { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob } from '../services/audioUtils';
import { Assistant, Transcript } from '../types';
import { useLinguisticsSession } from './useLinguisticsSession';

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

  // Linguistics session integration
  const linguisticsSession = useLinguisticsSession({
    selectedAssistant,
    userId,
    setTranscript,
    playAudio,
    log,
  });

  // Fix: Synchronize the state with a ref. The state (`isSessionActive`) triggers
  // re-renders in the consuming component, ensuring callbacks are fresh. The ref
  // (`isSessionActiveRef`) provides immediate access to the latest value inside
  // async callbacks within this hook, preventing stale state issues.
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  const stopSession = useCallback(async (isRestarting = false) => {
    log(`🎤 stopSession called. isRestarting: ${isRestarting}, current status: ${status}`);
    
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
    log(`🎤 startSession called. Current status: ${status}`);
    if (status !== 'IDLE' && status !== 'ERROR' && status !== 'RECONNECTING') {
      log(`startSession called with invalid status: ${status}. Aborting.`, 'INFO');
      return;
    }

    if (!selectedAssistant) {
      log('Cannot start session: No assistant selected', 'ERROR');
      setStatus('ERROR');
      return;
    }

    // Check if this is a linguistics assistant
    if (linguisticsSession.isLinguisticsAssistant) {
      log('Starting linguistics session instead of Gemini Live', 'INFO');
      
      // Stop any existing audio session
      await stopSession();
      
      // Start linguistics session
      const success = await linguisticsSession.startSession();
      if (success) {
        setStatus('PROCESSING'); // Use processing state for linguistics
        setIsSessionActive(true);
      } else {
        setStatus('ERROR');
      }
      return;
    }

    if (!ai) {
      log('Cannot start session, Gemini AI not initialized.', 'ERROR');
      setStatus('ERROR');
      return;
    }
    
    if (status !== 'RECONNECTING') {
        log('Starting new session...', 'INFO');
        setStatus('CONNECTING');
    } else {
        log(`Reconnection attempt #${reconnectAttemptsRef.current + 1}...`, 'INFO');
    }

    setIsSessionActive(true);
    
    try {
      if (navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          log('Screen Wake Lock acquired.');
        } catch (err) {
          log(`Wake Lock request failed: ${(err as Error).message}. This is non-critical.`, 'INFO');
        }
      }
      
      const handleReconnect = async () => {
        if (!isSessionActiveRef.current) {
            log('Reconnect cancelled: Session was intentionally stopped.', 'INFO');
            return;
        }

        await stopSession(true); 
        
        if (reconnectAttemptsRef.current < 5) {
            reconnectAttemptsRef.current++;
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
            setStatus('RECONNECTING');
            log(`Connection lost. Attempting to reconnect in ${delay / 1000}s...`, 'INFO');
            setTimeout(() => {
                if (isSessionActiveRef.current) {
                    startSession();
                }
            }, delay);
        } else {
            log('Max reconnection attempts reached. Please start a new session.', 'ERROR');
            setStatus('ERROR');
            setIsSessionActive(false);
        }
      };

      log('Requesting microphone access with echo cancellation...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      log('Microphone access granted with echo cancellation enabled.', 'INFO');
      
      stream.getTracks().forEach(track => {
        track.onended = () => {
            log('Microphone stream track ended unexpectedly.', 'ERROR');
            if (isSessionActiveRef.current) {
                handleReconnect();
            }
        };
      });

      const callbacks = {
        onopen: () => {
          (async () => {
            log('Connection opened successfully.', 'INFO');
            reconnectAttemptsRef.current = 0; // Reset counter on successful connection
            setStatus('LISTENING');
            log('Setting up audio processing pipeline...');
            if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
              inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
              log('Input AudioContext created.');
            }
            const ctx = inputAudioContextRef.current;
            
            const workletCode = `
              class RecorderProcessor extends AudioWorkletProcessor {
                process(inputs, outputs, parameters) {
                  const inputChannelData = inputs[0][0];
                  if (inputChannelData) {
                    this.port.postMessage(inputChannelData.slice(0));
                  }
                  return true;
                }
              }
              registerProcessor('recorder-processor', RecorderProcessor);
            `;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            log('AudioWorklet code prepared.');

            try {
              await ctx.audioWorklet.addModule(blobUrl);
              log('AudioWorklet module added.');
            } catch (e) {
              log(`FATAL: Error loading audio worklet: ${(e as Error).message}`, 'ERROR');
              setStatus('ERROR');
              return;
            } finally {
              URL.revokeObjectURL(blobUrl);
            }

            mediaStreamSourceRef.current = ctx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(ctx, 'recorder-processor');
            audioWorkletNodeRef.current = workletNode;
            log('AudioWorkletNode created.');

            workletNode.port.onmessage = (event) => {
              const pcmBlob = createBlob(event.data);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            mediaStreamSourceRef.current.connect(workletNode);
            log('Microphone stream connected to AudioWorklet.');
            
            if (keepAliveIntervalRef.current) window.clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = window.setInterval(() => {
                sessionPromiseRef.current?.then(session => {
                    const silentBlob = createBlob(new Float32Array(160)); 
                    session.sendRealtimeInput({ media: silentBlob });
                });
                log('Sent keep-alive packet.', 'DEBUG');
            }, 20000);
            log('Keep-alive interval started.');
          })().catch(e => {
            log(`FATAL: Error in onopen async setup: ${(e as Error).message}`, 'ERROR');
            setStatus('ERROR');
          });
        },
        onmessage: async (message: LiveServerMessage) => {
          const messageType = Object.keys(message.serverContent || {}).join(', ') || 'unknown';
          log(`Received message from server. Type: ${messageType}`, 'DEBUG');
          if (message.serverContent?.interrupted) {
             log('User interruption signal received from server. Stopping playback.', 'INFO');
             stopPlayback();
             setStatus('LISTENING');
             setTranscript(prev => {
                const newTranscript = [...prev];
                const last = newTranscript[newTranscript.length - 1];
                if (last?.speaker === 'Gemini' && !last.isFinal) {
                    last.isFinal = true;
                }
                return newTranscript;
             });
          }

          if (message.serverContent?.inputTranscription) {
            const { text } = message.serverContent.inputTranscription;
            setTranscript(prev => {
                const newTranscript = [...prev];
                const last = newTranscript[newTranscript.length - 1];
                if (last?.speaker === 'You' && !last.isFinal) {
                    last.text += text;
                } else {
                    newTranscript.push({ speaker: 'You', text, isFinal: false });
                }
                return newTranscript;
            });
          }

          if (message.serverContent?.outputTranscription) {
            const { text } = message.serverContent.outputTranscription;
            setTranscript(prev => {
                const newTranscript = [...prev];
                const last = newTranscript[newTranscript.length - 1];
                if (last?.speaker === 'Gemini' && !last.isFinal) {
                    last.text += text;
                } else {
                    newTranscript.push({ speaker: 'Gemini', text, isFinal: false });
                }
                return newTranscript;
            });
          }
          
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
              log(`Received audio chunk, size: ${base64Audio.length} bytes.`, 'DEBUG');
              setStatus('SPEAKING');
              await playAudio(base64Audio);
          }
      
          if (message.serverContent?.turnComplete) {
              log('Turn complete signal received.', 'INFO');
              setTranscript(prev => prev
                  .filter(entry => entry.text.trim() !== '') 
                  .map(entry => ({ ...entry, isFinal: true }))
              );
          }
        },
        onerror: async (e: ErrorEvent) => {
          log(`Session error: ${e.message}.`, 'ERROR');
          
          // Check for permanent errors that should not trigger reconnect
          const permanentErrors = [
            'permission', 'API key', 'quota', 'billing', 
            'PERMISSION_DENIED', 'UNAUTHENTICATED', '429', 'rate limit'
          ];
          
          const isPermanentError = permanentErrors.some(err => 
            e.message.toLowerCase().includes(err.toLowerCase())
          );
          
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

          if (!isSessionActiveRef.current) {
            log('onclose triggered for an intentionally stopped session. No further action needed.');
            return;
          }

          if (!e.wasClean) {
            await handleReconnect();
          } else {
            log('Session closed cleanly by server. Returning to idle state.', 'INFO');
            await stopSession();
          }
        },
      };

      const historyText = transcript
        .slice(-10) 
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');
    
      const contextInstruction = historyText 
        ? `\n\nPREVIOUS CONVERSATION HISTORY:\n${historyText}`
        : '';
        
      const finalSystemInstruction = `${TURN_TAKING_INSTRUCTION}\n\n${selectedAssistant?.prompt || ''}${contextInstruction}`;

      const liveConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        },
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
      if (errorMessage.includes('permission denied')) {
        log('Please grant microphone permissions in your browser settings.', 'INFO');
      }
      setStatus('ERROR');
      setIsSessionActive(false);
    }
  }, [ai, selectedAssistant, stopSession, playAudio, stopPlayback, selectedVoice, log, setTranscript, transcript]);

  useEffect(() => {
    console.log('🎤 useLiveSession effect mounted');
    return () => {
      console.log('🎤 useLiveSession effect cleanup - checking session state');
      if (isSessionActiveRef.current) {
        console.log('Component unmounting, ensuring session is stopped.');
        // Call cleanup directly without depending on stopSession to avoid re-renders
        (async () => {
          if (sessionPromiseRef.current) {
            console.log('Closing existing session...');
            try {
              const session = await sessionPromiseRef.current;
              session.close();
              console.log('Session.close() called.');
            } catch (e) {
              console.error(`Error closing session: ${(e as Error).message}`);
            }
            sessionPromiseRef.current = null;
          }

          if (audioWorkletNodeRef.current) {
            console.log('Disconnecting AudioWorklet...');
            audioWorkletNodeRef.current.port.onmessage = null;
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
          }
          if (mediaStreamSourceRef.current) {
            console.log('Disconnecting media stream source...');
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
          }
          if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            console.log('Closing input audio context...');
            await inputAudioContextRef.current.close().catch(e => console.error(`Error closing input audio context: ${e.message}`));
            inputAudioContextRef.current = null;
          }

          if (wakeLockRef.current) {
            console.log('Releasing screen wake lock...');
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            console.log('Screen Wake Lock released.');
          }

          if (keepAliveIntervalRef.current) {
            window.clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
            console.log('Keep-alive interval cleared.');
          }

          setIsSessionActive(false);
          setStatus('IDLE');
          console.log('Session cleanup completed.');
        })();
      } else {
        console.log('🎤 Cleanup: No active session to stop');
      }
    };
  }, []);

  // Function to handle text messages for linguistics assistants
  const sendTextMessage = useCallback(async (text: string) => {
    if (linguisticsSession.isLinguisticsAssistant) {
      log(`Sending text message to linguistics service: ${text.substring(0, 50)}...`, 'INFO');
      
      // Add user message to transcript
      setTranscript(prev => [...prev, {
        speaker: 'You',
        text,
        isFinal: true,
      }]);

      // Process with linguistics service
      const success = await linguisticsSession.processUtterance(text);
      if (!success) {
        log('Failed to process message with linguistics service', 'ERROR');
        setStatus('ERROR');
      }
      return success;
    }

    // For non-linguistics assistants, we would need the regular Gemini text handling
    // This is not implemented in the current hook as it focuses on audio
    log('Text messaging not implemented for non-linguistics assistants', 'ERROR');
    return false;
  }, [linguisticsSession, setTranscript, log]);

  return { 
    status, 
    startSession, 
    stopSession, 
    isSessionActive, 
    setStatus,
    sendTextMessage,
    linguisticsSession,
  };
};