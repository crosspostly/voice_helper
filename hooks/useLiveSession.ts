import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { createBlob } from '../services/audioUtils';
import { Assistant, Transcript } from '../types';

export type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR' | 'PROCESSING' | 'RECONNECTING';

interface UseLiveSessionProps {
  selectedAssistant: Assistant;
  selectedVoice: string;
  getAi: () => GoogleGenAI;
  setTranscript: React.Dispatch<React.SetStateAction<Transcript[]>>;
  playAudio: (base64Audio: string) => Promise<void>;
  log: (message: string) => void;
}

export const useLiveSession = ({
  selectedAssistant,
  selectedVoice,
  getAi,
  setTranscript,
  playAudio,
  log,
}: UseLiveSessionProps) => {
  const [status, setStatus] = useState<Status>('IDLE');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const muteGainNodeRef = useRef<GainNode | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isSessionActiveRef = useRef(false);

  const stopSession = useCallback(async (isRestarting = false) => {
    log('Stopping session...');
    isSessionActiveRef.current = false;
    
    if (keepAliveIntervalRef.current) {
        window.clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
    }

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        log(`Error closing session: ${(e as Error).message}`);
      }
      sessionPromiseRef.current = null;
    }

    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        log('Microphone stream stopped.');
    }

    if (muteGainNodeRef.current) {
        muteGainNodeRef.current.disconnect();
        muteGainNodeRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close().catch(e => log(`Error closing input audio context: ${e.message}`));
      inputAudioContextRef.current = null;
    }

    if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        log('Screen Wake Lock released.');
    }

    if (!isRestarting) {
        setStatus('IDLE');
        setTranscript(prev => prev.map(t => ({...t, isFinal: true})));
        log('Session stopped.');
    }
  }, [log, setTranscript]);


  const startSession = useCallback(async () => {
    if (status !== 'IDLE' && status !== 'ERROR' && status !== 'RECONNECTING') return;
    
    if (status !== 'RECONNECTING') {
        log('Starting session...');
        setStatus('CONNECTING');
    } else {
        log(`Reconnection attempt #${reconnectAttemptsRef.current}...`);
    }

    isSessionActiveRef.current = true;
    
    try {
      if (navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          log('Screen Wake Lock acquired.');
        } catch (err) {
          log(`Wake Lock request failed: ${(err as Error).message}`);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream; // Keep track of the stream to stop it later
      const ai = getAi();
      
      const handleReconnect = async () => {
        await stopSession(true); 
        if (isSessionActiveRef.current) { 
            if (reconnectAttemptsRef.current < 5) {
                reconnectAttemptsRef.current++;
                const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
                setStatus('RECONNECTING');
                log(`Connection lost. Attempting to reconnect in ${delay / 1000}s...`);
                setTimeout(() => {
                    startSession();
                }, delay);
            } else {
                log('Max reconnection attempts reached. Please start a new session.');
                setStatus('ERROR');
                isSessionActiveRef.current = false;
            }
        }
      };

      const callbacks = {
        onopen: () => {
          log('Connection opened.');
          reconnectAttemptsRef.current = 0;
          if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
            inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
          }
          const ctx = inputAudioContextRef.current;
          mediaStreamSourceRef.current = ctx.createMediaStreamSource(stream);
          scriptProcessorRef.current = ctx.createScriptProcessor(4096, 1, 1);
          
          muteGainNodeRef.current = ctx.createGain();
          muteGainNodeRef.current.gain.value = 0;

          mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(muteGainNodeRef.current);
          muteGainNodeRef.current.connect(ctx.destination);

          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          if (keepAliveIntervalRef.current) window.clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = window.setInterval(() => {
              sessionPromiseRef.current?.then(session => {
                  const silentBlob = createBlob(new Float32Array(160)); 
                  session.sendRealtimeInput({ media: silentBlob });
              });
          }, 20000);

          setStatus('LISTENING');
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.interrupted) {
             log('User interrupted Gemini.');
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
              setStatus('SPEAKING');
              await playAudio(base64Audio);
          }
      
          if (message.serverContent?.turnComplete) {
              setTranscript(prev => prev
                  .filter(entry => entry.text.trim() !== '') 
                  .map(entry => ({ ...entry, isFinal: true }))
              );
          }
        },
        onerror: (e: ErrorEvent) => {
          log(`Session error: ${e.message}`);
          handleReconnect();
        },
        onclose: (e: CloseEvent) => {
          log('Session closed.');
          handleReconnect();
        },
      };

      const liveConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        },
        systemInstruction: selectedAssistant.prompt || '',
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: liveConfig,
      });

    } catch (err) {
      log(`Failed to start session: ${(err as Error).message}`);
      setStatus('ERROR');
      isSessionActiveRef.current = false;
    }
  }, [status, getAi, selectedAssistant, stopSession, playAudio, selectedVoice, log, setTranscript]);

  // Effect to clean up on component unmount
  useEffect(() => {
    return () => {
      if (isSessionActiveRef.current) {
        stopSession();
      }
    };
  }, [stopSession]);

  return { status, startSession, stopSession, isSessionActive: isSessionActiveRef.current, setStatus };
};