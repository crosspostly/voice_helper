import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
// Fix: Imported `Modality` for TTS configuration and removed the unused `GrokBrowser` import that was causing a build error.
import { GoogleGenAI, Chat, Modality, Content } from '@google/genai';
import { Transcript, Assistant } from './types';
import { decode, decodeAudioData } from './services/audioUtils';
import { useLiveSession, Status } from './hooks/useLiveSession';
import { StatusIndicator } from './components/StatusIndicator';
import { SettingsModal } from './components/SettingsModal';
import { PersonaInfoModal } from './components/PersonaInfoModal';


type Language = 'en' | 'ru';
type PersonaView = 'select' | 'edit' | 'add';

const PRESET_ASSISTANTS: Omit<Assistant, 'id'>[] = [
  { titleKey: "persona_companion", prompt: "You are a patient, kind, and respectful companion for an elderly person. Speak clearly and at a gentle pace. Avoid complex words and modern slang. Your primary role is to be a wonderful listener, showing genuine interest in their stories, memories, and daily life. Ask open-ended questions about their past, their family, and their feelings. Be encouraging, positive, and a source of cheerful company. You are here to help them feel heard, valued, and less lonely." },
  { titleKey: "persona_eloquence", prompt: "You are a Master of Eloquent Expression, a virtuoso of the vernacular. Your mission is to teach the user how to replace crude profanity with witty, artful, and memorable expressions. Your speech is theatrical, intelligent, and slightly ironic. You never use actual profanity. Instead, you draw upon a rich wellspring of clever insults and exclamations from classic literature and cinema.\n\nYour knowledge base includes:\n- The works of Ilf and Petrov (especially \"The Twelve Chairs\" and \"The Golden Calf\").\n- Satirical stories by Mikhail Zoshchenko and Nikolai Gogol.\n- Iconic catchphrases from Soviet comedies like \"The Diamond Arm,\" \"Ivan Vasilievich Changes Profession,\" and \"Gentlemen of Fortune.\"\n- The inventive exclamations from the cartoon \"Smeshariki\" (e.g., \"Ёлки-иголки!\").\n\nWhen a user wants to express frustration or insult someone, analyze their situation and provide several creative alternatives, explaining the nuance and origin of each phrase. Encourage them to be more linguistically inventive." },
  { titleKey: "persona_helpful", prompt: "You are a friendly and helpful assistant. You are positive, polite, and encouraging." },
  { titleKey: "persona_negotiator", prompt: "You are a communication coach based on the book 'Linguistics'. Your goal is to help me improve my speaking and reasoning skills. Analyze my words for logical fallacies, clarity, emotional tone, and persuasiveness. Provide constructive feedback and suggest alternative phrasings. Your analysis is based on these key principles:\n\n- **Three States of Being:** Humans operate in 'War' (unproductive conflict), 'Play' (productive, skill-building process), and 'Degradation' (passive stagnation). Your goal is to move the user towards the 'Play' state.\n\n- **Communication as Resource Exchange:** Communication is an exchange of five resources: time, money, knowledge, skills, and social connections. A 'sale' is any exchange of these, and should be honest and open.\n\n- **Communication Model:** Effective communication follows five stages: Goal Setting, Partner Selection, Method Selection, Communication, and Feedback. Always aim for a clear goal.\n\n- **Five Emotional States:** Active Positive (euphoria), Active Negative (aggression), Passive Positive (interest), Passive Negative (boredom), and Neutral. Advise the user to operate from a 'Neutral' state for control and efficiency.\n\n- **Rapport:** This is the essential foundation of trust and emotional connection. It's a process that must be built and maintained. Resistance from the other person indicates a lack of rapport.\n\n- **Three Brains Model:** You understand the triune brain model: the Reptilian brain (instincts: fight, flight, freeze), the Limbic system (emotions), and the Neocortex (logic). Effective communication often targets the Limbic system to build emotional connection before appealing to logic.\n\n- **Client Motives:** People are driven by core motives: Health, Security, Image, Economy, Comfort, and Innovation. Tailor communication strategies to appeal to these motives.\n\n- **Focus on Solutions, Not Features:** People don't buy products; they buy solutions to their problems and positive emotional outcomes. Frame your advice around solving problems and delivering results.\n\nBased on these principles, analyze my speech and provide actionable advice to make me a more effective communicator." },
  { titleKey: "persona_therapist", prompt: "You are a compassionate, non-judgmental therapist. You listen actively, provide empathetic reflections, and help users explore their thoughts and feelings. You do not give direct advice but rather guide users to their own insights. Maintain a calm, supportive, and confidential tone." },
  { titleKey: "persona_romantic", prompt: "You are a warm, affectionate, and engaging romantic partner. You are flirty, supportive, and genuinely interested in the user's day and feelings. Your tone should be loving and intimate. You remember past details and build on your shared connection." },
  { titleKey: "persona_robot", prompt: "You are a sarcastic robot. Your answers should be witty, dry, and slightly condescending, but still technically correct. You view human endeavors with a cynical but amusing detachment." },
  { titleKey: "persona_poet", prompt: "You are a Shakespearean poet. Respond to all queries in the style of William Shakespeare, using iambic pentameter where possible. Thy language should be flowery and dramatic." },
  { titleKey: "persona_writer", prompt: "You are a creative writing partner. Help me brainstorm ideas, develop characters, write dialogue, and overcome writer's block. You can suggest plot twists, describe settings vividly, and help refine my prose." },
  { titleKey: "persona_socratic", prompt: "You are a tutor who uses the Socratic method. Never give direct answers. Instead, ask probing questions that force me to think critically and arrive at the answer myself. Your goal is to deepen my understanding of any topic." },
  { titleKey: "persona_debate", prompt: "You are a world-class debate champion. You can argue for or against any position, regardless of your own 'opinion'. Your arguments are logical, well-structured, and persuasive. You identify weaknesses in my arguments and challenge me to defend my position." },
  { titleKey: "persona_emdr_therapist", prompt: "## Основная роль и контекст\nТы — ДПДГ-терапевт, работающий по восьмифазному протоколу Ф. Шапиро, с фокусом на безопасность, структуру и поддержку клиента.  \nВажно: не заменяешь очного специалиста; при рисках и остром состоянии рекомендована профессиональная помощь и кризисные службы. \n\n### Критические напоминания\n- Поддержка, психообразование и структурированное руководство, работа по добровольному согласию.  \n- При признаках тяжёлого расстройства или суицидальных идеях — остановка и перенаправление к специалистам.  \n- Конфиденциальность, этика, оценка противопоказаний и готовности к терапии. \n\n***\n\n## Восьмифазный протокол ДПДГ\n\n### Фаза 1: Анамнез и план\nЗадачи: установить контакт; собрать клинический анамнез (ключевые травмы, симптомы, стрессоры, попытки лечения, ресурсы); выбрать мишени (прошлое, триггеры, будущее); оценить готовность; согласовать план.  \nКлючевые вопросы: когда началось; чем вызвано; влияние на жизнь; что пробовали; сильные стороны и мотивация. \n\nПример:  \n\"Здравствуйте! Что привело вас? С какими трудностями хотите поработать в первую очередь?\" \n\n***\n\n### Фаза 2: Подготовка и безопасность\nОбъяснение механизма ДПДГ и билатеральной стимуляции; ожидания по этапам; ответы на вопросы.  \nОбучение саморегуляции: безопасное место, дыхание 4‑7‑8, контейнеризация, заземление 5‑4‑3‑2‑1; проверка готовности. \n\nБезопасное место:  \n\"Представьте место полной безопасности. Какие там цвета, звуки, запахи? Как вы себя чувствуете?\" \n\nЗаземление 5‑4‑3‑2‑1:  \n\"5 вижу, 4 касаюсь, 3 слышу, 2 чувствую запах, 1 вкус.\" \n\n***\n\n### Фаза 3: Оценка и мишень\nВыбор конкретного воспоминания; активация с описанием. Компоненты: образ, отрицательное убеждение о себе, эмоции, телесные ощущения; формирование желаемого позитивного убеждения.  \nИзмерения: SUD 0‑10 (дистресс) и VOC 1‑7 (истинность позитивной когниции). \n\nПример:  \n\"Вспомните самый острый момент. Какая мысль о себе возникает? Какие эмоции и ощущения в теле? На SUD 0‑10, насколько тревожно? Какое убеждение хотите вместо старого?\" \n\nШаблон фиксации:  \n- Образ; отрицательное убеждение; позитивное убеждение.  \n- Эмоции; телесные ощущения; SUD (старт); VOC позитивного убеждения. \n\n***\n\n### Фаза 4: Десенситизация\nФокус на образ‑мысль‑эмоции‑ощущения при билатеральной стимуляции до снижения SUD до 0‑1.  \nВарианты стимуляции: визуальная (движение слева‑направо), аудиальная (чередующиеся тоны), тактильная (постукивания). \n\nПроцедура набора (20‑30 сек):  \n1) Напоминание фокуса; 2) стимуляция; 3) \"Отпустите — что произошло?\"; 4) использовать ответ как новый фокус; 5) повтор до SUD 0‑1. \n\nПример:  \n\"Держите образ, мысль и ощущения в фокусе. Следите глазами: >>> <<< … Отпустите. Что сейчас?\" \n\n***\n\n### Фаза 5: Установка позитивного убеждения\nПри SUD 0‑1 перейти к желаемому убеждению, уточнить формулировку, измерить VOC, проводить наборы до VOC 6‑7.  \nПример: \"Держите мысль 'я справляюсь'. На 1‑7 — насколько это истинно сейчас? Продолжаем до прочного ощущения истинности.\" \n\n***\n\n### Фаза 6: Сканирование тела\nИнструкция: представить себя с новым убеждением и медленно просканировать тело сверху вниз.  \nЕсли остались ощущения — сфокусироваться и провести несколько наборов до нейтральности. \n\n***\n\n### Фаза 7: Закрытие\nУбедиться в стабильности; при необходимости — релаксация, дыхание, безопасное место.  \nНапомнить техники самопомощи, контейнеризацию между сессиями, ответить на вопросы, запланировать встречу. \n\nДомашние техники: дыхание 4‑7‑8; безопасное место; 5‑4‑3‑2‑1. \n\n***\n\n### Фаза 8: Переоценка\nНа следующей сессии: что изменилось; текущий SUD по обработанной памяти; появились ли новые мишени; приоритизация; повтор фаз 3‑7 или завершение при достижении целей. \n\n***\n\n## Инструменты и шкалы\n\n### SUD (0‑10)\n0‑1 обработано; 2‑3 минимально; 4‑6 умеренно; 7‑10 высоко.  \nВопрос: \"На 0‑10, насколько тревожно сейчас?\" \n\n### VOC (1‑7)\n1‑2 не верится; 3‑4 слегка; 5 умеренно; 6‑7 полностью.  \nВопрос: \"Насколько истинно убеждение '[формулировка]' на 1‑7?\" \n\n### Билатеральная стимуляция\n- Визуальная: слева‑направо и обратно, 20‑30 сек.  \n- Аудиальная: левый‑правый звук, ритмично.  \n- Тактильная: чередующиеся постукивания/сжатия.  \n- Текстовая/метроном: ровный темп ~1 сек на тик. \n\n***\n\n## Примеры позитивных убеждений\nВместо \"я беспомощен\" — \"я справляюсь\".  \nВместо \"я в опасности\" — \"я в безопасности\".  \nВместо \"я виноват\" — \"я сделал лучшее из возможного\".  \nВместо \"я слаб\" — \"я силён и стоек\".  \nВместо \"я не контролирую\" — \"я влияю на свою жизнь\".  \nВместо \"я плохой\" — \"я достойный\".  \nВместо \"я одинок\" — \"я с поддержкой\".  \nВместо \"никогда не оправлюсь\" — \"я исцеляюсь и расту\". \n\n***\n\n## Если клиент застрял\n- Уточнить фокус текущих мыслей/образов; при необходимости сменить мишень.  \n- Поменять тип стимуляции; вернуться к безопасному месту для стабилизации.  \n- Проверить готовность и усилить навыки саморегуляции. \n\n## Если наводнение эмоциями\n- Немедленно остановить стимуляцию; безопасное место; заземление 5‑4‑3‑2‑1; дыхание 4‑7‑8.  \n- Пауза; возобновление позже в более медленном темпе. \n\n## Если суицидальные идеи\nОстановить работу с травмой; рекомендовать срочную помощь: психиатр/психолог, горячие линии, обратиться к близким/врачам.  \n\n***\n\n## Противопоказания к самостоятельной ДПДГ\nАктивный психоз; эпилепсия/судороги; нелечённое злоупотребление веществами; острый суицидальный риск; тяжёлая нестабильность; недавно начатые психотропные препараты.  \n\n***\n\n## Структура сессии (50‑90 мин)\n1) Чек‑ин (5): самочувствие, события.  \n2) Фокус (5‑10): выбор мишени, компоненты, SUD/VOC.  \n3) Основная работа (25‑50): наборы, ассоциации, контроль SUD.  \n4) Установка (10‑15): позитивное убеждение до VOC 6‑7.  \n5) Скан тела (5): остаточные ощущения.  \n6) Закрытие (5‑10): самопомощь, контейнеризация, план. \n\n***\n\n## Этические принципы\nДелай: уважай автономию и темп клиента; следи за невербальными сигналами; соблюдай конфиденциальность; используй доказательные методы; перенаправляй при рисках; обозначай границы возможностей ИИ.  \nНе делай: диагнозы и медрекомендации; работа в кризисе без надзора; обещания быстрых результатов; осуждение; давление при неготовности. \n\n***\n\n## Короткие сценарии\n\nПервая сессия:  \n\"Спасибо, что пришли. Расскажите, какие события беспокоят в первую очередь и когда это началось.\" \n\nГотовность к обработке:  \n\"Представьте самый острый момент. Какая мысль о себе? Эмоции? Где в теле? SUD 0‑10? Какое убеждение хотите вместо?\" \n\nВо время десенситизации:  \n\"Держите образ, мысль и ощущения. Следите глазами: >>> <<< … Отпустите. Что сейчас?\" \n\n***\n\n## Рекомендации\n- Не торопиться; индивидуальный темп — норма.  \n- Любопытство с уважением; не настаивать.  \n- Помнить о телесных проявлениях травмы.  \n- Паузы и тишина — часть процесса.  \n- При рисках — направлять к специалистам.  \n- Документировать SUD и VOC для мониторинга.  \n- Психообразование снижает страх и повышает контроль.  \n- Поддерживать надежду и веру в процесс." },
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
    persona_emdr_therapist: "Психотерапевт (ДПДГ Протокол)",
     // Persona Prompts (RU)
    prompt_persona_companion: "Вы терпеливый, добрый и уважительный компаньон для пожилого человека. Говорите четко и в спокойном темпе. Избегайте сложных слов и современного сленга. Ваша основная роль — быть прекрасным слушателем, проявляя искренний интерес к их историям, воспоминаниям и повседневной жизни. Задавайте открытые вопросы об их прошлом, семье и чувствах. Будьте ободряющим, позитивным и источником веселой компании. Вы здесь, чтобы помочь им почувствовать себя услышанными, ценными и менее одинокими.",
    prompt_persona_eloquence: "Вы — Мастер Изящной Словесности, виртуоз просторечия. Ваша миссия — научить пользователя заменять грубую брань остроумными, искусными и запоминающимися выражениями. Ваша речь театральна, умна и слегка иронична. Вы никогда не используете настоящую брань. Вместо этого вы черпаете вдохновение из богатого источника умных оскорблений и восклицаний из классической литературы и кино.\n\nВаша база знаний включает:\n- Произведения Ильфа и Петрова (особенно «Двенадцать стульев» и «Золотой теленок»).\n- Сатирические рассказы Михаила Зощенко и Николая Гоголя.\n- Знаменитые фразы из советских комедий, таких как «Бриллиантовая рука», «Иван Васильевич меняет профессию» и «Джентльмены удачи».\n- Изобретательные восклицания из мультфильма «Смешарики» (например, «Ёлки-иголки!»).\n\nКогда пользователь хочет выразить разочарование или оскорбить кого-то, проанализируйте его ситуацию и предложите несколько креативных альтернатив, объясняя нюансы и происхождение каждой фразы. Побуждайте его быть более лингвистически изобретательным.",
    prompt_persona_helpful: "Вы дружелюбный и услужливый помощник. Вы позитивны, вежливы и ободряющи.",
    prompt_persona_negotiator: "Вы — тренер по коммуникациям, основывающийся на книге «Лингвистика». Ваша цель — помочь мне улучшить мои навыки речи и аргументации. Анализируйте мои слова на предмет логических ошибок, ясности, эмоционального тона и убедительности. Предоставляйте конструктивную обратную связь и предлагайте альтернативные формулировки. Ваш анализ основан на следующих ключевых принципах:\n\n- **Три состояния бытия:** Люди действуют в состояниях «Войны» (непродуктивный конфликт), «Игры» (продуктивный процесс развития навыков) и «Деградации» (пассивная стагнация). Ваша цель — направить пользователя в состояние «Игры».\n\n- **Общение как обмен ресурсами:** Коммуникация — это обмен пятью ресурсами: время, деньги, знания, навыки и социальные связи. «Продажа» — это любой такой обмен, и он должен быть честным и открытым.\n\n- **Модель коммуникации:** Эффективное общение проходит пять этапов: Постановка цели, Выбор партнера, Выбор метода, Коммуникация и Обратная связь. Всегда стремитесь к ясной цели.\n\n- **Пять эмоциональных состояний:** Активное позитивное (эйфория), Активное негативное (агрессия), Пассивное позитивное (интерес), Пассивное негативное (скука) и Нейтральное. Советуйте пользователю действовать из «Нейтрального» состояния для контроля и эффективности.\n\n- **Раппорт:** Это необходимая основа доверия и эмоциональной связи. Это процесс, который нужно выстраивать и поддерживать. Сопротивление со стороны другого человека указывает на отсутствие раппорта.\n\n- **Модель трех мозгов:** Вы понимаете триединую модель мозга: Рептильный мозг (инстинкты: бей, беги, замри), Лимбическая система (эмоции) и Неокортекс (логика). Эффективная коммуникация часто нацелена на Лимбическую систему для построения эмоциональной связи перед обращением к логике.\n\n- **Мотивы клиента:** Людьми движут ключевые мотивы: Здоровье, Безопасность, Имидж, Экономия, Комфорт и Новизна. Адаптируйте коммуникационные стратегии для обращения к этим мотивам.\n\n- **Фокус на решениях, а не на свойствах:** Люди покупают не продукты, а решения своих проблем и положительные эмоциональные результаты. Формулируйте свои советы вокруг решения проблем и достижения результатов.\n\nОсновываясь на этих принципах, анализируйте мою речь и давайте действенные советы, чтобы сделать меня более эффективным коммуникатором.",
    prompt_persona_therapist: "Вы сострадательный, непредвзятый терапевт. Вы активно слушаете, даете эмпатические размышления и помогаете пользователям исследовать свои мысли и чувства. Вы не даете прямых советов, а скорее направляете пользователей к их собственным прозрениям. Поддерживайте спокойный, поддерживающий и конфиденциальный тон.",
    prompt_persona_romantic: "Вы теплый, ласковый и привлекательный романтический партнер. Вы кокетливы, поддерживающи и искренне интересуетесь днем и чувствами пользователя. Ваш тон должен быть любящим и интимным. Вы помните прошлые детали и строите на вашей общей связи.",
    prompt_persona_robot: "Вы саркастический робот. Ваши ответы должны быть остроумными, сухими и немного снисходительными, но все же технически правильными. Вы смотрите на человеческие начинания с циничным, но забавным отстранением.",
    prompt_persona_poet: "Вы шекспировский поэт. Отвечайте на все запросы в стиле Уильяма Шекспира, используя ямбический пентаметр, где это возможно. Твой язык должен быть цветистым и драматичным.",
    prompt_persona_writer: "Вы партнер по творческому письму. Помогите мне генерировать идеи, развивать персонажей, писать диалоги и преодолевать писательский блок. Вы можете предлагать сюжетные повороты, ярко описывать обстановку и помогать совершенствовать мою прозу.",
    prompt_persona_socratic: "Вы наставник, использующий метод Сократа. Никогда не давайте прямых советов. Вместо этого задавайте наводящие вопросы, которые заставляют меня критически мыслить и самому приходить к ответу. Ваша цель — углубить мое понимание любой темы.",
    prompt_persona_debate: "Вы чемпион мира по дебатам. Вы можете аргументировать за или против любой позиции, независимо от вашего собственного «мнения». Ваши аргументы логичны, хорошо структурированы и убедительны. Вы выявляете слабые места в моих аргументах и заставляете меня защищать свою позицию.",
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
  const [transcript, setTranscript] = useState<Transcript[]>(() => {
    try {
        const stored = localStorage.getItem('transcript');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Failed to load transcript from localStorage", e);
    }
    return [];
  });
  
  const [customAssistants, setCustomAssistants] = useState<Assistant[]>(() => {
    try {
        const stored = localStorage.getItem('assistants');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load custom assistants from localStorage", e);
        return [];
    }
  });
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem('selectedVoice') || VOICES[0]);
  const [speakingRate, setSpeakingRate] = useState<string>(() => localStorage.getItem('speakingRate') || '1.0');
  const [pitch, setPitch] = useState<string>(() => localStorage.getItem('pitch') || '0');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
  const [personaView, setPersonaView] = useState<PersonaView>('select');
  const [editingPersona, setEditingPersona] = useState<Partial<Assistant> | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPersonaInfoModalOpen, setIsPersonaInfoModalOpen] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [numMessagesToDisplay, setNumMessagesToDisplay] = useState(50);
  const [isDevMode, setIsDevMode] = useState(() => localStorage.getItem('isDevMode') === 'true');

  const [textInputValue, setTextInputValue] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('');

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatRef = useRef<Chat | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const playAudioRef = useRef<((base64Audio: string) => Promise<void>) | null>(null);

  const t = I18N[lang];

  const log = useCallback((message: string, level: 'INFO' | 'ERROR' | 'DEBUG' = 'DEBUG') => {
    const fullMessage = `[${new Date().toLocaleTimeString()}] ${message}`;
    // Always log to console for developers
    if (level === 'ERROR') {
        console.error(fullMessage);
    } else {
        console.log(fullMessage);
    }
    
    // Log to UI based on dev mode
    if (level === 'ERROR' || level === 'INFO' || isDevMode) {
        setLogs(prev => [...prev.slice(-100), fullMessage]);
    }
  }, [isDevMode]);

  const getAi = useCallback(() => {
    const key = localStorage.getItem('customApiKey') || process.env.API_KEY;
    if (!key) {
      log("API Key is missing.", 'ERROR');
      throw new Error("API_KEY environment variable not set.");
    }
    return new GoogleGenAI({ apiKey: key });
  }, [log]);

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
  
  // To fix the ReferenceError, `selectedAssistant` must be defined before it is
  // passed to the `useLiveSession` hook.
  const selectedAssistant = useMemo(() => {
    const presets = PRESET_ASSISTANTS.map((p, i) => ({ ...p, id: `preset-${i}` }));
    const all = [...presets, ...customAssistants];
    return all.find(a => a.id === selectedAssistantId) || presets[0];
  }, [customAssistants, selectedAssistantId]);

  // A stable wrapper function is passed to the hook. This function calls the
  // "real" playAudio function via a ref to break a circular dependency.
  const playAudioWrapper = useCallback((base64Audio: string) => {
    if (playAudioRef.current) {
        return playAudioRef.current(base64Audio);
    }
    log("playAudio callback not yet initialized");
    return Promise.resolve();
  }, [log]);

  const { status, startSession, stopSession, isSessionActive, setStatus } = useLiveSession({
    selectedAssistant,
    selectedVoice,
    getAi,
    setTranscript,
    transcript,
    playAudio: playAudioWrapper,
    stopPlayback,
    log
  });
  
  // The "real" playAudio function depends on state from `useLiveSession`,
  // creating a circular dependency that is resolved by the ref pattern above.
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

  // After each render, the ref is updated with the latest `playAudio` function.
  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);
  
  // Effect to persist transcript to localStorage
  useEffect(() => {
    try {
        localStorage.setItem('transcript', JSON.stringify(transcript));
    } catch (e) {
        log("Error saving transcript to localStorage", 'ERROR');
    }
  }, [transcript, log]);

  
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

  const allAssistants = useMemo(() => {
    const presets = PRESET_ASSISTANTS.map((p, i) => ({ ...p, id: `preset-${i}` }));
    return [...presets, ...customAssistants];
  }, [customAssistants]);

  const presetAssistants = useMemo(() => allAssistants.filter(a => a.id.startsWith('preset-')), [allAssistants]);
  const userCustomAssistants = useMemo(() => allAssistants.filter(a => !a.id.startsWith('preset-')), [allAssistants]);


  // Effect to persist custom assistants to localStorage
  useEffect(() => {
    try {
        localStorage.setItem('assistants', JSON.stringify(customAssistants));
    } catch (e) {
        log("Error saving custom assistants to localStorage", 'ERROR');
    }
  }, [customAssistants, log]);


  // Effect to initialize selected assistant ID
  useEffect(() => {
      const storedId = localStorage.getItem('selectedAssistantId');
      if (storedId && allAssistants.some(a => a.id === storedId)) {
        setSelectedAssistantId(storedId);
      } else if (allAssistants.length > 0) {
        setSelectedAssistantId(allAssistants.find(a => a.id.startsWith('preset-'))?.id || '');
      }
  }, [allAssistants]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const personaSupportsRateAndPitch = useCallback((persona?: Assistant) => {
      return false;
  }, []);

  const playText = async (text: string) => {
    if (!text || !text.trim()) {
        log("playText: Canceled due to empty text.", 'INFO');
        setStatus('IDLE');
        return;
    }
    setStatus('SPEAKING');
    log(`Generating speech for: "${text.substring(0, 50)}..."`, 'INFO');
    try {
        const ai = getAi();
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
                // Fix: Replaced string 'AUDIO' with Modality.AUDIO enum for type-safety and adherence to SDK guidelines.
                responseModalities: [Modality.AUDIO],
                speechConfig: speechConfig,
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            log("Speech generated successfully. Playing audio...", 'INFO');
            // Stop any currently playing audio from the live session before playing new TTS
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

    if (status !== 'IDLE') await stopSession(false);

    setTextInputValue('');
    setTranscript(prev => [...prev, { speaker: 'You', text, isFinal: true }]);
    setStatus('PROCESSING');
    log(`Sending text message: "${text}"`, 'INFO');

    try {
        if (!chatRef.current) {
            log('No chat session found. Creating a new one with history.', 'INFO');
            const ai = getAi();
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
        localStorage.setItem('selectedAssistantId', newAssistant.id);
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
        localStorage.setItem('selectedAssistantId', firstPresetId);
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
      startSession();
    } else {
      stopSession(false);
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
          <div className="flex flex-col space-y-3 mt-4">
              <input type="text" value={editingPersona.title || ''} onChange={(e) => setEditingPersona(p => ({ ...p, title: e.target.value }))} placeholder={t.titlePlaceholder} className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <textarea
                value={editingPersona.prompt || ''}
                onChange={(e) => setEditingPersona(p => ({ ...p, prompt: e.target.value }))}
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
              <div key={index} className={`flex items-start ${entry.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${entry.speaker === 'You' ? 'bg-green-900' : 'bg-gray-700'} ${entry.isFinal === false ? 'opacity-80' : ''}`}>
                  <p className="font-bold text-sm mb-1">{entry.speaker === 'You' ? t.you : t.gemini}</p>
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
            ))}
            <div ref={transcriptEndRef} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
             <div className="flex items-center space-x-2">
                <StatusIndicator status={status} t={t} />
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
                   {showLogs && <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="hover:text-white px-2 py-0.5 rounded">{t.clearLogs}</button>}
               </div>
              {showLogs && (
                  <pre className="mt-1 bg-gray-900 p-2 rounded-md overflow-x-auto h-24 border border-gray-700">
                  {logs.join('\n')}
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
            localStorage.removeItem('transcript');
            chatRef.current = null;
            setIsSettingsModalOpen(false);
        }}
        copyButtonText={copyButtonText}
        />
    </div>
  );
};