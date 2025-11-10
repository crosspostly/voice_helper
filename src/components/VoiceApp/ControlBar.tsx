import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { ChatInput } from './ChatInput';
import { StatusIndicator } from '../../components/StatusIndicator';
import { LogPanel } from './Common/LogPanel';

export const ControlBar: React.FC = () => {
  const { session, audio, ui, language } = useVoiceAppContext();
  const { strings: t } = language;

  const handleMicButtonClick = () => {
    if (session.status === 'SPEAKING') {
      audio.stopAll();
    } else if (session.status === 'IDLE' || session.status === 'ERROR') {
      session.start(session.selectedAssistant!);
    } else {
      session.stop();
    }
  };

  return (
    <>
      {/* Status Bar */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <StatusIndicator status={session.status} t={t} />
        </div>
        {session.isActive && ui.isDevMode && (
          <div className="text-xs text-gray-400 mt-2">
            Session refresh in: {Math.floor(session.timeLeft / 60)}:{(session.timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Input Controls */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center space-x-2">
        <ChatInput />
        
        {/* Microphone Button */}
        <button
          onClick={handleMicButtonClick}
          className={`p-4 rounded-full transition-colors ${
            session.status !== 'IDLE' && session.status !== 'ERROR' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
          aria-label={session.status !== 'IDLE' && session.status !== 'ERROR' ? 'Stop recording' : 'Start recording'}
        >
          {session.status !== 'IDLE' && session.status !== 'ERROR' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                           <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                         </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </button>
      </div>

      {/* Log Panel */}
      <LogPanel />
    </>
  );
};