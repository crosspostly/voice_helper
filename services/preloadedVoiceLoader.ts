import { voiceSampleCache } from './voiceSampleCache';
import { AVAILABLE_VOICES } from '../src/constants/voices';

interface PreloadedVoiceSample {
  voiceName: string;
  lang: 'en' | 'ru';
  base64Audio: string;
  timestamp: number;
  text: string;
}

class PreloadedVoiceLoader {
  private loaded = false;
  private preloadedSamples: Map<string, string> = new Map();

  /**
   * Load pre-generated voice samples from static files
   * This should be called once when the application starts
   */
  async loadPreloadedSamples(): Promise<void> {
    if (this.loaded) return;

    try {
      // Try to load from public/voice-samples directory
      const samplePromises = AVAILABLE_VOICES.flatMap(voice => [
        this.loadSampleFile(voice.name, 'en'),
        this.loadSampleFile(voice.name, 'ru')
      ]);

      const results = await Promise.allSettled(samplePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`Loaded ${successCount} pre-generated voice samples`);
      this.loaded = true;
    } catch (error) {
      console.warn('Failed to load pre-generated voice samples:', error);
      this.loaded = true; // Don't retry
    }
  }

  /**
   * Load a single voice sample file
   */
  private async loadSampleFile(voiceName: string, lang: 'en' | 'ru'): Promise<void> {
    try {
      const filename = `${voiceName.toLowerCase()}_${lang}.json`;
      const response = await fetch(`/voice-samples/${filename}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const sample: PreloadedVoiceSample = await response.json();
      
      // Store in memory cache
      const cacheKey = `${voiceName}_${lang}`;
      this.preloadedSamples.set(cacheKey, sample.base64Audio);
      
      // Also store in localStorage cache for persistence
      voiceSampleCache.setSample(`${voiceName}_${lang}`, sample.base64Audio);
      
    } catch (error) {
      // Silently fail for individual files - they might not exist
      console.debug(`Could not load sample for ${voiceName} (${lang}):`, error);
    }
  }

  /**
   * Get a preloaded sample for a voice
   */
  getPreloadedSample(voiceName: string, lang: 'en' | 'ru'): string | null {
    const cacheKey = `${voiceName}_${lang}`;
    return this.preloadedSamples.get(cacheKey) || null;
  }

  /**
   * Check if a voice sample is preloaded
   */
  isVoicePreloaded(voiceName: string, lang: 'en' | 'ru' = 'en'): boolean {
    const cacheKey = `${voiceName}_${lang}`;
    return this.preloadedSamples.has(cacheKey) || !!voiceSampleCache.getSample(cacheKey);
  }

  /**
   * Get the count of preloaded samples
   */
  getPreloadedCount(): number {
    return this.preloadedSamples.size;
  }

  /**
   * Get total number of possible samples (voices × languages)
   */
  getTotalSampleCount(): number {
    return AVAILABLE_VOICES.length * 2; // English + Russian
  }
}

export const preloadedVoiceLoader = new PreloadedVoiceLoader();
export type { PreloadedVoiceSample };