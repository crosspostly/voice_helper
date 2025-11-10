import { useState, useCallback, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';
import { useLogger } from './useLogger';

export type Language = 'en' | 'ru';

interface I18nRecord {
  [key: string]: string;
}

interface LanguageData {
  [lang: string]: I18nRecord;
}

interface UseLanguageManagerReturn {
  locale: Language;
  setLocale: (locale: Language) => void;
  strings: I18nRecord;
  t: (key: string, fallback?: string) => string;
  availableLanguages: Language[];
}

// Default I18N data - in a real app this would be loaded from separate files
const DEFAULT_I18N: LanguageData = {
  en: {
    title: "Live Voice Assistant",
    accessGrok: "Access Grok",
    personaTitle: "Assistant Persona",
    selectPersona: "Select a Persona",
    voiceSelection: "Voice",
    speechRate: "Speech Rate",
    speechPitch: "Speech Pitch",
    saveConversation: "Save Conversation",
    copyText: "Copy Text",
    saveAsPdf: "Save as PDF",
    copied: "Copied!",
    startMessage: "Press the mic to begin conversation.",
    speakNow: "Speak Now",
    you: "You",
    gemini: "Gemini",
    sendMessage: "Send Message",
    updateSettings: "Update Settings",
    status_IDLE: "Ready",
    status_CONNECTING: "Connecting...",
    status_LISTENING: "Listening...",
    status_SPEAKING: "Gemini Speaking...",
    status_PROCESSING: "Processing...",
    status_RECONNECTING: "Reconnecting...",
    status_ERROR: "Error",
    // Add more English strings as needed
  },
  ru: {
    title: "Голосовой Ассистент",
    accessGrok: "Доступ к Grok",
    personaTitle: "Персона Ассистента",
    selectPersona: "Выберите Персону",
    voiceSelection: "Голос",
    speechRate: "Скорость Речи",
    speechPitch: "Высота Голоса",
    saveConversation: "Сохранить Разговор",
    copyText: "Копировать Текст",
    saveAsPdf: "Сохранить как PDF",
    copied: "Скопировано!",
    startMessage: "Нажмите на микрофон, чтобы начать разговор.",
    speakNow: "Говорите",
    you: "Вы",
    gemini: "Gemini",
    sendMessage: "Отправить Сообщение",
    updateSettings: "Обновить Настройки",
    status_IDLE: "Готов",
    status_CONNECTING: "Подключение...",
    status_LISTENING: "Слушаю...",
    status_SPEAKING: "Gemini Говорит...",
    status_PROCESSING: "Обработка...",
    status_RECONNECTING: "Переподключение...",
    status_ERROR: "Ошибка",
    // Add more Russian strings as needed
  },
};

/**
 * Hook for managing language localization with persistence
 */
export function useLanguageManager(): UseLanguageManagerReturn {
  const { log } = useLogger({ enablePersistence: false });
  
  // Get browser locale as fallback
  const getBrowserLocale = useCallback((): Language => {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang.startsWith('ru')) {
      return 'ru';
    }
    return 'en';
  }, []);

  // Persistent locale state
  const [locale, setLocaleState] = usePersistentState<Language>(
    'language',
    getBrowserLocale()
  );

  // Set locale with validation
  const setLocale = useCallback((newLocale: Language) => {
    if (['en', 'ru'].includes(newLocale)) {
      setLocaleState(newLocale);
      log(`Language changed to: ${newLocale}`, 'DEBUG');
    } else {
      log(`Invalid locale: ${newLocale}`, 'ERROR');
    }
  }, [setLocaleState, log]);

  // Get translation strings
  const strings = useMemo(() => {
    return DEFAULT_I18N[locale] || DEFAULT_I18N.en;
  }, [locale]);

  // Translation function with fallback
  const t = useCallback((key: string, fallback?: string): string => {
    if (strings[key]) {
      return strings[key];
    }
    
    // Try fallback language (English)
    if (locale !== 'en' && DEFAULT_I18N.en[key]) {
      log(`Missing translation for key "${key}" in locale "${locale}", using English fallback`, 'WARN');
      return DEFAULT_I18N.en[key];
    }
    
    // Use provided fallback or key itself
    const finalFallback = fallback || key;
    if (process.env.NODE_ENV === 'development' && !fallback) {
      log(`Missing translation for key "${key}" in all locales`, 'WARN');
    }
    return finalFallback;
  }, [strings, locale, log]);

  // Available languages
  const availableLanguages: Language[] = ['en', 'ru'];

  return {
    locale,
    setLocale,
    strings,
    t,
    availableLanguages,
  };
}