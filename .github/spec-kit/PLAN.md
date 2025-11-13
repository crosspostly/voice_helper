# 🛠️ Plan — Технический план реализации

## Frontend Stack
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.6.3
- **Build Tool**: Vite 6.0.1
- **Styling**: Tailwind CSS 3.4.15
- **Deployment**: Vercel

## Core Dependencies
- `@google/genai`: 0.23.0 (Gemini SDK)
- `jspdf`: 2.5.2 (PDF export)
- `marked`: 15.0.4 (Markdown rendering)

## Architecture

### Hooks
- `useLiveSession`: Управление WebSocket-сессией с Gemini Live API
- `useWakeLock`: Поддержка Wake Lock API (предотвращение блокировки экрана)
- `usePersistentState`: Обёртка над localStorage для синхронизации state
- `useLogger`: Централизованное логирование с уровнями (INFO, ERROR, DEBUG)
- `useAutoReconnectTimer`: Таймер для автопереподключения (4.5 мин)

### Components
- `App.tsx`: Главный компонент (монолитный, после отката)
- `SettingsModal.tsx`: Модалка расширенных настроек
- `PersonaInfoModal.tsx`: Инфо о текущей персоне
- `StatusIndicator.tsx`: Индикатор статуса сессии
- `ProgressCard.tsx`: (legacy) Карточки прогресса для Linguistics

### Services
- `audioUtils.ts`: Утилиты для работы с аудио (decode, createBlob)

### State Management
- **Local state**: `useState` для UI-компонентов
- **Persistent state**: `usePersistentState` для долгоживущих данных (transcript, assistants, settings)
- **Refs**: `useRef` для WebSocket, AudioContext, MediaStream (избегание stale closures)

## Data Flow

### Голосовой диалог
1. Пользователь нажимает микрофон → `startSession()`
2. `getUserMedia()` → создание `MediaStreamSource`
3. AudioWorklet обрабатывает PCM chunks → `sendRealtimeInput()`
4. WebSocket отправляет аудио в Gemini Live API
5. Gemini отвечает через WebSocket (транскрипция + аудио)
6. Аудио декодируется и воспроизводится через AudioContext
7. Транскрипция отображается в UI

### Текстовый диалог
1. Пользователь вводит текст → `sendTextMessage()`
2. Запрос через Gemini Chat API (не Live API)
3. Ответ преобразуется в аудио через TTS (gemini-2.5-flash-preview-tts)
4. Аудио воспроизводится, транскрипция добавляется в чат

## Storage

### localStorage keys
- `transcript`: История диалога (массив Transcript[])
- `assistants`: Кастомные персоны (массив Assistant[])
- `selectedAssistantId`: ID выбранной персоны
- `selectedVoice`: Выбранный голос (Zephyr, Puck, etc.)
- `language`: Язык интерфейса ('en' | 'ru')
- `customApiKey`: Кастомный API key (если установлен)
- `isDevMode`: Включён ли dev mode
- `isAdultMode`: Включён ли режим 18+

## Security

### API Key Protection
- Default key имеет domain restriction (voice-helper-peach.vercel.app)
- Custom key хранится в localStorage (небезопасно, но нет альтернативы без бэкенда)
- Никакие ключи не хардкодятся в коде (переменные окружения для дефолтного)

### Content Safety
- Режим 18+ отключает Content Safety фильтры Gemini (на свой страх и риск)
- По умолчанию включена модерация контента

## Performance

### Optimization
- Audio chunks отправляются батчами (160 samples = 10ms)
- Keep-alive пакеты каждые 20 секунд (предотвращение таймаута)
- Автопереподключение с exponential backoff (2^n seconds)
- Lazy loading для PersonaEditor/модалок

### Bottlenecks
- WebSocket latency (~200-500ms RTT)
- Audio encoding/decoding (minimal, через Web Audio API)
- localStorage write operations (sync, могут блокировать UI)

## Deployment

### Build Process
```bash
npm run build
# → dist/ folder
```

### Vercel Config
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `VITE_GEMINI_API_KEY`

### Domain
- Production: https://voice-helper-peach.vercel.app
- Preview: автогенерируемые URL для PR
