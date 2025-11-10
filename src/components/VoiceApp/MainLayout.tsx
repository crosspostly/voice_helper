import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { SidePanel } from './SidePanel';
import { TranscriptPanel } from './TranscriptPanel';
import { ControlBar } from './ControlBar';
import { ModalsContainer } from './ModalsContainer';

export const MainLayout: React.FC = () => {
  const { session, language } = useVoiceAppContext();
  const { strings: t } = language;

  if (!session.selectedAssistant) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
      {/* API Key Error Banner */}
      {!session.selectedAssistant && (
        <div className="bg-red-600 text-white text-center p-2 z-50">
          {t.apiKeyError}
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <SidePanel />
        <div className="bg-gray-800 p-4 flex flex-col flex-1 md:border-l md:border-gray-700 flex-1">
          <TranscriptPanel />
          <ControlBar />
        </div>
      </div>

      {/* Modals */}
      <ModalsContainer />
    </div>
  );
};