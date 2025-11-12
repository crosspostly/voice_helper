import { useEffect, useRef, useState } from 'react';
import { useLogger } from './useLogger';

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

// Type conflicts resolved by casting to any

export const useWakeLock = () => {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const { log } = useLogger();

  const requestWakeLock = async () => {
    try {
      // Modern Wake Lock API (Android Chrome, Edge, Firefox)
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        log('[Wake Lock] Screen Wake Lock activated', 'INFO');
        
        wakeLockRef.current.addEventListener('release', () => {
          log('[Wake Lock] Screen Wake Lock released', 'DEBUG');
        });
        
        setIsActive(true);
      }
    } catch (err) {
      log(`[Wake Lock] Error requesting Screen Wake Lock: ${err}`, 'WARN');
    }

    // iOS fallback: silent audio trick (works even with screen locked)
    if (!silentAudioRef.current) {
      silentAudioRef.current = document.createElement('audio');
      
      // Minimal MP3 silence (base64 encoded ~100ms silence)
      silentAudioRef.current.src = 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
      silentAudioRef.current.loop = true;
      silentAudioRef.current.volume = 0.001; // ~inaudible
      
      try {
        await silentAudioRef.current.play();
        log('[Wake Lock] iOS silent audio loop started', 'INFO');
      } catch (err) {
        log(`[Wake Lock] iOS silent audio failed: ${err}`, 'WARN');
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        log('[Wake Lock] Screen Wake Lock released', 'INFO');
        wakeLockRef.current = null;
      } catch (err) {
        log(`[Wake Lock] Error releasing: ${err}`, 'WARN');
      }
    }
    
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.currentTime = 0;
      silentAudioRef.current = null;
      log('[Wake Lock] iOS silent audio stopped', 'DEBUG');
    }
    
    setIsActive(false);
  };

  // Auto-restore Wake Lock if app comes to foreground
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive) {
        log('[Wake Lock] App returned to foreground, restoring...', 'INFO');
        await requestWakeLock();
      } else if (document.visibilityState === 'hidden') {
        log('[Wake Lock] App moved to background', 'DEBUG');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        releaseWakeLock();
      }
    };
  }, []);

  return { requestWakeLock, releaseWakeLock, isActive };
};