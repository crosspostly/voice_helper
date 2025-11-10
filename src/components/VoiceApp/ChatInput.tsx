import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';

export const ChatInput: React.FC = () => {
  const { session, ui, language } = useVoiceAppContext();
  const { strings: t } = language;

  const handleSendTextMessage = async () => {
    const text = ui.textInputValue.trim();
    if (!text || !session.selectedAssistant) return;

    await session.sendText(text);
    ui.setTextInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendTextMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ui.setTextInputValue(e.target.value);
  };

  return (
    <>
      <input 
        type="text" 
        value={ui.textInputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-gray-700 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500" 
        placeholder={t.sendMessage}
        disabled={session.status === 'SPEAKING'}
      />
      <button 
        onClick={handleSendTextMessage} 
        className="bg-green-600 hover:bg-green-700 p-3 rounded-full disabled:bg-gray-600 disabled:cursor-not-allowed"
        disabled={!ui.textInputValue.trim() || session.status === 'SPEAKING'}
        aria-label="Send message"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>
    </>
  );
};