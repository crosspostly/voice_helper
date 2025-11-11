import React from 'react';
import { Transcript } from '../../../types';

interface TranscriptMessageProps {
  entry: Transcript;
  index: number;
  onCopy: (text: string, buttonId: string) => void;
  strings: Record<string, string>;
}

export const TranscriptMessage: React.FC<TranscriptMessageProps> = ({
  entry,
  index,
  onCopy,
  strings: t
}) => {
  const getSpeakerName = (speaker: string) => {
    switch (speaker) {
      case 'You': return t.you;
      case 'Linguistics': return 'Linguistics';
      case 'Gemini': return t.gemini;
      default: return speaker;
    }
  };

  const getMessageStyle = (speaker: string) => {
    switch (speaker) {
      case 'You': return 'bg-accent text-white';
      case 'Linguistics': return 'bg-grapefruit text-text';
      default: return 'bg-card text-text border border-border';
    }
  };

  const renderMessageContent = (text: string, speaker: string) => {
    if (speaker === 'Gemini' && window.marked) {
      return (
        <div 
          className="prose prose-sm max-w-none text-text" 
          dangerouslySetInnerHTML={{ __html: window.marked.parse(text) }}
        />
      );
    }
    return <p className="whitespace-pre-wrap">{text}</p>;
  };

  return (
    <div className={`flex items-start ${entry.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-xl px-5 py-3 max-w-[80%] shadow-card mb-2 ${getMessageStyle(entry.speaker)} ${entry.isFinal === false ? 'opacity-80' : ''}`}>
        <p className="font-bold text-sm mb-1">
          {getSpeakerName(entry.speaker)}
        </p>
        {renderMessageContent(entry.text, entry.speaker)}
      </div>
      <button 
        onClick={() => onCopy(entry.text, `msg-copy-${index}`)} 
        className="ml-2 text-border hover:text-accent p-1 self-start"
        aria-label={`Copy message ${index}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
};
