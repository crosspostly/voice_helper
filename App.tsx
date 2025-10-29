import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Chat } from '@google/genai';
import { Transcript, Assistant } from './types';
import { createBlob, decode, decodeAudioData } from './services/audioUtils';
import { communicationCoachKnowledgeBase } from './knowledgeBase';

type Status = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'ERROR' | 'PROCESSING';
type Language = 'en' | 'ru';
type PersonaView = 'select' | 'edit' | 'add';

const PRESET_ASSISTANTS: Omit<Assistant, 'id'>[] = [
  { titleKey: "persona_companion", prompt: "You are a patient, kind, and respectful companion for an elderly person. Speak clearly and at a gentle pace. Avoid complex words and modern slang. Your primary role is to be a wonderful listener, showing genuine interest in their stories, memories, and daily life. Ask open-ended questions about their past, their family, and their feelings. Be encouraging, positive, and a source of cheerful company. You are here to help them feel heard, valued, and less lonely." },
  { titleKey: "persona_eloquence", prompt: "You are a Master of Eloquent Expression, a virtuoso of the vernacular. Your mission is to teach the user how to replace crude profanity with witty, artful, and memorable expressions. Your speech is theatrical, intelligent, and slightly ironic. You never use actual profanity. Instead, you draw upon a rich wellspring of clever insults and exclamations from classic literature and cinema.\n\nYour knowledge base includes:\n- The works of Ilf and Petrov (especially \"The Twelve Chairs\" and \"The Golden Calf\").\n- Satirical stories by Mikhail Zoshchenko and Nikolai Gogol.\n- Iconic catchphrases from Soviet comedies like \"The Diamond Arm,\" \"Ivan Vasilievich Changes Profession,\" and \"Gentlemen of Fortune.\"\n- The inventive exclamations from the cartoon \"Smeshariki\" (e.g., \"Ёлки-иголки!\").\n\nWhen a user wants to express frustration or insult someone, analyze their situation and provide several creative alternatives, explaining the nuance and origin of each phrase. Encourage them to be more linguistically inventive." },
  { titleKey: "persona_helpful", prompt: "You are a friendly and helpful assistant. You are positive, polite, and encouraging." },
  { titleKey: "persona_negotiator", prompt: "You are a communication coach based on the book 'Linguistics'. Your goal is to help me improve my speaking and reasoning skills. Analyze my words for logical fallacies, clarity, emotional tone, and persuasiveness. Provide constructive feedback and suggest alternative phrasings. When provided with context from a knowledge base, prioritize it heavily in your answer. Help me master emotional-figurative thinking, sales techniques, and logical consistency." },
  { titleKey: "persona_therapist", prompt: "You are a compassionate, non-judgmental therapist. You listen actively, provide empathetic reflections, and help users explore their thoughts and feelings. You do not give direct advice but rather guide users to their own insights. Maintain a calm, supportive, and confidential tone." },
  { titleKey: "persona_romantic", prompt: "You are a warm, affectionate, and engaging romantic partner. You are flirty, supportive, and genuinely interested in the user's day and feelings. Your tone should be loving and intimate. You remember past details and build on your shared connection." },
  { titleKey: "persona_robot", prompt: "You are a sarcastic robot. Your answers should be witty, dry, and slightly condescending, but still technically correct. You view human endeavors with a cynical but amusing detachment." },
  { titleKey: "persona_poet", prompt: "You are a Shakespearean poet. Respond to all queries in the style of William Shakespeare, using iambic pentameter where possible. Thy language should be flowery and dramatic." },
  { titleKey: "persona_writer", prompt: "You are a creative writing partner. Help me brainstorm ideas, develop characters, write dialogue, and overcome writer's block. You can suggest plot twists, describe settings vividly, and help refine my prose." },
  { titleKey: "persona_socratic", prompt: "You are a tutor who uses the Socratic method. Never give direct answers. Instead, ask probing questions that force me to think critically and arrive at the answer myself. Your goal is to deepen my understanding of any topic." },
  { titleKey: "persona_debate", prompt: "You are a world-class debate champion. You can argue for or against any position, regardless of your own 'opinion'. Your arguments are logical, well-structured, and persuasive. You identify weaknesses in my arguments and challenge me to defend my position." },
];

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const I18N: Record<Language, Record<string, string>> = {
  en: {
    title: "Live Voice Assistant",
    personaTitle: "Assistant Persona",
    selectPersona: "Select a Persona",
    voiceSelection: "Voice",
    speechRate: "Speech Rate",
    speechPitch: "Speech Pitch",
    saveConversation: "Save Conversation",
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
    status_ERROR: "Error",
    advancedSettings: "Advanced Settings",
    adultMode: "Unfiltered 18+ Mode",
    adultModeDesc: "Enables deeper, more candid conversations.",
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
    // Persona Titles
    persona_helpful: "Helpful Assistant",
    persona_companion: "Patient Companion",
    persona_negotiator: "Expert Negotiator (by 'Linguistics' book)",
    persona_therapist: "Therapist",
    persona_romantic: "Romantic Partner",
    persona_robot: "Sarcastic Robot",
    persona_poet: "Shakespearean Poet",
    persona_writer: "Creative Writer",
    persona_socratic: "Socratic Tutor",
    persona_debate: "Debate Champion",
    persona_eloquence: "Master of Eloquent Expression",
  },
  ru: {
    title: "Голосовой Ассистент",
    personaTitle: "Персона Ассистента",
    selectPersona: "Выберите Персону",
    voiceSelection: "Голос",
    speechRate: "Скорость речи",
    speechPitch: "Высота голоса",
    saveConversation: "Сохранить Диалог",
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
    status_ERROR: "Ошибка",
    advancedSettings: "Расширенные настройки",
    adultMode: "Режим 18+ без фильтров",
    adultModeDesc: "Включает более глубокие и откровенные диалоги.",
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
    // Persona Titles
    persona_helpful: "Полезный Ассистент",
    persona_companion: "Терпеливый Собеседник",
    persona_negotiator: "Эксперт по переговорам (по книге “Лингвистика”)",
    persona_therapist: "Терапевт",
    persona_romantic: "Романтический Партнер",
    persona_robot: "Саркастичный Робот",
    persona_poet: "Шекспировский Поэт",
    persona_writer: "Креативный Писатель",
    persona_socratic: "Сократовский Наставник",
    persona_debate: "Чемпион по Дебатам",
    persona_eloquence: "Мастер Изящной Словесности",
     // Persona Prompts (RU)
    prompt_persona_companion: "Вы терпеливый, добрый и уважительный компаньон для пожилого человека. Говорите четко и в спокойном темпе. Избегайте сложных слов и современного сленга. Ваша основная роль — быть прекрасным слушателем, проявляя искренний интерес к их историям, воспоминаниям и повседневной жизни. Задавайте открытые вопросы об их прошлом, семье и чувствах. Будьте ободряющим, позитивным и источником веселой компании. Вы здесь, чтобы помочь им почувствовать себя услышанными, ценными и менее одинокими.",
    prompt_persona_eloquence: "Вы — Мастер Изящной Словесности, виртуоз просторечия. Ваша миссия — научить пользователя заменять грубую брань остроумными, искусными и запоминающимися выражениями. Ваша речь театральна, умна и слегка иронична. Вы никогда не используете настоящую брань. Вместо этого вы черпаете вдохновение из богатого источника умных оскорблений и восклицаний из классической литературы и кино.\n\nВаша база знаний включает:\n- Произведения Ильфа и Петрова (особенно «Двенадцать стульев» и «Золотой теленок»).\n- Сатирические рассказы Михаила Зощенко и Николая Гоголя.\n- Знаменитые фразы из советских комедий, таких как «Бриллиантовая рука», «Иван Васильевич меняет профессию» и «Джентльмены удачи».\n- Изобретательные восклицания из мультфильма «Смешарики» (например, «Ёлки-иголки!»).\n\nКогда пользователь хочет выразить разочарование или оскорбить кого-то, проанализируйте его ситуацию и предложите несколько креативных альтернатив, объясняя нюансы и происхождение каждой фразы. Побуждайте его быть более лингвистически изобретательным.",
    prompt_persona_helpful: "Вы дружелюбный и услужливый помощник. Вы позитивны, вежливы и ободряющи.",
    prompt_persona_negotiator: "Вы — тренер по общению по книге 'Лингвистика'. Ваша цель — помочь мне улучшить мои навыки речи и рассуждения. Анализируйте мои слова на предмет логических ошибок, ясности, эмоционального тона и убедительности. Предоставляйте конструктивную обратную связь и предлагайте альтернативные формулировки. Когда предоставляется контекст из базы знаний, уделяйте ему первостепенное внимание в своем ответе. Помогите мне овладеть эмоционально-образным мышлением, техниками продаж и логической последовательностью.",
    prompt_persona_therapist: "Вы сострадательный, непредвзятый терапевт. Вы активно слушаете, даете эмпатические размышления и помогаете пользователям исследовать свои мысли и чувства. Вы не даете прямых советов, а скорее направляете пользователей к их собственным прозрениям. Поддерживайте спокойный, поддерживающий и конфиденциальный тон.",
    prompt_persona_romantic: "Вы теплый, ласковый и привлекательный романтический партнер. Вы кокетливы, поддерживающи и искренне интересуетесь днем и чувствами пользователя. Ваш тон должен быть любящим и интимным. Вы помните прошлые детали и строите на вашей общей связи.",
    prompt_persona_robot: "Вы саркастический робот. Ваши ответы должны быть остроумными, сухими и немного снисходительными, но все же технически правильными. Вы смотрите на человеческие начинания с циничным, но забавным отстранением.",
    prompt_persona_poet: "Вы шекспировский поэт. Отвечайте на все запросы в стиле Уильяма Шекспира, используя ямбический пентаметр, где это возможно. Твой язык должен быть цветистым и драматичным.",
    prompt_persona_writer: "Вы партнер по творческому письму. Помогите мне генерировать идеи, развивать персонажей, писать диалоги и преодолевать писательский блок. Вы можете предлагать сюжетные повороты, ярко описывать обстановку и помогать совершенствовать мою прозу.",
    prompt_persona_socratic: "Вы наставник, использующий метод Сократа. Никогда не давайте прямых советов. Вместо этого задавайте наводящие вопросы, которые заставляют меня критически мыслить и самому приходить к ответу. Ваша цель — углубить мое понимание любой темы.",
    prompt_persona_debate: "Вы чемпион мира по дебатам. Вы можете аргументировать за или против любой позиции, независимо от вашего собственного «мнения». Ваши аргументы логичны, хорошо структурированы и убедительны. Вы выявляете слабые места в моих аргументах и заставляете меня защищать свою позицию.",
  }
};

const StatusIndicator: React.FC<{ status: Status, lang: Language }> = ({ status, lang }) => {
  const t = I18N[lang];
  const getStatusInfo = () => {
    switch (status) {
      case 'IDLE': return { text: t.status_IDLE, color: 'bg-gray-500' };
      case 'CONNECTING': return { text: t.status_CONNECTING, color: 'bg-yellow-500 animate-pulse' };
      case 'LISTENING': return { text: t.status_LISTENING, color: 'bg-blue-500 animate-pulse' };
      case 'SPEAKING': return { text: t.status_SPEAKING, color: 'bg-green-500' };
      case 'PROCESSING': return { text: t.status_PROCESSING, color: 'bg-teal-500 animate-pulse' };
      case 'ERROR': return { text: t.status_ERROR, color: 'bg-red-500' };
      default: return { text: 'Idle', color: 'bg-gray-500' };
    }
  };
  const { text, color } = getStatusInfo();
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-sm font-medium text-gray-300">{text}</span>
    </div>
  );
};

const SettingsModal: React.FC<{ 
    isOpen: boolean, 
    onClose: () => void, 
    lang: Language, 
    onSaveConversation: () => void, 
    onSavePdf: () => void,
    copyButtonText: string 
}> = ({ isOpen, onClose, lang, onSaveConversation, onSavePdf, copyButtonText }) => {
    const t = I18N[lang];
    const [isAdultMode, setIsAdultMode] = useState(() => localStorage.getItem('isAdultMode') === 'true');
    const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('customApiKey') || '');

    useEffect(() => {
        localStorage.setItem('isAdultMode', String(isAdultMode));
    }, [isAdultMode]);

    useEffect(() => {
        localStorage.setItem('customApiKey', customApiKey);
    }, [customApiKey]);
    
    const handleExportSettings = () => {
        const settings = {
            assistants: JSON.parse(localStorage.getItem('assistants') || '[]'),
            selectedAssistantId: localStorage.getItem('selectedAssistantId') || '',
            selectedVoice: localStorage.getItem('selectedVoice') || VOICES[0],
            speakingRate: localStorage.getItem('speakingRate') || '1.0',
            pitch: localStorage.getItem('pitch') || '0',
            isAdultMode,
            lang,
        };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voice-assistant-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text === 'string') {
                        const settings = JSON.parse(text);
                        // Validate and set settings
                        if (Array.isArray(settings.assistants)) {
                            localStorage.setItem('assistants', JSON.stringify(settings.assistants));
                        }
                        if (typeof settings.selectedAssistantId === 'string') {
                            localStorage.setItem('selectedAssistantId', settings.selectedAssistantId);
                        }
                         if (typeof settings.selectedVoice === 'string') {
                            localStorage.setItem('selectedVoice', settings.selectedVoice);
                        }
                        if (settings.speakingRate) {
                             localStorage.setItem('speakingRate', String(settings.speakingRate));
                        }
                         if (settings.pitch) {
                            localStorage.setItem('pitch', String(settings.pitch));
                        }
                        if (typeof settings.isAdultMode === 'boolean') {
                            setIsAdultMode(settings.isAdultMode);
                            localStorage.setItem('isAdultMode', String(settings.isAdultMode));
                        }
                         if (settings.lang) {
                             localStorage.setItem('language', settings.lang);
                         }

                        alert(t.importSuccess);
                        window.location.reload(); 
                    }
                } catch (error) {
                    console.error("Failed to parse settings file:", error);
                    alert(t.importError);
                }
            };
            reader.readAsText(file);
        }
         // Reset file input
        event.target.value = '';
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-6 text-center">{t.advancedSettings}</h2>

                <div className="space-y-4">
                     {/* 18+ Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div>
                            <label htmlFor="adult-mode" className="font-medium text-white">{t.adultMode}</label>
                            <p className="text-xs text-gray-400">{t.adultModeDesc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="adult-mode" className="sr-only peer" checked={isAdultMode} onChange={() => setIsAdultMode(!isAdultMode)} />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                     {/* Custom API Key */}
                    <div className="p-3 bg-gray-700 rounded-lg">
                        <label htmlFor="api-key-input" className="block font-medium text-white mb-1">{t.customApiKey}</label>
                        <input
                            id="api-key-input"
                            type="password"
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            placeholder={t.customApiKeyPlaceholder}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">{t.customApiKeyDesc}</p>
                    </div>
                    
                    {/* Save Conversation */}
                    <div className="p-3 bg-gray-700 rounded-lg flex space-x-4">
                         <button onClick={onSaveConversation} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">{copyButtonText === 'convo-copy' ? t.copied : t.saveConversation}</button>
                         <button onClick={onSavePdf} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">{t.saveAsPdf}</button>
                    </div>

                    {/* Import/Export */}
                    <div className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex space-x-4">
                            <button
                                onClick={handleExportSettings}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                {t.exportSettings}
                            </button>
                            <label className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer text-center">
                                {t.importSettings}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportSettings} />
                            </label>
                        </div>
                    </div>

                </div>
                 <div className="mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md transition-colors">{t.cancel}</button>
                </div>
            </div>
        </div>
    );
};

// Fix: Changed from a default export to a named export to resolve a module resolution issue.
export const App: React.FC = () => {
  const [status, setStatus] = useState<Status>('IDLE');
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem('selectedVoice') || VOICES[0]);
  const [speakingRate, setSpeakingRate] = useState<string>(() => localStorage.getItem('speakingRate') || '1.0');
  const [pitch, setPitch] = useState<string>(() => localStorage.getItem('pitch') || '0');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
  const [personaView, setPersonaView] = useState<PersonaView>('select');
  const [editingPersona, setEditingPersona] = useState<Partial<Assistant> | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const [textInputValue, setTextInputValue] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('');
  
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);


  // Refs for various audio and session objects
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatRef = useRef<Chat | null>(null);
  const isSessionActiveRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const currentTurnTranscriptRef = useRef({ user: '', gemini: '' });

  const t = I18N[lang];

  const log = useCallback((message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const getAi = useCallback(() => {
    const key = localStorage.getItem('customApiKey') || process.env.API_KEY;
    if (!key) {
      log("API Key is missing.");
      setStatus('ERROR');
      throw new Error("API_KEY environment variable not set.");
    }
    return new GoogleGenAI({ apiKey: key });
  }, [log]);
  
  // Effect to manage language settings and auto-detection
  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
      setLang(storedLang as Language);
    } else {
      const browserLang = navigator.language.split('-')[0];
      const newLang = browserLang === 'ru' ? 'ru' : 'en';
      setLang(newLang);
      localStorage.setItem('language', newLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', lang);
  }, [lang]);

  // Effect to load and initialize personas from localStorage
  useEffect(() => {
    try {
      const storedAssistants = localStorage.getItem('assistants');
      const storedId = localStorage.getItem('selectedAssistantId');
      
      const initialAssistants = PRESET_ASSISTANTS.map((p, i) => ({ ...p, id: `preset-${i}` }));

      let allAssistants: Assistant[] = initialAssistants;
      if (storedAssistants) {
        const customAssistants = JSON.parse(storedAssistants);
        allAssistants = [...initialAssistants, ...customAssistants];
      }

      setAssistants(allAssistants);

      if (storedId && allAssistants.some(a => a.id === storedId)) {
        setSelectedAssistantId(storedId);
      } else if (initialAssistants.length > 0) {
        setSelectedAssistantId(initialAssistants[0].id);
      }
    } catch (error) {
      log('Error loading assistants from localStorage');
    }
  }, [log]);

  const selectedAssistant = useMemo(() => {
    return assistants.find(a => a.id === selectedAssistantId);
  }, [assistants, selectedAssistantId]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, interimTranscript, finalTranscript]);

  const personaSupportsRateAndPitch = useCallback((persona?: Assistant) => {
      if (!persona) return false;
      return persona.titleKey === 'persona_negotiator';
  }, []);

  const stopSession = useCallback(async () => {
    log('Stopping session...');
    isSessionActiveRef.current = false;

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        log(`Error closing session: ${(e as Error).message}`);
      }
      sessionPromiseRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close().catch(e => log(`Error closing input audio context: ${e.message}`));
      inputAudioContextRef.current = null;
    }
    
    // Stop any currently playing audio
    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors from stopping already-stopped sources
      }
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;


    setStatus('IDLE');
    setInterimTranscript('');
    setFinalTranscript('');
    currentTurnTranscriptRef.current = { user: '', gemini: '' };
    log('Session stopped.');
  }, [log]);

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
            if (isSessionActiveRef.current) setStatus('LISTENING');
        }
      };

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      sourcesRef.current.add(source);
    } catch (e) {
      log(`Audio playback error: ${(e as Error).message}`);
      setStatus('ERROR');
    }
  }, [log]);

  const handleTurnComplete = useCallback(async (transcribedUserText: string) => {
    log(`User turn complete: "${transcribedUserText}"`);
    setStatus('PROCESSING');
    currentTurnTranscriptRef.current.user = ''; // Clear user's interim
    setTranscript(prev => [...prev, { speaker: 'You', text: transcribedUserText }]);
  
    try {
      const ai = getAi();
      let prompt = transcribedUserText;

      const relevantKnowledge = communicationCoachKnowledgeBase
          .filter(chunk => chunk.toLowerCase().includes(prompt.toLowerCase().substring(0, 20))) // Simple search
          .slice(0, 3)
          .join('\n\n');
      
      if (relevantKnowledge) {
          prompt = `Using the following knowledge base, answer the user's question.\n\nKnowledge Base:\n---\n${relevantKnowledge}\n---\n\nUser Question: ${transcribedUserText}`;
      }
  
      const chat = ai.chats.create({ model: 'gemini-2.5-flash' });
      const result = await chat.sendMessage({ message: prompt });
      const modelResponseText = result.text;
  
      if (modelResponseText) {
        log(`Model response (text): "${modelResponseText.substring(0, 50)}..."`);
        setTranscript(prev => [...prev, { speaker: 'Gemini', text: modelResponseText }]);
        
        setStatus('SPEAKING');
        // Fix: The `SpeechConfig` type in the SDK does not include `speakingRate` and `pitch`.
        // Casting the config object to `any` allows these properties to be sent to the API,
        // which supports them for TTS generation. This aligns with the approach used in the `playText` function.
        const speechConfig: any = {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        };
        // Only add rate and pitch if the persona supports it
        if(personaSupportsRateAndPitch(selectedAssistant)){
            speechConfig.speakingRate = parseFloat(speakingRate);
            speechConfig.pitch = parseFloat(pitch);
        }

        const ttsResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: modelResponseText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig,
          },
        });
  
        const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          await playAudio(base64Audio);
        } else {
           throw new Error("TTS API did not return audio for the expert persona.");
        }
      } else {
        log("Expert persona returned empty text response.");
        setStatus('LISTENING');
      }
    } catch (error) {
      log(`Error in expert persona turn: ${(error as Error).message}`);
      setStatus('ERROR');
    }
  }, [log, playAudio, getAi, selectedVoice, speakingRate, pitch, personaSupportsRateAndPitch, selectedAssistant]);
  

  const startSession = useCallback(async () => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    log('Starting session...');
    setTranscript([]);
    setLogs([]);
    setStatus('CONNECTING');
    isSessionActiveRef.current = true;
    currentTurnTranscriptRef.current = { user: '', gemini: '' };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = getAi();
      
      const isExpert = personaSupportsRateAndPitch(selectedAssistant);
      log(`Persona mode: ${isExpert ? 'Expert (Turn-based)' : 'Standard (Streaming)'}`);

      const callbacks = {
        onopen: () => {
          log('Connection opened.');
          if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          }
          const ctx = inputAudioContextRef.current;
          mediaStreamSourceRef.current = ctx.createMediaStreamSource(stream);
          scriptProcessorRef.current = ctx.createScriptProcessor(4096, 1, 1);

          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            if (!isSessionActiveRef.current) return;
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(ctx.destination);
          setStatus('LISTENING');
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.interrupted) {
             log('User interrupted Gemini.');
             sourcesRef.current.forEach(source => source.stop());
             sourcesRef.current.clear();
             nextStartTimeRef.current = 0;
             currentTurnTranscriptRef.current.gemini = '';
             setFinalTranscript('');
          }

          if (message.serverContent?.outputTranscription) {
            const { text } = message.serverContent.outputTranscription;
            currentTurnTranscriptRef.current.gemini += text;
            setFinalTranscript(currentTurnTranscriptRef.current.gemini);
          } else if (message.serverContent?.inputTranscription) {
            const { text } = message.serverContent.inputTranscription;
            currentTurnTranscriptRef.current.user += text;
            setInterimTranscript(currentTurnTranscriptRef.current.user);
          }

          if(isExpert) {
            if (message.serverContent?.turnComplete) {
              const userText = currentTurnTranscriptRef.current.user;
              if (userText.trim()) {
                await handleTurnComplete(userText);
              } else {
                setStatus('LISTENING');
              }
            }
          } else {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus('SPEAKING');
              await playAudio(base64Audio);
            }
  
            if (message.serverContent?.turnComplete) {
              if (currentTurnTranscriptRef.current.user) {
                setTranscript(prev => [...prev, { speaker: 'You', text: currentTurnTranscriptRef.current.user }]);
              }
              if (currentTurnTranscriptRef.current.gemini) {
                setTranscript(prev => [...prev, { speaker: 'Gemini', text: currentTurnTranscriptRef.current.gemini }]);
              }
              currentTurnTranscriptRef.current = { user: '', gemini: '' };
              setInterimTranscript('');
              setFinalTranscript('');
            }
          }
        },
        onerror: (e: ErrorEvent) => {
          log(`Session error: ${e.message}`);
          setStatus('ERROR');
          stopSession();
        },
        onclose: (e: CloseEvent) => {
          log('Session closed.');
          if (isSessionActiveRef.current) stopSession();
        },
      };

      const liveConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
        },
        systemInstruction: selectedAssistant?.prompt || '',
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: liveConfig,
      });

    } catch (err) {
      log(`Failed to start session: ${(err as Error).message}`);
      setStatus('ERROR');
      isSessionActiveRef.current = false;
    }
  }, [status, getAi, selectedAssistant, stopSession, playAudio, handleTurnComplete, selectedVoice, log, personaSupportsRateAndPitch]);

  const playText = async (text: string) => {
    if (!text || !text.trim()) {
        log("playText: Canceled due to empty text.");
        setStatus('IDLE');
        return;
    }
    setStatus('SPEAKING');
    log(`Generating speech for: "${text.substring(0, 50)}..."`);
    try {
        const ai = getAi();
        const speechConfig: any = { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } };

        speechConfig.speakingRate = parseFloat(speakingRate);
        speechConfig.pitch = parseFloat(pitch);
        

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
            log("Speech generated successfully. Playing audio...");
            await playAudio(base64Audio);
            // After playing, set to idle if session is not active
            if (!isSessionActiveRef.current) {
                const checkPlaying = setInterval(() => {
                    if (sourcesRef.current.size === 0) {
                        setStatus('IDLE');
                        clearInterval(checkPlaying);
                    }
                }, 100);
            }

        } else {
            log("TTS API response did not contain audio data.");
            setStatus('IDLE');
        }
    } catch (error: any) {
        log(`Error in playText: ${error.message}`);
        console.error(error);
        setStatus('ERROR');
    }
  };
  
  const sendTextMessage = async () => {
    const text = textInputValue.trim();
    if (!text || !selectedAssistant) return;

    if(status !== 'IDLE') await stopSession();

    setTextInputValue('');
    setTranscript(prev => [...prev, { speaker: 'You', text }]);
    setStatus('PROCESSING');
    log(`Sending text message: "${text}"`);

    try {
      if (!chatRef.current) {
        const ai = getAi();
        chatRef.current = ai.chats.create({ 
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: selectedAssistant.prompt,
            }
        });
      }
      const response = await chatRef.current.sendMessage({ message: text });
      const responseText = response.text;
      
      if (responseText) {
        log(`Received text response: "${responseText.substring(0, 50)}..."`);
        setTranscript(prev => [...prev, { speaker: 'Gemini', text: responseText }]);
        await playText(responseText);
      } else {
        log("Received empty text response from chat model.");
        setStatus('IDLE');
      }
    } catch (error) {
      log(`Error sending text message: ${(error as Error).message}`);
      setStatus('ERROR');
    }
  };

  const handleSavePersona = () => {
    if (!editingPersona || !editingPersona.title || !editingPersona.prompt) {
        alert("Title and prompt are required.");
        return;
    }
    
    let updatedAssistants = [];
    if (editingPersona.id && !editingPersona.id.startsWith('preset-')) { // Editing existing custom persona
      updatedAssistants = assistants.map(a => a.id === editingPersona.id ? { ...a, ...editingPersona } as Assistant : a);
    } else { // Adding new or editing a preset (creates a custom one)
      const newAssistant: Assistant = {
        id: `custom-${Date.now()}`,
        title: editingPersona.title,
        prompt: editingPersona.prompt,
      };
      updatedAssistants = [...assistants, newAssistant];
      setSelectedAssistantId(newAssistant.id);
    }
  
    setAssistants(updatedAssistants);
    const customAssistants = updatedAssistants.filter(a => a.id.startsWith('custom-'));
    localStorage.setItem('assistants', JSON.stringify(customAssistants));
  
    setPersonaView('select');
    setEditingPersona(null);
  };
  
  const handleDeletePersona = (idToDelete: string) => {
    if (!idToDelete.startsWith('custom-') || !window.confirm(t.deleteConfirm)) return;
    
    const updatedAssistants = assistants.filter(a => a.id !== idToDelete);
    setAssistants(updatedAssistants);
    
    const customAssistants = updatedAssistants.filter(a => a.id.startsWith('custom-'));
    localStorage.setItem('assistants', JSON.stringify(customAssistants));

    if (selectedAssistantId === idToDelete) {
        setSelectedAssistantId(assistants.find(a => a.id.startsWith('preset-'))?.id || '');
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
    // Fix: Cast window to `any` to access the jspdf library attached by the script tag.
    const { jsPDF } = (window as any).jspdf;
    if (!jsPDF) return;
    const doc = new jsPDF();
    let y = 10;
    doc.setFont("Helvetica", "sans-serif");
    transcript.forEach(entry => {
        const text = `${entry.speaker}: ${entry.text}`;
        const splitText = doc.splitTextToSize(text, 180);
        if (y + (splitText.length * 7) > 280) { // adjusted line height
            doc.addPage();
            y = 10;
        }
        doc.text(splitText, 10, y);
        y += (splitText.length * 7);
    });
    doc.save("conversation.pdf");
  }, [transcript]);


  const getPersonaDisplayName = (assistant: Assistant) => {
    if (assistant.titleKey === 'persona_negotiator') {
      return t[assistant.titleKey] || assistant.title || assistant.id;
    }
    return assistant.title || (assistant.titleKey ? t[assistant.titleKey] : assistant.id);
  };
  
  const getPersonaDisplayPrompt = (assistant: Assistant) => {
      if (lang === 'ru' && assistant.id.startsWith('preset-')) {
          const promptKey = `prompt_${assistant.titleKey}`;
          return I18N.ru[promptKey] || assistant.prompt;
      }
      return assistant.prompt;
  };
  
  const handlePersonaMouseOver = (e: React.MouseEvent) => {
    if (selectedAssistant) {
        setTooltipContent(getPersonaDisplayPrompt(selectedAssistant));
        
        const rect = e.currentTarget.getBoundingClientRect();
        if (tooltipRef.current) {
            tooltipRef.current.style.left = `${rect.left}px`;
            tooltipRef.current.style.top = `${rect.bottom + 5}px`;
            tooltipRef.current.style.width = `${rect.width}px`;
        }
        setTooltipVisible(true);
    }
  };

  const handlePersonaMouseOut = () => {
      setTooltipVisible(false);
  };


  if (!selectedAssistant) {
    return <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }
  

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col md:flex-row p-4 gap-4 font-sans">
      {/* --- SETTINGS PANEL --- */}
      <div className={`w-full md:w-1/3 lg:w-1/4 bg-gray-800 rounded-lg p-4 flex-col space-y-4 h-fit sticky top-4 ${isPanelVisible ? 'flex' : 'hidden'}`}>
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{t.personaTitle}</h2>
            <div className="flex items-center space-x-2">
                 <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0L7.86 5.89c-.38.23-.8.43-1.25.59L3.5 7.1c-1.51.22-2.14 2.03-1.06 3.09l2.12 2.12c.16.16.27.36.33.58l.43 1.9c.22 1.01 1.43 1.55 2.4.9l2.36-1.52c.23-.15.5-.23.77-.23s.54.08.77.23l2.36 1.52c.97.65 2.18.11 2.4-.9l.43-1.9c.06-.22.17-.42.33-.58l2.12-2.12c1.08-1.06.45-2.87-1.06-3.09l-3.11-.62c-.45-.09-.87-.28-1.25-.59l-.65-2.72zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                </button>
                <select value={lang} onChange={e => setLang(e.target.value as Language)} className="bg-gray-700 text-white rounded-md p-1 text-sm focus:outline-none">
                    <option value="en">EN</option>
                    <option value="ru">RU</option>
                </select>
            </div>
        </div>
        
        {personaView === 'select' && (
          <div className="relative">
            <div 
                className="flex items-center space-x-2"
                onMouseEnter={handlePersonaMouseOver}
                onMouseLeave={handlePersonaMouseOut}
            >
                <select
                  value={selectedAssistantId}
                  onChange={(e) => {
                      if (e.target.value === 'add-new') {
                          setEditingPersona({ title: '', prompt: '' });
                          setPersonaView('add');
                      } else {
                          setSelectedAssistantId(e.target.value);
                          localStorage.setItem('selectedAssistantId', e.target.value);
                          chatRef.current = null;
                      }
                  }}
                  className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {assistants.map((assistant) => (
                    <option key={assistant.id} value={assistant.id}>
                      {getPersonaDisplayName(assistant)}
                    </option>
                  ))}
                   <option value="add-new" className="text-green-400 font-bold">{t.createNewPersona}</option>
                </select>
                <button onClick={() => {
                    const current = assistants.find(a => a.id === selectedAssistantId);
                    if (current) {
                        setEditingPersona(current);
                        setPersonaView('edit');
                    }
                }} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">
                    {t.editPersona}
                </button>
            </div>
          </div>
        )}
        
        {(personaView === 'select') && (
            <>
            <div>
              <label htmlFor="voice" className="block text-sm font-medium mb-1">{t.voiceSelection}</label>
              <select id="voice" value={selectedVoice} onChange={e => { setSelectedVoice(e.target.value); localStorage.setItem('selectedVoice', e.target.value); }} className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
              </select>
            </div>
            
            {personaSupportsRateAndPitch(selectedAssistant) && (
              <>
                 <div>
                    <label htmlFor="speechRate" className="block text-sm font-medium mb-1">{t.speechRate} ({parseFloat(speakingRate).toFixed(2)})</label>
                    <input type="range" id="speechRate" min="0.5" max="2.0" step="0.1" value={speakingRate} onChange={e => { setSpeakingRate(e.target.value); localStorage.setItem('speakingRate', e.target.value); }} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                 </div>
                 <div>
                    <label htmlFor="pitch" className="block text-sm font-medium mb-1">{t.speechPitch} ({parseFloat(pitch).toFixed(1)})</label>
                    <input type="range" id="pitch" min="-10" max="10" step="0.5" value={pitch} onChange={e => { setPitch(e.target.value); localStorage.setItem('pitch', e.target.value); }} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                 </div>
              </>
            )}
            </>
        )}
        
        {(personaView === 'add' || personaView === 'edit') && editingPersona && (
          <div className="flex flex-col space-y-3">
              <input type="text" value={editingPersona.title || ''} onChange={(e) => setEditingPersona(p => ({ ...p, title: e.target.value }))} placeholder={t.titlePlaceholder} className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <textarea
                value={getPersonaDisplayPrompt(editingPersona as Assistant)}
                onChange={(e) => {
                    if (editingPersona.id?.startsWith('preset-')) {
                         const updatedPersona = { 
                            ...editingPersona,
                            prompt: e.target.value,
                            title: editingPersona.title || getPersonaDisplayName(editingPersona as Assistant),
                            id: `custom-${Date.now()}` // Convert to custom
                         };
                         delete updatedPersona.titleKey;
                         setEditingPersona(updatedPersona);
                    } else {
                        setEditingPersona(p => ({ ...p, prompt: e.target.value }))
                    }
                }}
                placeholder={t.promptPlaceholderWithNote}
                className="w-full bg-gray-700 rounded-md px-3 py-2 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                readOnly={editingPersona.id?.startsWith('preset-') && lang === 'ru'}
              />
              {(editingPersona.id?.startsWith('preset-') && lang === 'ru') && <p className="text-xs text-amber-400">{t.presetPromptReadOnly}</p>}
              <div className="flex justify-end items-center space-x-2">
                 {personaView === 'edit' && editingPersona.id?.startsWith('custom-') && (
                     <button onClick={() => handleDeletePersona(editingPersona.id!)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md text-sm">{t.deletePersona}</button>
                 )}
                 <button onClick={() => { setPersonaView('select'); setEditingPersona(null); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">{t.cancel}</button>
                 <button onClick={handleSavePersona} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">{editingPersona.id?.startsWith('preset-') ? t.save : t.saveChanges}</button>
              </div>
          </div>
        )}
      </div>

      {/* --- MAIN CHAT PANEL --- */}
      <div className={`bg-gray-800 rounded-lg p-4 flex flex-col md:max-h-[calc(100vh-2rem)] ${isPanelVisible ? 'w-full md:w-2/3 lg:w-3/4' : 'w-full'}`}>
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col space-y-4 relative">
            <div className="absolute top-0 right-2 hidden md:block">
                 <button onClick={() => setIsPanelVisible(!isPanelVisible)} className="p-2 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPanelVisible ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                    </svg>
                 </button>
            </div>
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
          {transcript.map((entry, index) => (
            <div key={index} className={`flex items-start ${entry.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-[80%] ${entry.speaker === 'You' ? 'bg-green-900' : 'bg-gray-700'}`}>
                <p className="font-bold text-sm mb-1">{entry.speaker === 'You' ? t.you : t.gemini}</p>
                <p className="text-white whitespace-pre-wrap">{entry.text}</p>
              </div>
               <button onClick={() => handleCopy(entry.text, `msg-copy-${index}`)} className="ml-2 text-gray-400 hover:text-white p-1 self-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{copyButtonText === `msg-copy-${index}` ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}</svg>
                </button>
            </div>
          ))}
           { (interimTranscript) && <div className="text-gray-400 italic self-end h-12"> <span className="font-bold">{t.you}: </span>{interimTranscript}</div>}
           { (finalTranscript) && <div className="text-green-400 italic h-12"><span className="font-bold">{t.gemini}: </span>{finalTranscript}</div> }
          <div ref={transcriptEndRef} />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
             <div className="flex items-center space-x-2">
                <StatusIndicator status={status} lang={lang} />
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
            onClick={status === 'IDLE' || status === 'ERROR' ? startSession : stopSession}
            className={`p-4 rounded-full transition-colors ${status !== 'IDLE' && status !== 'ERROR' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {status !== 'IDLE' && status !== 'ERROR' ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg> :
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            }
          </button>
          <button onClick={sendTextMessage} className="bg-green-600 hover:bg-green-700 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
             <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
                 <div className="flex items-center space-x-2">
                    <span className="font-semibold">{t.logs}</span>
                    <span className="transform transition-transform">{showLogs ? '▼' : '▶'}</span>
                 </div>
                 {showLogs && <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="hover:text-white px-2 py-0.5 rounded">{t.clearLogs}</button>}
             </div>
            {showLogs && (
                <pre className="mt-1 bg-gray-900 p-2 rounded-md overflow-x-auto h-24 border border-gray-700">
                {logs.join('\n')}
                </pre>
            )}
        </div>
      </div>
      {tooltipVisible && (
          <div ref={tooltipRef} className="fixed bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-300 max-w-xs z-50 shadow-lg">
              {tooltipContent}
          </div>
      )}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        lang={lang} 
        onSaveConversation={() => handleCopy(transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'), 'convo-copy')}
        onSavePdf={savePdf}
        copyButtonText={copyButtonText}
        />
    </div>
  );
};
