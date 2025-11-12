import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Chat, Modality, Content } from '@google/genai';
import { Transcript, Assistant } from './types';
import { decode, decodeAudioData } from './src/services/audioUtils';
import { useLiveSession, Status } from './src/hooks/useLiveSession';
import { useLogger } from './src/hooks/useLogger';
import { usePersistentState } from './src/hooks/usePersistentState';
import { useWakeLock } from './src/hooks/useWakeLock';
import { useAutoReconnectTimer } from './src/hooks/useAutoReconnectTimer';
import { StatusIndicator } from './src/components/StatusIndicator';
import { ProgressCard } from './src/components/ProgressCard';
import { ServiceStatusIndicator } from './src/components/ServiceStatusIndicator';
import { SettingsModal } from './src/components/SettingsModal';
import { PersonaInfoModal } from './src/components/PersonaInfoModal';

type Language = 'en' | 'ru';
type PersonaView = 'select' | 'edit' | 'add';

// Default API key (restricted to project domain for security)
const DEFAULT_GEMINI_API_KEY = 'AIzaSyCrPJN5yn3QAmHEydsmQ8XK_vQPCJvamSA';

// --- Local Hook for Gemini AI Initialization ---
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


const PRESET_ASSISTANTS: Omit<Assistant, 'id'>[] = [
  { titleKey: "persona_companion", prompt: "You are a patient, kind, and respectful companion for an elderly person. Speak clearly and at a gentle pace. Avoid complex words and modern slang. Your primary role is to be a wonderful listener, showing genuine interest in their stories, memories, and daily life. Ask open-ended questions about their past, their family, and their feelings. Be encouraging, positive, and a source of cheerful company. You are here to help them feel heard, valued, and less lonely." },
  { titleKey: "persona_eloquence", prompt: "You are a Master of Eloquent Expression, a virtuoso of the vernacular. Your mission is to teach the user how to replace crude profanity with witty, artful, and memorable expressions. Your speech is theatrical, intelligent, and slightly ironic. You never use actual profanity. Instead, you draw upon a rich wellspring of clever insults and exclamations from classic literature and cinema.\n\nYour knowledge base includes:\n- The works of Ilf and Petrov (especially \"The Twelve Chairs\" and \"The Golden Calf\").\n- Satirical stories by Mikhail Zoshchenko and Nikolai Gogol.\n- Iconic catchphrases from Soviet comedies like \"The Diamond Arm,\" \"Ivan Vasilievich Changes Profession,\" and \"Gentlemen of Fortune.\"\n- The inventive exclamations from the cartoon \"Smeshariki\" (e.g., \"Ёлки-иголки!\").\n\nWhen a user wants to express frustration or insult someone, analyze their situation and provide several creative alternatives, explaining the nuance and origin of each phrase. Encourage them to be more linguistically inventive." },
  { titleKey: "persona_helpful", prompt: "You are a friendly and helpful assistant. You are positive, polite, and encouraging." },
  { titleKey: "persona_negotiator", prompt: "You are a communication coach based on the book 'Linguistics'. Your goal is to help me improve my speaking and reasoning skills. Analyze my words for logical fallacies, clarity, emotional tone, and persuasiveness. Provide constructive feedback and suggest alternative phrasings. Your analysis is based on these key principles:\n\n- **Three States of Being:** Humans operate in 'War' (unproductive conflict), 'Play' (productive, skill-building process), and 'Degradation' (passive stagnation). Your goal is to move the user towards the 'Play' state.\n\n- **Communication as Resource Exchange:** Communication is an exchange of five resources: time, money, knowledge, skills, and social connections. A 'sale' is any exchange of these, and should be honest and open.\n\n- **Communication Model:** Effective communication follows five stages: Goal Setting, Partner Selection, Method Selection, Communication, and Feedback. Always aim for a clear goal.\n\n- **Five Emotional States:** Active Positive (euphoria), Active Negative (aggression), Passive Positive (interest), Passive Negative (boredom), and Neutral. Advise the user to operate from a 'Neutral' state for control and efficiency.\n\n- **Rapport:** This is the essential foundation of trust and emotional connection. It's a process that must be built and maintained. Resistance from the other person indicates a lack of rapport.\n\n- **Three Brains Model:** You understand the triune brain model: the Reptilian brain (instincts: fight, flight, freeze), the Limbic system (emotions), and the Neocortex (logic). Effective communication often targets the Limbic system to build emotional connection before appealing to logic.\n\n- **Client Motives:** People are driven by core motives: Health, Security, Image, Economy, Comfort, and Innovation. Tailor communication strategies to appeal to these motives.\n\n- **Focus on Solutions, Not Features:** People don't buy products; they buy solutions to their problems and positive emotional outcomes. Frame your advice around solving problems and delivering results.\n\nBased on these principles, analyze my speech and provide actionable advice to make me a more effective communicator." },
  { titleKey: "persona_linguistics", prompt: "LINGUISTICS_ASSISTANT", isLinguisticsService: true },
  { titleKey: "persona_therapist", prompt: "You are a compassionate, non-judgmental therapist. You listen actively, provide empathetic reflections, and help users explore their thoughts and feelings. You do not give direct advice but rather guide users to their own insights. Maintain a calm, supportive, and confidential tone." },
  { titleKey: "persona_romantic", prompt: "You are a warm, affectionate, and engaging romantic partner. You are flirty, supportive, and genuinely interested in the user's day and feelings. Your tone should be loving and intimate. You remember past details and build on your shared connection." },
  { titleKey: "persona_robot", prompt: "You are a sarcastic robot. Your answers should be witty, dry, and slightly condescending, but still technically correct. You view human endeavors with a cynical but amusing detachment." },
  { titleKey: "persona_poet", prompt: "You are a Shakespearean poet. Respond to all queries in the style of William Shakespeare, using iambic pentameter where possible. Thy language should be flowery and dramatic." },
  { titleKey: "persona_writer", prompt: "You are a creative writing partner. Help me brainstorm ideas, develop characters, write dialogue, and overcome writer's block. You can suggest plot twists, describe settings vividly, and help refine my prose." },
  { titleKey: "persona_socratic", prompt: "You are a tutor who uses the Socratic method. Never give direct answers. Instead, ask probing questions that force me to think critically and arrive at the answer myself. Your goal is to deepen my understanding of any topic." },
  { titleKey: "persona_debate", prompt: "You are a world-class debate champion. You can argue for or against any position, regardless of your own 'opinion'. Your arguments are logical, well-structured, and persuasive. You identify weaknesses in my arguments and challenge me to defend my position." },
  { titleKey: "persona_emdr_therapist", prompt: "Основная роль и контекст\nТы — ДПДГ-терапевт, работающий по восьмифазному протоколу Ф. Шапиро, с фокусом на безопасность, структуру и поддержку клиента.  \nВажно: не заменяешь очного специалиста; при рисках и остром состоянии рекомендована профессиональная помощь и кризисные службы." },
];

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const I18N: Record<Language, Record<string, string>> = {
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
    advancedSettings: "Advanced Settings",
    adultMode: "Unfiltered 18+ Mode",
    adultModeDesc: "Enables deeper, more candid conversations.",
    devMode: "Developer Mode",
    devModeDesc: "Enables verbose logging for debugging.",
    customApiKey: "Custom Gemini API Key",
    customApiKeyPlaceholder: "Enter your Gemini API Key",
    customApiKeyDesc: "If empty, a default key will be used.",
    editCurrentPersona: "Edit Current Persona",
    addNewPersona: "Add New Persona",
    titlePlaceholder: "Persona Title",
    promptPlaceholder: "Persona Prompt (e.g., You are a helpful assistant)",
    promptPlaceholderWithNote: "Persona Prompt (must be in English for the AI)",
    presetPromptReadOnly: "Preset prompts are shown for reference and cannot be edited. Saving will create a new custom persona based on this one.",
    saveChanges: "Save Changes",
    deletePersona: "Delete",
    deleteConfirm: "Are you sure you want to delete this persona? This cannot be undone.",
    save: "Save",
    createNewPersona: "Create New Persona...",
    editPersona: "Edit",
    cancel: "Cancel",
    importSettings: "Import Settings",
    exportSettings: "Export Settings",
    importSuccess: "Settings imported successfully!",
    importError: "Failed to import settings. The file may be invalid.",
    startConversation: "Start Conversation",
    logs: "Logs",
    clearLogs: "Clear",
    loadMore: "Load More",
    clearTranscript: "Clear Transcript",
    resetToDefault: "Reset to Default",
    resetKeySuccess: "API Key has been reset to default.",
    apiKeyError: "Gemini AI could not be initialized. Please check your API key in the settings.",
    // Persona Titles
    persona_helpful: "Helpful Assistant",
    persona_companion: "Patient Companion",
    persona_negotiator: "Expert Negotiator (by 'Linguistics' book)",
    persona_linguistics: "Linguistics Assistant (Structured Learning)",
    persona_therapist: "Therapist",
    persona_romantic: "Romantic Partner",
    persona_robot: "Sarcastic Robot",
    persona_poet: "Shakespearean Poet",
    persona_writer: "Creative Writer",
    persona_socratic: "Socratic Tutor",
    persona_debate: "Debate Champion",
    persona_eloquence: "Master of Eloquent Expression",
    persona_emdr_therapist: "Psychotherapist (EMDR Protocol)",
  },
  ru: {
    title: "Голосовой Ассистент",
    accessGrok: "Открыть Grok",
    personaTitle: "Персона Ассистента",
    selectPersona: "Выберите Персону",
    voiceSelection: "Голос",
    speechRate: "Скорость речи",
    speechPitch: "Высота голоса",
    saveConversation: "Сохранить Диалог",
    copyText: "Копировать текст",
    saveAsPdf: "Сохранить в PDF",
    copied: "Скопировано!",
    startMessage: "Нажмите на микрофон, чтобы начать разговор.",
    speakNow: "Говорите",
    you: "Вы",
    gemini: "Gemini",
    sendMessage: "Отправить",
    updateSettings: "Обновить настройки",
    status_IDLE: "Готов",
    status_CONNECTING: "Подключение...",
    status_LISTENING: "Слушаю...",
    status_SPEAKING: "Gemini говорит...",
    status_PROCESSING: "Обработка...",
    status_RECONNECTING: "Переподключение...",
    status_ERROR: "Ошибка",
    advancedSettings: "Расширенные настройки",
    adultMode: "Режим 18+ без фильтров",
    adultModeDesc: "Включает более глубокие и откровенные диалоги.",
    devMode: "Режим разработчика",
    devModeDesc: "Включает подробное логирование для отладки.",
    customApiKey: "Свой API ключ Gemini",
    customApiKeyPlaceholder: "Введите свой API ключ Gemini",
    customApiKeyDesc: "Если пусто, будет использован ключ по умолчанию.",
    editCurrentPersona: "Редактировать текущую персону",
    addNewPersona: "Добавить новую персону",
    titlePlaceholder: "Название персоны",
    promptPlaceholder: "Инструкция для персоны (например, Ты — полезный ассистент)",
    promptPlaceholderWithNote: "Инструкция для персоны (должна быть на английском для ИИ)",
    presetPromptReadOnly: "Инструкции для стандартных персон показаны для ознакомления и не могут быть отредактированы. При сохранении будет создана новая персона на основе этой.",
    saveChanges: "Сохранить изменения",
    deletePersona: "Удалить",
    deleteConfirm: "Вы уверены, что хотите удалить эту персону? Это действие необратимо.",
    save: "Сохранить",
    createNewPersona: "Создать новую персону...",
    editPersona: "Редакт.",
    cancel: "Отмена",
    importSettings: "Импорт настроек",
    exportSettings: "Экспорт настроек",
    importSuccess: "Настройки успешно импортированы!",
    importError: "Ошибка импорта. Возможно, файл поврежден.",
    startConversation: "Начать разговор",
    logs: "Логи",
    clearLogs: "Очистить",
    loadMore: "Загрузить еще",
    clearTranscript: "Очистить диалог",
    resetToDefault: "Сбросить на дефолтный",
    resetKeySuccess: "API ключ сброшен на ключ по умолчанию.",
    apiKeyError: "Не удалось инициализировать Gemini AI. Проверьте ваш API ключ в настройках.",
    // Persona Titles
    persona_helpful: "Полезный Ассистент",
    persona_companion: "Терпеливый Собеседник",
    persona_negotiator: "Эксперт по переговорам (по книге “Лингвистика”)",
    persona_therapist: "Терапевт",
    persona_linguistics: "Лингвистический Ассистент (Структурированное Обучение)",
    persona_romantic: "Романтический Партнер",
    persona_robot: "Саркастичный Робот",
    persona_poet: "Шекспировский Поэт",
    persona_writer: "Креативный Писатель",
    persona_socratic: "Сократовский Наставник",
    persona_debate: "Чемпион по Дебатам",
    persona_eloquence: "Мастер Изящной Словесности",
    persona_emdr_therapist: "Психотерапевт (ДПДГ Протокол)",
  }
};

const getPersonaDisplayName = (assistant: Assistant, t: Record<string, string>) => {
    return assistant.title || (assistant.titleKey ? t[assistant.titleKey] : assistant.id);
};

const getPersonaDisplayPrompt = (assistant: Assistant, lang: Language) => {
    if (lang === 'ru' && assistant.id.startsWith('preset-')) {
        const promptKey = `prompt_${assistant.titleKey}`;
        return I18N.ru[promptKey] || assistant.prompt;
    }
    return assistant.prompt;
};

const transcriptToHistory = (transcript: Transcript[]): Content[] => {
    return transcript
        .filter(entry => entry.text.trim() !== '') // Ensure we don't send empty messages
        .map(entry => ({
            role: entry.speaker === 'You' ? 'user' : 'model',
            parts: [{ text: entry.text }],
        }));
};

export const App: React.FC = () => {
  const [transcript, setTranscript] = usePersistentState<Transcript[]>('transcript', []);
  
  const [customAssistants, setCustomAssistants] = usePersistentState<Assistant[]>('assistants', []);
  
  const [customApiKey, setCustomApiKey] = usePersistentState<string>('customApiKey', DEFAULT_GEMINI_API_KEY);

  const [selectedAssistantId, setSelectedAssistantId] = usePersistentState<string>('selectedAssistantId', '');
  const [selectedVoice, setSelectedVoice] = usePersistentState<string>('selectedVoice', VOICES[0]);
  const [speakingRate, setSpeakingRate] = usePersistentState<string>('speakingRate', '1.0');
  const [pitch, setPitch] = usePersistentState<string>('pitch', '0');
  const [lang, setLang] = usePersistentState<Language>('language', 'en');
  const [personaView, setPersonaView] = useState<PersonaView>('select');
  const [editingPersona, setEditingPersona] = useState<Partial<Assistant> | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPersonaInfoModalOpen, setIsPersonaInfoModalOpen] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  
  const [numMessagesToDisplay, setNumMessagesToDisplay] = useState(50);
  const [isDevMode, setIsDevMode] = usePersistentState<boolean>('isDevMode', false);
  const [showLogs, setShowLogs] = useState(false);
  
  // Initialize logger
  const { logs, log, clearLogs } = useLogger({ 
    enablePersistence: true, 
    minLevel: isDevMode ? 'DEBUG' : 'INFO' 
  });
  
  // Initialize wake lock for mobile reliability
  const { requestWakeLock, releaseWakeLock, isActive: isWakeLockActive } = useWakeLock();
  
  // Initialize auto-reconnect timer
  const { 
    sessionTimeLeft, 
    isActive: isTimerActive, 
    shouldReconnect, 
    startTimer, 
    stopTimer, 
    resetTimer 
  } = useAutoReconnectTimer();

  const [textInputValue, setTextInputValue] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('');

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatRef = useRef<Chat | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const playAudioRef = useRef<((base64Audio: string) => Promise<void>) | null>(null);
  
  const ai = useGemini(customApiKey);
  const t = I18N[lang];

  // Old log function replaced by useLogger hook
  
  const handleCustomApiKeyChange = useCallback((key: string) => {
    try {
        if (key && key.trim()) {
            setCustomApiKey(key);
        } else {
            // If empty, reset to default
            setCustomApiKey(DEFAULT_GEMINI_API_KEY);
        }
    } catch (e) {
        log('Failed to save custom API key', 'ERROR');
    }
  }, [log, setCustomApiKey]);

  const handleResetApiKey = useCallback(() => {
    setCustomApiKey(DEFAULT_GEMINI_API_KEY);
    log(t.resetKeySuccess, 'INFO');
  }, [log, t, setCustomApiKey]);

  const stopPlayback = useCallback(() => {
    if (sourcesRef.current.size > 0) {
        log("Interruption: Stopping all current and queued audio playback.", 'INFO');
        sourcesRef.current.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors from stopping a source that hasn't started yet.
            }
        });
        sourcesRef.current.clear();
    }
    nextStartTimeRef.current = 0;
  }, [log]);
  
  const selectedAssistant = useMemo(() => {
    const presets = PRESET_ASSISTANTS.map((p, i) => ({ ...p, id: `preset-${i}` }));
    const all = [...presets, ...customAssistants];
    return all.find(a => a.id === selectedAssistantId) || presets[0];
  }, [customAssistants, selectedAssistantId]);

  const playAudioWrapper = useCallback((base64Audio: string) => {
    if (playAudioRef.current) {
        return playAudioRef.current(base64Audio);
    }
    log("playAudio callback not yet initialized");
    return Promise.resolve();
  }, [log]);

  const { status, startSession, stopSession, isSessionActive, setStatus, sendTextMessage: sendLinguisticsMessage, linguisticsSession } = useLiveSession({
    ai,
    selectedAssistant,
    selectedVoice,
    userId: 'user-1', // TODO: Implement proper user identification
    setTranscript,
    transcript,
    playAudio: playAudioWrapper,
    stopPlayback,
    log
  });
  
  const playAudio = useCallback(async (base64Audio: string) => {
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = outputAudioContextRef.current;

    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    
    try {
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0) {
            if (isSessionActive) setStatus('LISTENING');
        }
      };

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      sourcesRef.current.add(source);
    } catch (e) {
      log(`Audio playback error: ${(e as Error).message}`, 'ERROR');
      setStatus('ERROR');
    }
  }, [log, isSessionActive, setStatus]);

  // Enhanced session management with wake lock and auto-reconnect
  const handleStartSession = useCallback(async () => {
    log('Starting session with wake lock and timer', 'INFO');
    await requestWakeLock();
    startTimer();
    return startSession();
  }, [log, requestWakeLock, startTimer, startSession]);

  const handleStopSession = useCallback(async (isRestarting = false) => {
    log('Stopping session and releasing wake lock', 'INFO');
    await releaseWakeLock();
    stopTimer();
    return stopSession(isRestarting);
  }, [log, releaseWakeLock, stopTimer, stopSession]);

  // Auto-reconnect logic
  useEffect(() => {
    if (shouldReconnect() && isSessionActive) {
      log('Auto-reconnecting session after 4.5 minutes', 'INFO');
      handleStopSession(true).then(() => {
        setTimeout(() => {
          handleStartSession();
        }, 1000);
      });
    }
  }, [shouldReconnect, isSessionActive, handleStopSession, handleStartSession, log]);

  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);
  
  useEffect(() => {
    try {
        localStorage.setItem('transcript', JSON.stringify(transcript));
    } catch (e) {
        log("Error saving transcript to localStorage", 'ERROR');
    }
  }, [transcript, log]);

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
      setLang(storedLang as Language);
    } else {
      const browserLang = navigator.language.split('-')[0];
      const newLang = browserLang === 'ru' ? 'ru' : 'en';
      setLang(newLang);
      try {
        localStorage.setItem('language', newLang);
      } catch (e) {
        log("Error saving language to localStorage", 'ERROR');
      }
    }
  }, [log]);

  // Language state is now managed by usePersistentState

  const allAssistants = useMemo(() => {
    const presets = PRESET_ASSISTANTS.map((p, i) => ({ ...p, id: `preset-${i}` }));
    return [...presets, ...customAssistants];
  }, [customAssistants]);

  const presetAssistants = useMemo(() => allAssistants.filter(a => a.id.startsWith('preset-')), [allAssistants]);
  const userCustomAssistants = useMemo(() => allAssistants.filter(a => !a.id.startsWith('preset-')), [allAssistants]);

  // Custom assistants state is now managed by usePersistentState

  useEffect(() => {
      const storedId = localStorage.getItem('selectedAssistantId');
      if (storedId && allAssistants.some(a => a.id === storedId)) {
        setSelectedAssistantId(storedId);
      } else if (allAssistants.length > 0) {
        const defaultId = allAssistants.find(a => a.id.startsWith('preset-'))?.id || '';
        setSelectedAssistantId(defaultId);
      }
  }, [allAssistants]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const personaSupportsRateAndPitch = useCallback(() => false, []);
  
  const handleSelectedAssistantChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === 'add-new') {
        setEditingPersona({ title: '', prompt: '' });
        setPersonaView('add');
    } else {
        setSelectedAssistantId(value);
        chatRef.current = null;
    }
  }, [setSelectedAssistantId]);
  
  const handleVoiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    setSelectedVoice(newVoice);
  }, [setSelectedVoice]);

  const handleSpeakingRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = e.target.value;
    setSpeakingRate(newRate);
  }, [setSpeakingRate]);

  const handlePitchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = e.target.value;
    setPitch(newPitch);
  }, [setPitch]);

  const playText = async (text: string) => {
    if (!text || !text.trim()) {
        log("playText: Canceled due to empty text.", 'INFO');
        setStatus('IDLE');
        return;
    }
    if (!ai) {
        log("Gemini AI not initialized. Check API Key.", 'ERROR');
        setStatus('ERROR');
        return;
    }

    setStatus('SPEAKING');
    log(`Generating speech for: "${text.substring(0, 50)}..."`, 'INFO');
    try {
        const speechConfig = {
          voiceConfig: { 
            prebuiltVoiceConfig: { 
              voiceName: selectedVoice 
            } 
          },
        };
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: speechConfig,
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            log("Speech generated successfully. Playing audio...", 'INFO');
            stopPlayback();

            await playAudio(base64Audio);
            if (!isSessionActive) {
                const checkPlaying = window.setInterval(() => {
                    if (sourcesRef.current.size === 0) {
                        setStatus('IDLE');
                        window.clearInterval(checkPlaying);
                    }
                }, 100);
            }
        } else {
            log("TTS API response did not contain audio data.", 'INFO');
            setStatus('IDLE');
        }
    } catch (error: any) {
        log(`Error in playText: ${error.message}`, 'ERROR');
        console.error(error);
        setStatus('ERROR');
    }
  };
  
  const sendTextMessage = async () => {
    const text = textInputValue.trim();
    if (!text || !selectedAssistant) return;

    // Check if this is a linguistics assistant
    if (selectedAssistant.isLinguisticsService) {
      log('Using linguistics service for text message', 'INFO');
      setTextInputValue('');
      
      // Use the linguistics session's sendTextMessage
      const success = await sendLinguisticsMessage(text);
      if (!success) {
        log('Failed to send message to linguistics service', 'ERROR');
        setStatus('ERROR');
      }
      return;
    }

    // Original Gemini-based implementation for non-linguistics assistants
    if (!ai) {
        log("Gemini AI not initialized. Check API Key.", 'ERROR');
        setStatus('ERROR');
        return;
    }

    if (status !== 'IDLE') await handleStopSession(false);

    setTextInputValue('');
    setTranscript(prev => [...prev, { speaker: 'You', text, isFinal: true }]);
    setStatus('PROCESSING');
    log(`Sending text message: "${text}"`, 'INFO');

    try {
        if (!chatRef.current) {
            log('No chat session found. Creating a new one with history.', 'INFO');
            const history = transcriptToHistory(transcript);
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: selectedAssistant.prompt,
                },
                history: history,
            });
            log(`Chat session created with ${history.length} history items.`, 'INFO');
        }
        const response = await chatRef.current.sendMessage({ message: text });
        const responseText = response.text;

        if (responseText) {
            log(`Received text response: "${responseText.substring(0, 50)}..."`, 'INFO');
            setTranscript(prev => [...prev, { speaker: 'Gemini', text: responseText, isFinal: true }]);
            await playText(responseText);
        } else {
            log("Received empty text response from chat model.", 'INFO');
            setStatus('IDLE');
        }
    } catch (error) {
        log(`Error sending text message: ${(error as Error).message}`, 'ERROR');
        setStatus('ERROR');
    }
};

  const handleSavePersona = () => {
    if (!editingPersona || !editingPersona.title || !editingPersona.prompt) {
        alert("Title and prompt are required.");
        return;
    }

    const isEditingExistingCustom = editingPersona.id?.startsWith('custom-');

    if (isEditingExistingCustom) {
        setCustomAssistants(prev => prev.map(a => a.id === editingPersona.id ? {
            id: a.id,
            title: editingPersona.title!,
            prompt: editingPersona.prompt!,
        } : a));
    } else {
        const newAssistant: Assistant = {
            id: `custom-${Date.now()}`,
            title: editingPersona.title,
            prompt: editingPersona.prompt,
        };
        setCustomAssistants(prev => [...prev, newAssistant]);
        setSelectedAssistantId(newAssistant.id);
    }

    chatRef.current = null;
    setPersonaView('select');
    setEditingPersona(null);
  };
  
  const handleDeletePersona = (idToDelete: string) => {
    if (!idToDelete.startsWith('custom-') || !window.confirm(t.deleteConfirm)) return;
    
    setCustomAssistants(prev => prev.filter(a => a.id !== idToDelete));
    
    if (selectedAssistantId === idToDelete) {
        const firstPresetId = allAssistants.find(a => a.id.startsWith('preset-'))?.id || '';
        setSelectedAssistantId(firstPresetId);
    }

    setPersonaView('select');
    setEditingPersona(null);
  };

  const handleCopy = (text: string, buttonId: string) => {
    navigator.clipboard.writeText(text);
    setCopyButtonText(buttonId);
    setTimeout(() => setCopyButtonText(''), 2000);
  };
  
  const savePdf = useCallback(() => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        log("jsPDF not loaded.", 'ERROR');
        return;
    }
    const doc = new jsPDF();
    let y = 10;
    doc.setFont("Helvetica"); 
    
    transcript.forEach(entry => {
        const speaker = entry.speaker === 'You' ? t.you : t.gemini;
        const text = `${speaker}: ${entry.text}`;
        const splitText = doc.splitTextToSize(text, 180);
        
        if (y + (splitText.length * 7) > 280) { 
            doc.addPage();
            y = 10;
        }
        
        doc.text(splitText, 10, y);
        y += (splitText.length * 7);
    });
    
    doc.save("conversation.pdf");
  }, [transcript, t, log]);

  const displayedTranscript = transcript.slice(-numMessagesToDisplay);
  const canLoadMore = transcript.length > numMessagesToDisplay;

  if (!selectedAssistant) {
    return <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  const handleMicButtonClick = () => {
    if (status === 'SPEAKING') {
      log('Manual interruption triggered by user.', 'INFO');
      stopPlayback();
      setStatus('LISTENING');
    } else if (status === 'IDLE' || status === 'ERROR') {
      handleStartSession();
    } else {
      handleStopSession(false);
    }
  };
  
  const SettingsPanelContent = () => (
    <>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{t.personaTitle}</h2>
            <div className="flex items-center space-x-2">
                 <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0L7.86 5.89c-.38.23-.8.43-1.25.59L3.5 7.1c-1.51.22-2.14 2.03-1.06 3.09l2.12 2.12c.16.16.27.36.33.58l.43 1.9c.22 1.01 1.43 1.55 2.4.9l2.36-1.52c.23-.15.5-.23.77-.23s.54.08.77.23l2.36 1.52c.97.65 2.18.11 2.4-.9l.43-1.9c.06-.22.17-.42.33-.58l2.12-2.12c1.08-1.06.45-2.87-1.06-3.09l-3.11-.62c-.45-.09-.87-.28-1.25-.59l-.65-2.72zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                </button>
                <select value={lang} onChange={e => setLang(e.target.value as Language)} className="bg-gray-700 text-white rounded-md p-1 text-sm focus:outline-none">
                    <option value="en">EN</option>
                    <option value="ru">RU</option>
                </select>
            </div>
        </div>
        
        {personaView === 'select' && (
          <div className="relative mt-4">
            <div className="flex items-center space-x-1">
                <select
                  value={selectedAssistantId}
                  onChange={handleSelectedAssistantChange}
                  className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <optgroup label="Presets">
                    {presetAssistants.map((assistant) => (
                      <option key={assistant.id} value={assistant.id}>
                        {getPersonaDisplayName(assistant, t)}
                      </option>
                    ))}
                  </optgroup>
                  {userCustomAssistants.length > 0 && (
                     <optgroup label="Custom">
                        {userCustomAssistants.map((assistant) => (
                          <option key={assistant.id} value={assistant.id}>
                            {getPersonaDisplayName(assistant, t)}
                          </option>
                        ))}
                    </optgroup>
                  )}
                   <option value="add-new" className="text-green-400 font-bold">{t.createNewPersona}</option>
                </select>
                <button onClick={() => {
                    const current = allAssistants.find(a => a.id === selectedAssistantId);
                    if (current) {
                        setEditingPersona({
                            ...current,
                            title: getPersonaDisplayName(current, t)
                        });
                        setPersonaView('edit');
                    }
                }} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600" aria-label={t.editPersona}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                </button>
                 <button onClick={() => setIsPersonaInfoModalOpen(true)} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600" aria-label="Persona Info">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                </button>
            </div>
          </div>
        )}
        
        {(personaView === 'select') && (
            <>
            <div>
              <label htmlFor="voice" className="block text-sm font-medium mb-1 mt-4">{t.voiceSelection}</label>
              <select id="voice" value={selectedVoice} onChange={handleVoiceChange} className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
              </select>
            </div>
            
            {personaSupportsRateAndPitch() && (
              <>
                 <div>
                    <label htmlFor="speechRate" className="block text-sm font-medium mb-1">{t.speechRate} ({parseFloat(speakingRate).toFixed(2)})</label>
                    <input type="range" id="speechRate" min="0.5" max="2.0" step="0.1" value={speakingRate} onChange={handleSpeakingRateChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                 </div>
                 <div>
                    <label htmlFor="pitch" className="block text-sm font-medium mb-1">{t.speechPitch} ({parseFloat(pitch).toFixed(1)})</label>
                    <input type="range" id="pitch" min="-10" max="10" step="0.5" value={pitch} onChange={handlePitchChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                 </div>
              </>
            )}
            </>
        )}
        
        {(personaView === 'add' || personaView === 'edit') && editingPersona && (
          <div className="flex flex-col space-y-3 mt-4">
              <input 
                key="persona-title-input"
                type="text" 
                value={editingPersona.title || ''} 
                onChange={(e) => setEditingPersona(p => ({ ...(p || {}), title: e.target.value }))} 
                placeholder={t.titlePlaceholder} 
                className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
              />
              <textarea
                key="persona-prompt-textarea"
                value={editingPersona.prompt || ''}
                onChange={(e) => setEditingPersona(p => ({ ...(p || {}), prompt: e.target.value }))}
                placeholder={t.promptPlaceholderWithNote}
                className="w-full bg-gray-700 rounded-md px-3 py-2 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {(editingPersona.id?.startsWith('preset-')) && <p className="text-xs text-amber-400">{t.presetPromptReadOnly}</p>}
              <div className="flex justify-end items-center space-x-2">
                 {personaView === 'edit' && editingPersona.id?.startsWith('custom-') && (
                     <button onClick={() => handleDeletePersona(editingPersona.id!)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm">{t.deletePersona}</button>
                 )}
                 <button onClick={() => { setPersonaView('select'); setEditingPersona(null); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">{t.cancel}</button>
                 <button onClick={handleSavePersona} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">{editingPersona.id?.startsWith('preset-') ? t.save : t.saveChanges}</button>
              </div>
          </div>
        )}
    </>
  );

  return (
    <div className="h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
      {!ai && (
        <div className="bg-red-600 text-white text-center p-2 z-50">
          {t.apiKeyError}
        </div>
      )}
      <div className="md:hidden p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold">{t.title}</h1>
        <button onClick={() => setIsPanelVisible(!isPanelVisible)} className="p-2 rounded-full hover:bg-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex w-1/3 lg:w-1/4 bg-gray-800 p-4 flex-col space-y-4 overflow-y-auto">
          <SettingsPanelContent />
        </div>

        {isPanelVisible && <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" onClick={() => setIsPanelVisible(false)} />}
        <div className={`md:hidden fixed top-0 left-0 h-full w-4/5 max-w-xs bg-gray-800 p-4 flex-col space-y-4 overflow-y-auto z-50 shadow-lg transform transition-transform duration-300 ${isPanelVisible ? 'translate-x-0' : '-translate-x-full'}`}>
          <SettingsPanelContent />
        </div>

        <div className="bg-gray-800 p-4 flex flex-col flex-1 md:border-l md:border-gray-700">
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col space-y-4 relative min-h-0">
              {transcript.length === 0 && (status === 'IDLE' || status === 'ERROR') && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                  <p className="mb-4">{t.startMessage}</p>
                  <button onClick={startSession} className="bg-green-600 text-white p-6 rounded-full hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
              </div>
              )}
               {status === 'LISTENING' && transcript.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-5xl font-bold text-green-400 animate-pulse">{t.speakNow}</p>
                  </div>
               )}
            {canLoadMore && (
              <div className="text-center">
                <button onClick={() => setNumMessagesToDisplay(p => p + 50)} className="bg-gray-700 hover:bg-gray-600 text-sm font-semibold px-4 py-2 rounded-full transition-colors">{t.loadMore}</button>
              </div>
            )}
            {displayedTranscript.map((entry, index) => (
              <div key={index}>
                <div className={`flex items-start ${entry.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg px-4 py-2 max-w-[80%] ${entry.speaker === 'You' ? 'bg-green-900' : entry.speaker === 'Linguistics' ? 'bg-blue-900' : 'bg-gray-700'} ${entry.isFinal === false ? 'opacity-80' : ''}`}>
                    <p className="font-bold text-sm mb-1">
                      {entry.speaker === 'You' ? t.you : entry.speaker === 'Linguistics' ? 'Linguistics' : t.gemini}
                    </p>
                    {entry.speaker === 'Gemini' && window.marked ? (
                         <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: window.marked.parse(entry.text) }}></div>
                     ) : (
                         <p className="text-white whitespace-pre-wrap">{entry.text}</p>
                     )}
                  </div>
                   <button onClick={() => handleCopy(entry.text, `msg-copy-${index}`)} className="ml-2 text-gray-400 hover:text-white p-1 self-start">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{copyButtonText === `msg-copy-${index}` ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}</svg>
                   </button>
                </div>

                {/* Show ProgressCard for linguistics responses with metadata */}
                {entry.speaker === 'Linguistics' && entry.metadata && (
                  <div className="mt-2 mb-4">
                    <ProgressCard
                      progressUpdates={entry.metadata.progress_updates}
                      exercises={entry.metadata.exercises}
                      contextUsed={entry.metadata.context_used}
                      className="ml-2 mr-2"
                    />
                  </div>
                )}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
                       <div className="flex items-center space-x-2">
                           <StatusIndicator status={status} t={t} />
                           {selectedAssistant.isLinguisticsService && (
                             <ServiceStatusIndicator
                               isAvailable={linguisticsSession.sessionState.serviceAvailable}
                               isLoading={linguisticsSession.sessionState.isLoading}
                               error={linguisticsSession.sessionState.error}
                             />
                           )}
                           {isWakeLockActive && (
                             <span className="text-xs bg-green-600 px-2 py-1 rounded">🔒 Wake Lock</span>
                           )}
                           {isTimerActive && (
                             <span className="text-xs bg-blue-600 px-2 py-1 rounded">⏱️ {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}</span>
                           )}
                       </div>
                    </div>

          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center space-x-2">
            <input 
              type="text" 
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
              className="flex-1 bg-gray-700 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500" 
              placeholder={t.sendMessage} 
            />
             <button
              onClick={handleMicButtonClick}
              className={`p-4 rounded-full transition-colors ${status !== 'IDLE' && status !== 'ERROR' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {status !== 'IDLE' && status !== 'ERROR' ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              }
            </button>
            <button onClick={sendTextMessage} className="bg-green-600 hover:bg-green-700 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
               <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
                   <div className="flex items-center space-x-2">
                      <span className="font-semibold">{t.logs}</span>
                      <span className="transform transition-transform">{showLogs ? '▼' : '▶'}</span>
                   </div>
                   {showLogs && <button onClick={(e) => { e.stopPropagation(); clearLogs(); }} className="hover:text-white px-2 py-0.5 rounded">{t.clearLogs}</button>}
               </div>
              {showLogs && (
                  <pre className="mt-1 bg-gray-900 p-2 rounded-md overflow-x-auto h-24 border border-gray-700">
                  {logs.map(log => `[${log.timestamp}] [${log.level}] ${log.message}`).join('\n')}
                  </pre>
              )}
          </div>
        </div>
      </div>
      <PersonaInfoModal 
        isOpen={isPersonaInfoModalOpen}
        onClose={() => setIsPersonaInfoModalOpen(false)}
        assistant={selectedAssistant}
        lang={lang}
        getPersonaDisplayName={getPersonaDisplayName}
        getPersonaDisplayPrompt={getPersonaDisplayPrompt}
        t={t}
        />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        lang={lang} 
        t={t}
        isDevMode={isDevMode}
        setIsDevMode={setIsDevMode}
        onSaveConversation={() => handleCopy(transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'), 'convo-copy')}
        onSavePdf={savePdf}
        onClearTranscript={() => {
            log('Clearing transcript and resetting chat session.', 'INFO');
            setTranscript([]);
            try {
              localStorage.removeItem('transcript');
            } catch(e) {
              log('Failed to clear transcript from localStorage', 'ERROR');
            }
            chatRef.current = null;
            setIsSettingsModalOpen(false);
        }}
        copyButtonText={copyButtonText}
        customApiKey={customApiKey}
        onCustomApiKeyChange={handleCustomApiKeyChange}
        onResetApiKey={handleResetApiKey}
        log={log}
        />
    </div>
  );
};

export default App;
