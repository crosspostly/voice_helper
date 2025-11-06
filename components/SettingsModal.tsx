import React, { useState, useEffect } from 'react';

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir']; // Keep a local copy if needed, or pass via props

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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, lang, isDevMode, setIsDevMode, onSaveConversation, onSavePdf, onClearTranscript, copyButtonText, t }) => {
    const [isAdultMode, setIsAdultMode] = useState(() => localStorage.getItem('isAdultMode') === 'true');
    const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('customApiKey') || '');
    const [showSaveOptions, setShowSaveOptions] = useState(false);
    const [notification, setNotification] = useState<string>('');
    const [isUsingCustomKey, setIsUsingCustomKey] = useState(() => !!localStorage.getItem('customApiKey'));

    useEffect(() => {
        localStorage.setItem('isAdultMode', String(isAdultMode));
    }, [isAdultMode]);

    useEffect(() => {
        localStorage.setItem('isDevMode', String(isDevMode));
    }, [isDevMode]);

    const handleApiKeyChange = (value: string) => {
        setCustomApiKey(value);
        if (value.trim()) {
            localStorage.setItem('customApiKey', value);
            setIsUsingCustomKey(true);
            showNotification(lang === 'ru' ? '✓ Свой API ключ активирован' : '✓ Custom API key activated');
        } else {
            localStorage.removeItem('customApiKey');
            setIsUsingCustomKey(false);
            showNotification(lang === 'ru' ? '✓ Использован ключ по умолчанию' : '✓ Using default API key');
        }
    };

    const handleResetApiKey = () => {
        setCustomApiKey('');
        localStorage.removeItem('customApiKey');
        setIsUsingCustomKey(false);
        showNotification(lang === 'ru' ? '✓ Ключ сброшен на стандартный' : '✓ Reset to default API key');
    };

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(''), 3000);
    };
    
    const handleExportSettings = () => {
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
                        if (typeof settings.isDevMode === 'boolean') {
                            setIsDevMode(settings.isDevMode);
                            localStorage.setItem('isDevMode', String(settings.isDevMode));
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
        event.target.value = '';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
            {notification && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[60] animate-fade-in">
                    {notification}
                </div>
            )}
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-6 text-center">{t.advancedSettings}</h2>
                <div className="space-y-4">
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
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div>
                            <label htmlFor="dev-mode" className="font-medium text-white">{t.devMode}</label>
                            <p className="text-xs text-gray-400">{t.devModeDesc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="dev-mode" className="sr-only peer" checked={isDevMode} onChange={() => setIsDevMode(!isDevMode)} />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                    <div className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="api-key-input" className="block font-medium text-white">{t.customApiKey}</label>
                            {isUsingCustomKey && (
                                <span className="text-xs text-green-400 font-semibold">{lang === 'ru' ? '● Свой ключ' : '● Custom key'}</span>
                            )}
                            {!isUsingCustomKey && (
                                <span className="text-xs text-gray-400">{lang === 'ru' ? '○ По умолчанию' : '○ Default'}</span>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <input
                                id="api-key-input"
                                type="password"
                                value={customApiKey}
                                onChange={(e) => setCustomApiKey(e.target.value)}
                                onBlur={(e) => handleApiKeyChange(e.target.value)}
                                placeholder={t.customApiKeyPlaceholder}
                                className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                            />
                            {isUsingCustomKey && (
                                <button
                                    onClick={handleResetApiKey}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-md transition-colors text-sm font-semibold"
                                    title={lang === 'ru' ? 'Сбросить' : 'Reset'}
                                >
                                    ↺
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{t.customApiKeyDesc}</p>
                    </div>
                    <div className="p-3 bg-gray-700 rounded-lg">
                         <button onClick={onClearTranscript} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">{t.clearTranscript}</button>
                    </div>
                    <div className="p-3 bg-gray-700 rounded-lg">
                         <button onClick={() => setShowSaveOptions(prev => !prev)} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">{t.saveConversation}...</button>
                         {showSaveOptions && (
                            <div className="flex space-x-2 mt-2">
                                <button onClick={onSaveConversation} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">{copyButtonText === 'convo-copy' ? t.copied : t.copyText}</button>
                                <button onClick={onSavePdf} className="flex-1 bg-gray-500 hover:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">{t.saveAsPdf}</button>
                            </div>
                         )}
                    </div>
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