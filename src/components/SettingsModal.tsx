import React, { useState, useEffect } from 'react';

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

// Temporary fallback for missing translations
const FALLBACK_TEXTS_RU = {
    advancedSettings: 'Расширенные настройки',
    adultMode: 'Режим 18+',
    adultModeDesc: 'Включает более откровенные диалоги',
    devMode: 'Режим разработчика',
    devModeDesc: 'Включает подробное логирование',
    customApiKey: 'Свой API ключ Gemini',
    customApiKeyPlaceholder: 'Введите API ключ',
    customApiKeyDesc: 'Если пусто, будет использован ключ по умолчанию',
    clearTranscript: 'Очистить диалог',
    saveConversation: 'Сохранить Разговор',
    copyText: 'Копировать текст',
    copied: 'Скопировано!',
    saveAsPdf: 'Сохранить в PDF',
    exportSettings: 'Экспорт настроек',
    importSettings: 'Импорт настроек',
    cancel: 'Отмена',
    resetToDefault: 'Сбросить'
};

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lang: 'en' | 'ru';
    isDevMode: boolean;
    setIsDevMode: (value: boolean) => void;
    onSaveConversation: () => void;
    onSavePdf: () => void;
    onClearTranscript: () => void;
    copyButtonText: string;
    t: Record<string, string>;
    customApiKey: string;
    onCustomApiKeyChange: (key: string) => void;
    onResetApiKey: () => void;
    log: (message: string, level?: 'INFO' | 'ERROR' | 'DEBUG') => void;
    useProxy?: boolean;
    setUseProxy?: (value: boolean) => void;
    autoDetectedBlock?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    lang, 
    isDevMode, 
    setIsDevMode, 
    onSaveConversation, 
    onSavePdf, 
    onClearTranscript, 
    copyButtonText, 
    t,
    customApiKey,
    onCustomApiKeyChange,
    onResetApiKey,
    log,
    useProxy = true,
    setUseProxy,
    autoDetectedBlock = false
}) => {
    const [isAdultMode, setIsAdultMode] = useState(() => localStorage.getItem('isAdultMode') === 'true');
    const [showSaveOptions, setShowSaveOptions] = useState(false);

    useEffect(() => {
        if (isOpen) {
            console.log('Settings Modal - Translations:', t);
        }
    }, [isOpen, t]);

    useEffect(() => {
        try {
            localStorage.setItem('isAdultMode', String(isAdultMode));
        } catch(e) {
            log(`Failed to save isAdultMode to localStorage: ${(e as Error).message}`, 'ERROR');
        }
    }, [isAdultMode, log]);

    useEffect(() => {
        try {
            localStorage.setItem('isDevMode', String(isDevMode));
        } catch(e) {
            log(`Failed to save isDevMode to localStorage: ${(e as Error).message}`, 'ERROR');
        }
    }, [isDevMode, log]);

    const handleExportSettings = () => {
        try {
            const settings = {
                assistants: JSON.parse(localStorage.getItem('assistants') || '[]'),
                selectedAssistantId: localStorage.getItem('selectedAssistantId') || '',
                selectedVoice: localStorage.getItem('selectedVoice') || VOICES[0],
                speakingRate: localStorage.getItem('speakingRate') || '1.0',
                pitch: localStorage.getItem('pitch') || '0',
                isAdultMode,
                isDevMode,
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
        } catch (e) {
            log(`Failed to export settings: ${(e as Error).message}`, 'ERROR');
            alert('Failed to export settings.');
        }
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
                        if (typeof settings.isDevMode === 'boolean') {
                            setIsDevMode(settings.isDevMode);
                            localStorage.setItem('isDevMode', String(settings.isDevMode));
                        }
                        if (settings.lang) {
                            localStorage.setItem('language', settings.lang);
                        }
                        alert(t.importSuccess || 'Настройки успешно импортированы!');
                        window.location.reload(); 
                    }
                } catch (error) {
                    log(`Failed to parse settings file: ${(error as Error).message}`, 'ERROR');
                    alert(t.importError || 'Ошибка импорта. Возможно, файл поврежден.');
                }
            };
            reader.readAsText(file);
        }
        event.target.value = '';
    };

    if (!isOpen) return null;
    const isUsingCustomKey = localStorage.getItem('customApiKey') !== null;
    // Helper for fallback
    const F = (key: string, fallback: string) => (t && t[key]) ? t[key] : FALLBACK_TEXTS_RU[key] || fallback;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 sm:mb-6 text-center text-text">{F('advancedSettings')}</h2>
                <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between p-3 bg-grapefruit rounded-lg">
                        <div className="flex-1 mr-3">
                            <label htmlFor="adult-mode" className="font-medium text-text text-sm sm:text-base">{F('adultMode')}</label>
                            <p className="text-xs text-gray-500 mt-1">{F('adultModeDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" id="adult-mode" className="sr-only peer" checked={isAdultMode} onChange={() => setIsAdultMode(!isAdultMode)} />
                            <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-grapefruit rounded-lg">
                        <div className="flex-1 mr-3">
                            <label htmlFor="dev-mode" className="font-medium text-text text-sm sm:text-base">{F('devMode')}</label>
                            <p className="text-xs text-gray-500 mt-1">{F('devModeDesc')}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" id="dev-mode" className="sr-only peer" checked={isDevMode} onChange={() => setIsDevMode(!isDevMode)} />
                            <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                    </div>
                    <div className="mb-4 p-4 bg-[#FDF6ED] rounded-lg border border-gray-300">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useProxy}
                                    onChange={(e) => setUseProxy?.(e.target.checked)}
                                    className="w-4 h-4 accent-green-600"
                                />
                                <span className="text-sm font-medium text-gray-900">
                                    🌐 {lang === 'ru' ? 'Использовать прокси-сервер' : 'Use proxy server'}
                                </span>
                            </label>
                            {autoDetectedBlock && (
                                <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded font-medium">
                                    {lang === 'ru' ? 'Авто' : 'Auto'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600">
                            {lang === 'ru'
                                ? 'Обход блокировок Google AI в России и других странах. Автоматически включается при ошибке геолокации.'
                                : 'Bypass Google AI blocking in Russia and other countries. Auto-enabled when geo-blocking is detected.'}
                        </p>
                    </div>
                    <div className="p-3 bg-grapefruit rounded-lg">
                        <label htmlFor="api-key-input" className="block font-medium text-text mb-1 text-sm sm:text-base">{F('customApiKey')}</label>
                        <div className="flex items-center space-x-2">
                            <input
                                id="api-key-input"
                                type="password"
                                value={customApiKey}
                                onChange={(e) => onCustomApiKeyChange(e.target.value)}
                                placeholder={F('customApiKeyPlaceholder')}
                                className="flex-1 w-full bg-white text-text border-2 border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none"
                            />
                            <button
                                onClick={onResetApiKey}
                                className="bg-gray-500 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-md text-sm whitespace-nowrap transition-colors flex-shrink-0"
                                disabled={!isUsingCustomKey}
                                title={isUsingCustomKey ? F('resetToDefault') : 'Already using default key'}
                            >
                                ↺
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{F('customApiKeyDesc')}</p>
                    </div>
                    <div className="p-3 bg-grapefruit rounded-lg">
                         <button onClick={onClearTranscript} className="w-full bg-accent2 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm sm:text-base">{F('clearTranscript')}</button>
                    </div>
                    <div className="p-3 bg-grapefruit rounded-lg">
                         <button onClick={() => setShowSaveOptions(prev => !prev)} className="w-full bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm sm:text-base">{F('saveConversation')}...</button>
                         {showSaveOptions && (
                            <div className="flex space-x-2 mt-2">
                                <button onClick={onSaveConversation} className="flex-1 bg-gray-400 hover:bg-grapefruit text-text font-bold py-2 px-3 sm:px-4 rounded-md transition-colors text-xs sm:text-sm">{copyButtonText === 'convo-copy' ? F('copied') : F('copyText')}</button>
                                <button onClick={() => onSavePdf?.()} className="flex-1 bg-gray-400 hover:bg-grapefruit text-text font-bold py-2 px-3 sm:px-4 rounded-md transition-colors text-xs sm:text-sm">{F('saveAsPdf')}</button>
                            </div>
                         )}
                    </div>
                    <div className="p-3 bg-grapefruit rounded-lg">
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                            <button
                                onClick={handleExportSettings}
                                className="flex-1 bg-accent hover:bg-green-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm sm:text-base"
                            >
                                {F('exportSettings')}
                            </button>
                            <label className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer text-center text-sm sm:text-base">
                                {F('importSettings')}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportSettings} />
                            </label>
                        </div>
                    </div>
                </div>
                 <div className="mt-4 sm:mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-500 hover:bg-gray-400 text-text font-bold py-2 px-5 sm:px-6 rounded-md transition-colors text-sm sm:text-base">{F('cancel')}</button>
                </div>
            </div>
        </div>
    );
};