import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Modality } from '@google/genai';
import { voiceSampleCache } from '../services/voiceSampleCache';
import { AVAILABLE_VOICES } from '../src/constants/voices';

interface UseVoiceSamplePreloaderOptions {
  ai: GoogleGenAI | null;
  lang: 'en' | 'ru';
  enabled?: boolean;
}

interface VoiceSampleStatus {
  voiceName: string;
  isPreloaded: boolean;
  isPreloading: boolean;
  error?: string;
}

export const useVoiceSamplePreloader = ({ 
  ai, 
  lang, 
  enabled = true 
}: UseVoiceSamplePreloaderOptions) => {
  const [preloadingStatus, setPreloadingStatus] = useState<Record<string, VoiceSampleStatus>>({});
  const [isPreloadingAll, setIsPreloadingAll] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);
  const preloadingQueueRef = useRef<string[]>([]);
  const isPreloadingRef = useRef(false);

  // Initialize status for all voices
  useEffect(() => {
    const initialStatus: Record<string, VoiceSampleStatus> = {};
    AVAILABLE_VOICES.forEach(voice => {
      const isCached = !!voiceSampleCache.getSample(voice.name);
      initialStatus[voice.name] = {
        voiceName: voice.name,
        isPreloaded: isCached,
        isPreloading: false
      };
    });
    setPreloadingStatus(initialStatus);
    
    // Count preloaded samples
    const cachedCount = AVAILABLE_VOICES.filter(voice => 
      !!voiceSampleCache.getSample(voice.name)
    ).length;
    setPreloadedCount(cachedCount);
  }, []);

  // Generate sample for a single voice
  const generateVoiceSample = useCallback(async (voiceName: string): Promise<string | null> => {
    if (!ai) return null;

    try {
      const previewText = lang === 'ru' 
        ? "Привет! Я голосовой ассистент. Это демонстрация моего голоса."
        : "Hello! I'm a voice assistant. This is a demonstration of my voice.";
      
      const speechConfig = {
        voiceConfig: { 
          prebuiltVoiceConfig: { 
            voiceName: voiceName 
          } 
        },
      };
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: previewText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: speechConfig,
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio || null;
    } catch (error) {
      console.error(`Error generating sample for ${voiceName}:`, error);
      return null;
    }
  }, [ai, lang]);

  // Preload a single voice
  const preloadVoiceSample = useCallback(async (voiceName: string): Promise<boolean> => {
    if (!enabled || !ai) return false;

    // Check if already cached
    if (voiceSampleCache.getSample(voiceName)) {
      setPreloadingStatus(prev => ({
        ...prev,
        [voiceName]: { ...prev[voiceName], isPreloaded: true, isPreloading: false }
      }));
      return true;
    }

    // Set loading state
    setPreloadingStatus(prev => ({
      ...prev,
      [voiceName]: { ...prev[voiceName], isPreloading: true, error: undefined }
    }));

    try {
      const base64Audio = await generateVoiceSample(voiceName);
      
      if (base64Audio) {
        voiceSampleCache.setSample(voiceName, base64Audio);
        setPreloadingStatus(prev => ({
          ...prev,
          [voiceName]: { ...prev[voiceName], isPreloaded: true, isPreloading: false }
        }));
        setPreloadedCount(prev => prev + 1);
        return true;
      } else {
        throw new Error('No audio data received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPreloadingStatus(prev => ({
        ...prev,
        [voiceName]: { 
          ...prev[voiceName], 
          isPreloaded: false, 
          isPreloading: false, 
          error: errorMessage 
        }
      }));
      return false;
    }
  }, [enabled, ai, generateVoiceSample]);

  // Preload all voices (with queue to avoid overwhelming API)
  const preloadAllVoiceSamples = useCallback(async (): Promise<void> => {
    if (!enabled || !ai || isPreloadingRef.current) return;

    const voicesToPreload = AVAILABLE_VOICES.filter(voice => 
      !voiceSampleCache.getSample(voice.name)
    );

    if (voicesToPreload.length === 0) return;

    setIsPreloadingAll(true);
    isPreloadingRef.current = true;
    preloadingQueueRef.current = voicesToPreload.map(v => v.name);

    // Process queue with delay between requests
    for (const voiceName of preloadingQueueRef.current) {
      if (!enabled || !ai) break; // Check if still enabled
      
      await preloadVoiceSample(voiceName);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsPreloadingAll(false);
    isPreloadingRef.current = false;
    preloadingQueueRef.current = [];
  }, [enabled, ai, preloadVoiceSample]);

    // Play cached sample
  const playCachedSample = useCallback(async (voiceName: string): Promise<boolean> => {
    const base64Audio = voiceSampleCache.getSample(voiceName);
    
    if (!base64Audio) {
      // If not cached, try to generate it
      const success = await preloadVoiceSample(voiceName);
      if (!success) return false;
      
      // Try again after caching
      const newBase64Audio = voiceSampleCache.getSample(voiceName);
      if (!newBase64Audio) return false;
      
      return playAudioFromBase64(newBase64Audio);
    }
    
    return playAudioFromBase64(base64Audio);
  }, [preloadVoiceSample]);

  // Helper to play base64 audio
  const playAudioFromBase64 = useCallback(async (base64Audio: string): Promise<boolean> => {
    try {
      // Dynamic import to avoid circular dependencies
      const audioUtils = await import('../services/audioUtils');
      const { decode, decodeAudioData } = audioUtils;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        audioContext.close();
      };
      
      source.start();
      return true;
    } catch (error) {
      console.error('Error playing cached sample:', error);
      return false;
    }
  }, []);

  // Clear all cached samples
  const clearCache = useCallback(() => {
    voiceSampleCache.clearCache();
    
    // Reset status
    const resetStatus: Record<string, VoiceSampleStatus> = {};
    AVAILABLE_VOICES.forEach(voice => {
      resetStatus[voice.name] = {
        voiceName: voice.name,
        isPreloaded: false,
        isPreloading: false
      };
    });
    setPreloadingStatus(resetStatus);
    setPreloadedCount(0);
  }, []);

  return {
    preloadingStatus,
    isPreloadingAll,
    preloadedCount,
    totalCount: AVAILABLE_VOICES.length,
    preloadVoiceSample,
    preloadAllVoiceSamples,
    playCachedSample,
    clearCache,
    isVoicePreloaded: (voiceName: string) => !!voiceSampleCache.getSample(voiceName)
  };
};