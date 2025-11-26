import { useEffect, useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export const useAvailableVoices = (googleGenAI: GoogleGenAI | null) => {
  const [voices, setVoices] = useState<string[]>([
    'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir' // fallback voices
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!googleGenAI) return;

    const fetchVoices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Start with known working voices
        const knownVoices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
        setVoices(knownVoices);
        
        // Try to discover additional voices (limited discovery due to API constraints)
        const potentialVoices = [
          'Aria', 'Nova', 'Echo', 'Aura', 'Luna', 'Stellar', 'Orion', 'Vega'
        ];
        
        const discoveredVoices: string[] = [];
        
        // Test voices one by one with delays to respect API limits
        for (let i = 0; i < potentialVoices.length; i++) {
          const voiceName = potentialVoices[i];
          
          try {
            // Use a minimal request to test voice availability
            const response = await googleGenAI.models.generateContent({
              model: 'gemini-2.5-flash-preview-tts',
              contents: [{ parts: [{ text: '.' }] }], // minimal text
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: { 
                    prebuiltVoiceConfig: { 
                      voiceName: voiceName 
                    } 
                  },
                },
              },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              discoveredVoices.push(voiceName);
              console.log(`✓ Discovered additional voice: ${voiceName}`);
            }
          } catch (voiceError: any) {
            // Check if it's a leaked API key error
            if (voiceError?.message?.includes('leaked')) {
              console.log('API key reported as leaked, stopping voice discovery');
              setError('API key reported as leaked');
              return; // Stop trying additional voices
            }
            // Voice not available, skip it silently
            continue;
          }
          
          // Add delay between requests to be respectful to API
          if (i < potentialVoices.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (discoveredVoices.length > 0) {
          setVoices([...knownVoices, ...discoveredVoices]);
          console.log(`Successfully discovered ${discoveredVoices.length} additional voices`);
        } else {
          console.log('Using known voices as no additional voices were discovered');
        }
        
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch voices';
        
        // Check if it's a leaked API key error
        if (errorMessage?.includes('leaked')) {
          setError('API key reported as leaked');
        } else {
          setError(errorMessage);
        }
        
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