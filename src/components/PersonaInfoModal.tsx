import React from 'react';
import { Assistant } from '../types';

interface PersonaInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    assistant: Assistant;
    lang: 'en' | 'ru';
    getPersonaDisplayName: (assistant: Assistant, t: Record<string, string>) => string;
    getPersonaDisplayPrompt: (assistant: Assistant, lang: 'en' | 'ru') => string;
    t: Record<string, string>;
}

export const PersonaInfoModal: React.FC<PersonaInfoModalProps> = ({ 
    isOpen, 
    onClose, 
    assistant, 
    lang, 
    getPersonaDisplayName, 
    getPersonaDisplayPrompt, 
    t 
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white text-gray-900 rounded-2xl p-8 max-w-xl w-full shadow-2xl border border-gray-200 mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">{getPersonaDisplayName(assistant, t)}</h2>
                <div className="max-h-[60vh] overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-wrap">{getPersonaDisplayPrompt(assistant, lang)}</p>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-6 rounded-lg shadow-sm transition-colors">{t.cancel}</button>
                </div>
            </div>
        </div>
    );
};
