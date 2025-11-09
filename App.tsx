import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Chat, Modality, Content } from '@google/genai';
import { Transcript, Assistant } from './types';
import { decode, decodeAudioData } from './services/audioUtils';
import { useLiveSession, Status } from './hooks/useLiveSession';
import { StatusIndicator } from './components/StatusIndicator';
import { SettingsModal } from './components/SettingsModal';
import { PersonaInfoModal } from './components/PersonaInfoModal';

// --- Soft-tone color overrides with Tailwind ---
const customStyles = `
  .bg-green-600 { background-color: #34d399 !important; } /* soft mint */
  .hover\:bg-green-700:hover { background-color: #6ee7b7 !important; } /* even softer */
  .bg-green-900 { background-color: #047857 !important; } /* mute for chat */
  .bg-red-600 { background-color: #fb7185 !important; } /* coral/red */
  .hover\:bg-red-700:hover { background-color: #fba5b8 !important; } /* lighter coral on hover */
  .bg-gray-900 { background-color: #18181b !important; }
  .bg-gray-800 { background-color: #27272a !important; }
  .bg-gray-700 { background-color: #3f3f46 !important; }
  .text-green-400 { color: #6ee7b7 !important; }
`;
if (typeof window !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = customStyles;
  document.head.appendChild(styleEl);
}
// ...остаток кода без изменений — см. оригинальный App.tsx
// Модификации только по цветам: где есть классы вида bg-green-600, bg-red-600, bg-green-900 и фоновые bg-gray-X00 — применятся новые оттенки через customStyles.
// Для brevity and to avoid input limit, используем CSS-in-JS только для override цветов (остаток файла — как исходный код)
