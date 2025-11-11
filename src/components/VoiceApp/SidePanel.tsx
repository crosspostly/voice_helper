import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { PersonaSelector } from './PersonaManager/PersonaSelector';
import { VoiceSettings } from './Settings/VoiceSettings';
import { LanguageSelector } from './Settings/LanguageSelector';

export const SidePanel: React.FC = () => {
  const { ui, language } = useVoiceAppContext();
  const { strings: t } = language;

  return (
    <>
      {/* Desktop Side Panel */}
      <div className="hidden md:flex w-1/3 lg:w-1/4 bg-grapefruit border-r border-border p-6 flex-col space-y-6 overflow-y-auto">
        <SidePanelContent />
      </div>

      {/* Mobile Side Panel */}
      {ui.isPanelVisible && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" 
             onClick={() => ui.setIsPanelVisible(false)} />
      )}
      <div className={`md:hidden fixed top-0 left-0 h-full w-4/5 max-w-xs bg-grapefruit p-6 flex-col space-y-6 overflow-y-auto z-50 shadow-lg transform transition-transform duration-300 ${ui.isPanelVisible ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidePanelContent />
      </div>
    </>
  );
};

const SidePanelContent: React.FC = () => {
  const { ui, language } = useVoiceAppContext();
  const { strings: t } = language;

  return (
    <>
      {/* Header with Settings and Language */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-text">{t.personaTitle}</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => ui.setIsSettingsModalOpen(true)} 
            className="p-2 rounded-full hover:bg-accent/20 bg-card border border-border"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0L7.86 5.89c-.38.23-.8.43-1.25.59L3.5 7.1c-1.51.22-2.14 2.03-1.06 3.09l2.12 2.12c.16.16.27.36.33.58l.43 1.9c.22 1.01 1.43 1.55 2.4.9l2.36-1.52c.23-.15.5-.23.77-.23s.54.08.77.23l2.36 1.52c.97.65 2.18.11 2.4-.9l.43-1.9c.06-.22.17-.42.33-.58l2.12-2.12c1.08-1.06.45-2.87-1.06-3.09l-3.11-.62c-.45-.09-.87-.28-1.25-.59l-.65-2.72zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <LanguageSelector />
        </div>
      </div>
      {/* Persona Selection */}
      <PersonaSelector />
      {/* Voice Settings */}
      <VoiceSettings />
    </>
  );
};
