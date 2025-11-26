import { useEffect, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AVAILABLE_VOICES, VOICE_NAMES } from '../src/constants/voices';

export const useAvailableVoices = (googleGenAI: GoogleGenAI | null) => {
  const [voices, setVoices] = useState<string[]>(VOICE_NAMES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!googleGenAI) return;

    const fetchVoices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the complete list of 30 available Google Gemini voices
        setVoices(VOICE_NAMES);
        console.log(`Loaded ${VOICE_NAMES.length} available Google Gemini voices`);
        
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch voices';
        setError(errorMessage);
        console.error('Error fetching voices:', err);
        // Keep fallback voices on error
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, [googleGenAI]);

  return { voices, loading, error };
};