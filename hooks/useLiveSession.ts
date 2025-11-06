
import { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob } from '../services/audioUtils';
import { Assistant, Transcript } from '../types';

export type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR' | 'PROCESSING' | 'RECONNECTING';

interface UseLiveSessionProps {
  selectedAssistant: Assistant;
  selectedVoice: string;
  getAi: () => GoogleGenAI;
  // Fix: Use imported Dispatch and SetStateAction types directly to avoid namespace errors.
  setTranscript: Dispatch<SetStateAction<Transcript[]>>;
  transcript: Transcript[];
  playAudio: (base64Audio: string) => Promise<void>;
  stopPlayback: () => void;
  log: (message: string, level?: 'INFO' | 'ERROR' | 'DEBUG') => void;
}

const TURN_TAKING_INSTRUCTION = "Crucial rule: Your primary function is to be an active listener. Never interrupt the user while they are speaking. Wait for a clear pause in their speech before you begin to respond. Your responses should be timely but not rushed.";

export const useLiveSession = ({
  selectedAssistant,
  selectedVoice,
  getAi,
  setTranscript,
  transcript,
  playAudio,
  stopPlayback,
  log,
}: UseLiveSessionProps) => {
  const [status, setStatus] = useState<Status>('IDLE');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isSessionActiveRef = useRef(false);

  const stopSession = useCallback(async (isRestarting = false) => {
    log(`stopSession called. isRestarting: ${isRestarting}`);
    
    // A user-initiated stop should prevent any pending reconnects.
    // A stop for the purpose of restarting should not; it's part of the process.
    if (!isRestarting) {
      isSessionActiveRef.current = false;
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
    if (status !== 'IDLE' && status !== 'ERROR' && status !== 'RECONNECTING') {
      log(`startSession called with invalid status: ${status}. Aborting.`, 'INFO');
      return;
    }
    
    if (status !== 'RECONNECTING') {
        log('Starting new session...', 'INFO');
        setStatus('CONNECTING');
    } else {
        log(`Reconnection attempt #${reconnectAttemptsRef.current + 1}...`, 'INFO');
    }

    isSessionActiveRef.current = true;
    
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
        // Fix: Added a guard to prevent reconnection attempts when the session was intentionally stopped by the user.
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
                // Ensure we don't try to reconnect if user has stopped it in the meantime
                if (isSessionActiveRef.current) {
                    startSession();
                }
            }, delay);
        } else {
            log('Max reconnection attempts reached. Please start a new session.', 'ERROR');
            setStatus('ERROR');
            isSessionActiveRef.current = false;
        }
      };

      log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('Microphone access granted.', 'INFO');
      
      // Fix: Added a listener to handle unexpected microphone track endings. This prevents the app from getting stuck
      // in a non-responsive 'Listening' state by triggering the reconnect logic if the audio source is lost.
      stream.getTracks().forEach(track => {
        track.onended = () => {
            log('Microphone stream track ended unexpectedly.', 'ERROR');
            if (isSessionActiveRef.current) {
                handleReconnect();
            }
        };
      });

      const ai = getAi();

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
                // Fix: Changed log level to 'DEBUG' to avoid cluttering the UI in normal mode.
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
          // Fix: Changed log level to 'DEBUG' to avoid cluttering the UI in normal mode.
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
              // Fix: Changed log level to 'DEBUG' to avoid cluttering the UI in normal mode.
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
          // Fix: Added specific handling for permission errors. Retrying is futile if the API key is invalid,
          // so the session is stopped immediately and a descriptive error is logged, improving user feedback
          // and preventing the app from getting stuck in a reconnection loop.
          if (e.message.includes('permission')) {
              log('This may be an API key issue. Halting reconnection attempts.', 'ERROR');
              log('Please check your custom API key in settings, or ensure the default key has the "Generative Language API" enabled in its Google Cloud project.', 'INFO');
              await stopSession();
              setStatus('ERROR');
          } else {
            await handleReconnect();
          }
        },
        onclose: async (e: CloseEvent) => {
          log(`Session closed remotely. Code: ${e.code}, Reason: "${e.reason}", Was Clean: ${e.wasClean}`, 'INFO');

          // Fix: Smarter reconnection logic. The app now only attempts to reconnect if the session
          // was active and closed unexpectedly (uncleanly). This prevents reconnection loops when the user
          // manually stops the session or when the server closes it cleanly (e.g., due to a timeout).
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
        .slice(-10) // Limit to last 10 turns to keep prompt reasonable
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');
    
      const contextInstruction = historyText 
        ? `\n\nPREVIOUS CONVERSATION HISTORY:\n${historyText}`
        : '';
        
      const finalSystemInstruction = `${TURN_TAKING_INSTRUCTION}\n\n${selectedAssistant.prompt || ''}${contextInstruction}`;

      const liveConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        },
        systemInstruction: finalSystemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };
      
      // Fix: The `log` function expects a single string argument. The original code passed two arguments, causing a type error. This has been corrected by concatenating the arguments into a single template literal string.
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
      isSessionActiveRef.current = false;
    }
  }, [status, getAi, selectedAssistant, stopSession, playAudio, stopPlayback, selectedVoice, log, setTranscript, transcript]);

  // Effect to clean up on component unmount
  useEffect(() => {
    return () => {
      if (isSessionActiveRef.current) {
        log('Component unmounting, ensuring session is stopped.');
        stopSession();
      }
    };
  }, [stopSession]);

  return { status, startSession, stopSession, isSessionActive: isSessionActiveRef.current, setStatus };
};
