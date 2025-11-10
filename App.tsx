import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Chat, Modality, Content } from '@google/genai';
import { Transcript, Assistant } from './types';
import { decode, decodeAudioData } from './services/audioUtils';
import { useLiveSession, Status } from './hooks/useLiveSession';
import { StatusIndicator } from './components/StatusIndicator';
import { SettingsModal } from './components/SettingsModal';
import { PersonaInfoModal } from './components/PersonaInfoModal';

// ——— ADDED FOR WAKE LOCK & BACKGROUND AUDIO SUPPORT ———
let wakeLock = null;
const requestWakeLock = async (logFn = (..._args) => {}) => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      logFn('Screen Wake Lock активирован', 'INFO');
      wakeLock.addEventListener('release', () => {
        logFn('Screen Wake Lock released', 'INFO');
      });
    }
  } catch (err) {
    logFn(`Wake Lock ошибка: ${err.name}, ${err.message}`, 'ERROR');
  }
};
// ————————————————————————————————

type Language = 'en' | 'ru';
type PersonaView = 'select' | 'edit' | 'add';

const DEFAULT_GEMINI_API_KEY = 'AIzaSyCrPJN5yn3QAmHEydsmQ8XK_vQPCJvamSA';

const useGemini = (customApiKey: string | null) => {
  return useMemo(() => {
    const apiKey = customApiKey || DEFAULT_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is missing. Please provide one in the settings or environment variables.");
      return null;
    }
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e);
      return null;
    }
  }, [customApiKey]);
};

// ... остальные константы и функции остаются БЕЗ изменений ...

export const App: React.FC = () => {
  // ... state, useRef и все остальные переменные ...

  // ———--- BEGIN: BACKGROUND AUDIO + WAKE LOCK ———---
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Создаём аудио элемент для обхода блокировки iOS
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.muted = true;
    // Генерируем тихий звук (0.1 секунда тишины, формат base64 MP3)
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4SXkUZBAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQxA8DwAABpAAAACAAADSAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    audio.setAttribute('aria-hidden', 'true');
    audio.style.display = 'none';
    document.body.appendChild(audio);
    silentAudioRef.current = audio;
    return () => { audio.pause(); audio.remove(); };
  }, []);

  // BACKGROUND RESTORE WAKE LOCK + AUDIO CONTEXT:
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (outputAudioContextRef.current?.state === 'suspended') {
          await outputAudioContextRef.current.resume();
          log('AudioContext resumed', 'INFO');
        }
        // Wake lock (повторно при возврате)
        if (!(wakeLock && !wakeLock.released)) {
          await requestWakeLock(log);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, []);

  // Hook-in to voice session start to activate all hacks:
  const originalStartSession = useLiveSession({ /* ... */ }).startSession;
  const patchStartSession = useCallback(async (...args) => {
    // iOS/Android: play silent audio
    if (silentAudioRef.current) {
      try { await silentAudioRef.current.play(); log('Silent audio element started', 'INFO'); } catch { /* ignore */ }
    }
    // Wake lock
    await requestWakeLock(log);
    // Продолжаем обычный старт
    originalStartSession(...args);
  }, [originalStartSession, log]);

  // Заменяем startSession по месту вызова на patchStartSession ниже

  // ... остальной render и экспорт ...
}

export default App;
