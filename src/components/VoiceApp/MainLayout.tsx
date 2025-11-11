import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { SidePanel } from './SidePanel';
import { TranscriptPanel } from './TranscriptPanel';
import { ControlBar } from './ControlBar';
import { ModalsContainer } from './ModalsContainer';

export const MainLayout: React.FC = () => {
  const { session, language, ui } = useVoiceAppContext();
  const { strings: t } = language;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans">
      {/* API Key Error Banner */}
      {session.errorState && (
        <div className="bg-red-600 text-white text-center p-3 z-50 font-semibold">
          {session.errorState}
        </div>
      )}

      {/* Mobile Header with Hamburger Menu */}
      <div className="md:hidden p-3 bg-white border-b border-gray-300 flex justify-between items-center shadow-sm">
        <button
          onClick={() => ui.setIsPanelVisible(true)}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-800">{t.title}</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <SidePanel />
        <div className="bg-white p-4 md:p-6 flex flex-col flex-1 md:border-l md:border-gray-300">
          <TranscriptPanel />
          <ControlBar />
        </div>
      </div>

      {/* Modals */}
      <ModalsContainer />
    </div>
  );
};
