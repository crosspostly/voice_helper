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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-3 sm:mb-4 text-center text-white">{getPersonaDisplayName(assistant, t)}</h2>
                <div className="flex-1 overflow-y-auto bg-gray-900 p-3 rounded-md border border-gray-700">
                    <p className="text-gray-300 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{getPersonaDisplayPrompt(assistant, lang)}</p>
                </div>
                <div className="mt-4 sm:mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-5 sm:px-6 rounded-md transition-colors text-sm sm:text-base">{t.cancel}</button>
                </div>
            </div>
        </div>
    );
};
