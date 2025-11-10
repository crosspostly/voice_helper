import React from 'react';
import { useVoiceAppContext } from './VoiceAppContext';
import { TranscriptMessage } from './Common/TranscriptMessage';
import { ProgressCards } from './ProgressCards';
import { ProgressCard } from '../../components/ProgressCard';

export const TranscriptPanel: React.FC = () => {
  const { session, transcript, language } = useVoiceAppContext();
  const { strings: t } = language;
  const { status } = session;

  const handleLoadMore = () => {
    transcript.loadMoreMessages();
  };

  const handleCopy = (text: string, buttonId: string) => {
    transcript.copyToClipboard();
    // This would set copy button text, but that's UI state
    console.log('Copied text:', text);
  };

  if (transcript.transcript.length === 0 && (status === 'IDLE' || status === 'ERROR')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
        <p className="mb-4">{t.startMessage}</p>
        <button 
          onClick={() => session.start(session.selectedAssistant!)} 
          className="bg-green-600 text-white p-6 rounded-full hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>
    );
  }

  if (status === 'LISTENING' && transcript.transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-5xl font-bold text-green-400 animate-pulse">{t.speakNow}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2 flex flex-col space-y-4 relative min-h-0">
      {transcript.canLoadMore && (
        <div className="text-center">
          <button 
            onClick={handleLoadMore} 
            className="bg-gray-700 hover:bg-gray-600 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            {t.loadMore}
          </button>
        </div>
      )}
      
      {transcript.displayedTranscript.map((entry, index) => (
        <div key={index}>
          <TranscriptMessage 
            entry={entry} 
            index={index}
            onCopy={handleCopy}
            strings={t}
          />
          
          {/* Show ProgressCards for linguistics responses with metadata */}
          {entry.speaker === 'Linguistics' && entry.metadata && (
            <div className="mt-2 mb-4">
              <ProgressCards
                progressUpdates={entry.metadata.progress_updates}
                exercises={entry.metadata.exercises}
                contextUsed={entry.metadata.context_used}
                className="ml-2 mr-2"
              />
            </div>
          )}
        </div>
      ))}
      
      <div ref={transcript.transcriptEndRef} />
    </div>
  );
};