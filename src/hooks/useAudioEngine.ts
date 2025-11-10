import { useState, useRef, useCallback, useEffect } from 'react';
import { decode, decodeAudioData } from '../services/audioUtils';

interface UseAudioEngineOptions {
  sampleRate?: number;
  numChannels?: number;
}

interface UseAudioEngineReturn {
  // State
  isPlaying: boolean;
  
  // Actions
  playBase64Audio: (base64Audio: string, options?: AudioPlayOptions) => Promise<void>;
  playText: (text: string, voice?: string) => Promise<void>;
  stopAll: () => void;
  attachOnEnded: (callback: () => void) => () => void;
  
  // Internal refs (exposed for compatibility)
  audioContextRef: React.MutableRefObject<AudioContext | null>;
}

interface AudioPlayOptions {
  startTime?: number;
  volume?: number;
}

/**
 * Hook for managing Web Audio API playback and TTS
 */
export function useAudioEngine(options: UseAudioEngineOptions = {}): UseAudioEngineReturn {
  const { sampleRate = 24000, numChannels = 1 } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const onEndedCallbacksRef = useRef<Set<() => void>>(new Set());

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Resume context if suspended (common in browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    }
    return audioContextRef.current;
  }, []);

  // Update playing state based on active sources
  const updatePlayingState = useCallback(() => {
    const activeSources = Array.from(sourcesRef.current).filter(
      source => source.playbackState !== 'finished'
    );
    setIsPlaying(activeSources.length > 0);
    
    // Trigger on-ended callbacks if no more sources are playing
    if (activeSources.length === 0) {
      onEndedCallbacksRef.current.forEach(callback => callback());
    }
  }, []);

  // Play base64 encoded audio
  const playBase64Audio = useCallback(async (
    base64Audio: string,
    options: AudioPlayOptions = {}
  ): Promise<void> => {
    try {
      const ctx = await getAudioContext();
      const { startTime, volume = 1.0 } = options;

      // Decode base64 to audio data
      const audioData = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, sampleRate, numChannels);

      // Calculate start time for queuing
      const actualStartTime = startTime !== undefined 
        ? startTime 
        : Math.max(ctx.currentTime, nextStartTimeRef.current);

      // Create and configure source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create gain node for volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      
      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Track source for interruption
      sourcesRef.current.add(source);

      // Handle source end
      source.onended = () => {
        sourcesRef.current.delete(source);
        updatePlayingState();
      };

      // Start playback
      source.start(actualStartTime);
      nextStartTimeRef.current = actualStartTime + audioBuffer.duration;
      
      updatePlayingState();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      throw error;
    }
  }, [getAudioContext, sampleRate, numChannels, updatePlayingState]);

  // Generate speech using TTS (placeholder - would integrate with GeminiService)
  const playText = useCallback(async (text: string, voice?: string): Promise<void> => {
    // This would integrate with GeminiService.generateSpeech
    // For now, we'll create a simple implementation
    try {
      // In a real implementation, this would call the TTS service
      const audioBase64 = await generateSpeechFromText(text, voice);
      await playBase64Audio(audioBase64);
    } catch (error) {
      console.error('Error playing text:', error);
      throw error;
    }
  }, [playBase64Audio]);

  // Stop all playback
  const stopAll = useCallback(() => {
    if (sourcesRef.current.size > 0) {
      sourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Ignore errors from stopping a source that hasn't started yet
        }
      });
      sourcesRef.current.clear();
    }
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
  }, []);

  // Attach on-ended callback
  const attachOnEnded = useCallback((callback: () => void) => {
    onEndedCallbacksRef.current.add(callback);
    
    // Return cleanup function
    return () => {
      onEndedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Generate silent audio for wake lock (mobile)
  const generateSilentAudio = useCallback((duration: number = 0.1): string => {
    const samples = Math.floor(sampleRate * duration);
    const silentData = new Int16Array(samples);
    const bytes = new Uint8Array(silentData.buffer);
    return btoa(String.fromCharCode(...bytes));
  }, [sampleRate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopAll]);

  return {
    isPlaying,
    playBase64Audio,
    playText,
    stopAll,
    attachOnEnded,
    audioContextRef,
  };
}

// Placeholder TTS function - would be replaced with actual GeminiService integration
async function generateSpeechFromText(text: string, voice?: string): Promise<string> {
  // This is a placeholder implementation
  // In production, this would call GeminiService.generateSpeech
  throw new Error('TTS not implemented - integrate with GeminiService.generateSpeech');
}