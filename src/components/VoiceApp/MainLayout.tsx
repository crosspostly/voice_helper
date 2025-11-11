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
        <div className="bg-accent2 text-white text-center p-2 z-50">
          {session.errorState}
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden p-4 bg-grapefruit flex justify-between items-center border-b border-border">
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <SidePanel />
        <div className="bg-card p-4 flex flex-col flex-1 md:border-l md:border-border flex-1">
          <TranscriptPanel />
          <ControlBar />
        </div>
      </div>

      {/* Modals */}
      <ModalsContainer />
    </div>
  );
};
