import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { SettingsModal } from '../../components/SettingsModal';
import { PersonaInfoModal } from '../../components/PersonaInfoModal';

export const ModalsContainer: React.FC = () => {
  const { session, ui, language, logger } = useVoiceAppContext();
  const { strings: t } = language;

  const handleSaveConversation = () => {
    const conversationText = session.transcript.transcript
      .map((t: any) => `${t.speaker}: ${t.text}`)
      .join('\n');
    
    navigator.clipboard.writeText(conversationText);
    // This would set copy button text in real implementation
  };

  const handleClearTranscript = () => {
    session.transcript.clear();
    ui.setIsSettingsModalOpen(false);
  };

  const handleCustomApiKeyChange = (key: string) => {
    ui.setCustomApiKey(key);
  };

  const handleResetApiKey = () => {
    ui.setCustomApiKey('');
  };

  const getPersonaDisplayName = (assistant: any) => {
    return assistant.title || (assistant.titleKey ? t[assistant.titleKey] : assistant.id);
  };

  const getPersonaDisplayPrompt = (assistant: any, lang: string) => {
    if (lang === 'ru' && assistant.id?.startsWith('preset-')) {
      const promptKey = `prompt_${assistant.titleKey}`;
      // This would get from locale strings
      return assistant.prompt;
    }
    return assistant.prompt;
  };

  return (
    <>
      <PersonaInfoModal 
        isOpen={ui.isPersonaInfoModalOpen}
        onClose={() => ui.setIsPersonaInfoModalOpen(false)}
        assistant={session.selectedAssistant}
        lang={language.locale}
        getPersonaDisplayName={getPersonaDisplayName}
        getPersonaDisplayPrompt={getPersonaDisplayPrompt}
        t={t}
      />
      
      <SettingsModal 
        isOpen={ui.isSettingsModalOpen} 
        onClose={() => ui.setIsSettingsModalOpen(false)} 
        lang={language.locale} 
        t={t}
        isDevMode={ui.isDevMode}
        setIsDevMode={ui.setIsDevMode}
        onSaveConversation={handleSaveConversation}
        onSavePdf={() => session.transcript?.exportToPdf?.()}
        onClearTranscript={handleClearTranscript}
        copyButtonText={ui.copyButtonText}
        customApiKey={ui.customApiKey}
        onCustomApiKeyChange={handleCustomApiKeyChange}
        onResetApiKey={handleResetApiKey}
        log={logger.log}
      />
    </>
  );
};