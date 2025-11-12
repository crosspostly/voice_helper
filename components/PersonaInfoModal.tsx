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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 text-center">{getPersonaDisplayName(assistant, t)}</h2>
                <div className="max-h-[60vh] overflow-y-auto bg-gray-900 p-3 rounded-md border border-gray-700">
                    <p className="text-gray-300 whitespace-pre-wrap">{getPersonaDisplayPrompt(assistant, lang)}</p>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md transition-colors">{t.cancel}</button>
                </div>
            </div>
        </div>
    );
};
