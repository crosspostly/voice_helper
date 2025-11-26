interface VoiceSample {
  voiceName: string;
  base64Audio: string;
  timestamp: number;
}

class VoiceSampleCache {
  private cacheKey = 'voiceSamples';
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private timestampCounter = 0;

  // Get cached sample for a voice
  getSample(voiceName: string): string | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const samples: VoiceSample[] = JSON.parse(cached);
      const sample = samples.find(s => s.voiceName === voiceName);
      
      if (!sample) return null;
      
      // Check if sample is too old
      if (Date.now() - sample.timestamp > this.maxAge) {
        this.removeSample(voiceName);
        return null;
      }
      
      return sample.base64Audio;
    } catch (error) {
      console.error('Error getting cached voice sample:', error);
      return null;
    }
  }

  // Save sample for a voice
  setSample(voiceName: string, base64Audio: string): void {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      const samples: VoiceSample[] = cached ? JSON.parse(cached) : [];
      
      // Remove existing sample for this voice
      const filteredSamples = samples.filter(s => s.voiceName !== voiceName);
      
      // Add new sample
      filteredSamples.push({
        voiceName,
        base64Audio,
        timestamp: Date.now() + this.timestampCounter++
      });
      
      // Keep only the most recent 20 samples to manage storage
      const limitedSamples = filteredSamples
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);
      
      localStorage.setItem(this.cacheKey, JSON.stringify(limitedSamples));
    } catch (error) {
      console.error('Error caching voice sample:', error);
    }
  }

  // Remove sample for a voice
  removeSample(voiceName: string): void {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return;

      const samples: VoiceSample[] = JSON.parse(cached);
      const filteredSamples = samples.filter(s => s.voiceName !== voiceName);
      localStorage.setItem(this.cacheKey, JSON.stringify(filteredSamples));
    } catch (error) {
      console.error('Error removing cached voice sample:', error);
    }
  }

  // Get all cached voice names
  getCachedVoiceNames(): string[] {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return [];

      const samples: VoiceSample[] = JSON.parse(cached);
      return samples.map(s => s.voiceName);
    } catch (error) {
      console.error('Error getting cached voice names:', error);
      return [];
    }
  }

  // Clear all cached samples
  clearCache(): void {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.error('Error clearing voice sample cache:', error);
    }
  }

  // Get cache size in bytes (approximate)
  getCacheSize(): number {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      return cached ? cached.length : 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }
}

export const voiceSampleCache = new VoiceSampleCache();
export type { VoiceSample };