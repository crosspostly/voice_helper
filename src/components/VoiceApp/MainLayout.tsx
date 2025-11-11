import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { SidePanel } from './SidePanel';
import { TranscriptPanel } from './TranscriptPanel';
import { ControlBar } from './ControlBar';
import { ModalsContainer } from './ModalsContainer';

export const MainLayout: React.FC = () => {
  const { session, language } = useVoiceAppContext();
  const { strings: t } = language;

  return (
    <div className="min-h-screen bg-base text-text flex flex-col font-sans">
      {/* API Key Error Banner */}
      {session.errorState && (
        <div className="bg-red-600 text-white text-center p-3 z-50 font-semibold">
          {session.errorState}
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden p-4 bg-white border-b border-gray-300 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <SidePanel />
        <div className="bg-white p-6 flex flex-col flex-1 md:border-l md:border-gray-300">
          <TranscriptPanel />
          <ControlBar />
        </div>
      </div>

      {/* Modals */}
      <ModalsContainer />
    </div>
  );
};
