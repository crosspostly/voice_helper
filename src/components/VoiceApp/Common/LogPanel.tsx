import React from 'react';
import { useVoiceAppContext } from '../VoiceAppContext';

export const LogPanel: React.FC = () => {
  const { ui, logger, language } = useVoiceAppContext();
  const { strings: t } = language;

  const toggleLogs = () => {
    ui.setShowLogs(!ui.showLogs);
  };

  const clearLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.clearLogs();
  };

  return (
    <div className="mt-2 text-xs text-text opacity-70">
      <div 
        className="flex items-center justify-between cursor-pointer" 
        onClick={toggleLogs}
      >
        <div className="flex items-center space-x-2">
          <span className="font-semibold">{t.logs}</span>
          <span className="transform transition-transform">
            {ui.showLogs ? '▼' : '▶'}
          </span>
        </div>
        {ui.showLogs && (
          <button 
            onClick={clearLogs} 
            className="hover:text-text px-2 py-0.5 rounded hover:bg-base"
          >
            {t.clearLogs}
          </button>
        )}
      </div>
      {ui.showLogs && (
        <pre className="mt-1 bg-gray-900 p-2 rounded-md overflow-x-auto h-24 border border-gray-700 text-gray-300">
          {logger.logs.join('\n')}
        </pre>
      )}
    </div>
  );
};