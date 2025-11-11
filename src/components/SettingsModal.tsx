import React, { useState, useEffect } from 'react';

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

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
    log
}) => {
    const [isAdultMode, setIsAdultMode] = useState(() => localStorage.getItem('isAdultMode') === 'true');
    const [showSaveOptions, setShowSaveOptions] = useState(false);

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
                    log(`Failed to parse settings file: ${(error as Error).message}`, 'ERROR');
                    alert(t.importError);
                }
            };
            reader.readAsText(file);
        }
        event.target.value = '';
    };

    if (!isOpen) return null;

    const isUsingCustomKey = localStorage.getItem('customApiKey') !== null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white text-gray-900 rounded-2xl p-8 max-w-xl w-full shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">{t.advancedSettings}</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <label htmlFor="adult-mode" className="font-medium text-gray-900">{t.adultMode}</label>
                            <p className="text-xs text-gray-600 mt-1">{t.adultModeDesc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="adult-mode" className="sr-only peer" checked={isAdultMode} onChange={() => setIsAdultMode(!isAdultMode)} />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <label htmlFor="dev-mode" className="font-medium text-gray-900">{t.devMode}</label>
                            <p className="text-xs text-gray-600 mt-1">{t.devModeDesc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="dev-mode" className="sr-only peer" checked={isDevMode} onChange={() => setIsDevMode(!isDevMode)} />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <label htmlFor="api-key-input" className="block font-medium text-gray-900 mb-2">{t.customApiKey}</label>
                        <div className="flex items-center space-x-2">
                            <input
                                id="api-key-input"
                                type="password"
                                value={customApiKey}
                                onChange={(e) => onCustomApiKeyChange(e.target.value)}
                                placeholder={t.customApiKeyPlaceholder}
                                className="flex-1 w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                            />
                            <button
                                onClick={onResetApiKey}
                                className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold py-2 px-3 rounded-lg text-sm whitespace-nowrap transition-colors"
                                disabled={!isUsingCustomKey}
                                title={isUsingCustomKey ? t.resetToDefault : 'Already using default key'}
                            >
                                ↺
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{t.customApiKeyDesc}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                         <button onClick={onClearTranscript} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-lg shadow-sm transition-colors">{t.clearTranscript}</button>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                         <button onClick={() => setShowSaveOptions(prev => !prev)} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-5 rounded-lg shadow-sm transition-colors">{t.saveConversation}...</button>
                         {showSaveOptions && (
                            <div className="flex space-x-2 mt-3">
                                <button onClick={onSaveConversation} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm">{copyButtonText === 'convo-copy' ? t.copied : t.copyText}</button>
                                <button onClick={() => onSavePdf?.()} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm">{t.saveAsPdf}</button>
                            </div>
                         )}
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex space-x-4">
                            <button
                                onClick={handleExportSettings}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-lg shadow-sm transition-colors"
                            >
                                {t.exportSettings}
                            </button>
                            <label className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-5 rounded-lg shadow-sm transition-colors cursor-pointer text-center">
                                {t.importSettings}
                                <input type="file" className="hidden" accept=".json" onChange={handleImportSettings} />
                            </label>
                        </div>
                    </div>
                </div>
                 <div className="mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-6 rounded-lg shadow-sm transition-colors">{t.cancel}</button>
                </div>
            </div>
        </div>
    );
};