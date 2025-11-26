import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { voiceSampleCache, VoiceSample } from '../services/voiceSampleCache';

describe('voiceSampleCache', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    voiceSampleCache.clearCache();
  });

  it('should store and retrieve voice samples', () => {
    const voiceName = 'TestVoice';
    const base64Audio = 'dGVzdCBhdWRpbyBkYXRh'; // base64 encoded "test audio data"
    
    voiceSampleCache.setSample(voiceName, base64Audio);
    
    const retrieved = voiceSampleCache.getSample(voiceName);
    expect(retrieved).toBe(base64Audio);
  });

  it('should return null for non-existent samples', () => {
    const retrieved = voiceSampleCache.getSample('NonExistentVoice');
    expect(retrieved).toBeNull();
  });

  it('should remove individual samples', () => {
    const voiceName = 'TestVoice';
    const base64Audio = 'dGVzdCBhdWRpbyBkYXRh';
    
    voiceSampleCache.setSample(voiceName, base64Audio);
    expect(voiceSampleCache.getSample(voiceName)).toBe(base64Audio);
    
    voiceSampleCache.removeSample(voiceName);
    expect(voiceSampleCache.getSample(voiceName)).toBeNull();
  });

  it('should list cached voice names', () => {
    const voices = ['Voice1', 'Voice2', 'Voice3'];
    const base64Audio = 'dGVzdCBhdWRpbyBkYXRh';
    
    voices.forEach(voice => {
      voiceSampleCache.setSample(voice, base64Audio);
    });
    
    const cachedNames = voiceSampleCache.getCachedVoiceNames();
    expect(cachedNames).toHaveLength(3);
    expect(cachedNames).toContain('Voice1');
    expect(cachedNames).toContain('Voice2');
    expect(cachedNames).toContain('Voice3');
  });

  it('should clear all cached samples', () => {
    const voices = ['Voice1', 'Voice2'];
    const base64Audio = 'dGVzdCBhdWRpbyBkYXRh';
    
    voices.forEach(voice => {
      voiceSampleCache.setSample(voice, base64Audio);
    });
    
    expect(voiceSampleCache.getCachedVoiceNames()).toHaveLength(2);
    
    voiceSampleCache.clearCache();
    expect(voiceSampleCache.getCachedVoiceNames()).toHaveLength(0);
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('Storage quota exceeded');
    };
    
    // Should not throw an error
    expect(() => {
      voiceSampleCache.setSample('TestVoice', 'data');
    }).not.toThrow();
    
    // Restore original localStorage
    localStorage.setItem = originalSetItem;
  });

  it('should limit cache to 20 most recent samples', () => {
    const base64Audio = 'dGVzdCBhdWRpbyBkYXRh';
    
    // Add 25 samples (more than the limit)
    for (let i = 1; i <= 25; i++) {
      voiceSampleCache.setSample(`Voice${i}`, base64Audio);
    }
    
    const cachedNames = voiceSampleCache.getCachedVoiceNames();
    expect(cachedNames).toHaveLength(20);
    
    // Should contain the most recent 20 voices
    expect(cachedNames).toContain('Voice25'); // Most recent
    expect(cachedNames).toContain('Voice6');  // 20th most recent
    
    // Should NOT contain the oldest 5 voices
    expect(cachedNames).not.toContain('Voice1');
    expect(cachedNames).not.toContain('Voice2');
    expect(cachedNames).not.toContain('Voice3');
    expect(cachedNames).not.toContain('Voice4');
    expect(cachedNames).not.toContain('Voice5');
  });

  it('should provide cache size information', () => {
    const base64Audio = 'dGVzdCBhdWRpbyBkYXRh';
    
    expect(voiceSampleCache.getCacheSize()).toBe(0);
    
    voiceSampleCache.setSample('TestVoice', base64Audio);
    
    // Cache size should be greater than 0
    expect(voiceSampleCache.getCacheSize()).toBeGreaterThan(0);
  });
});