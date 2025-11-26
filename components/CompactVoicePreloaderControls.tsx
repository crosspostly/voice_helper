import React from 'react';

interface CompactVoicePreloaderControlsProps {
  preloadedCount: number;
  totalCount: number;
  isPreloadingAll: boolean;
  isPreloading: boolean;
  onPreloadAll: () => void;
  disabled?: boolean;
  lang: 'en' | 'ru';
  t: Record<string, string>;
}

export const CompactVoicePreloaderControls: React.FC<CompactVoicePreloaderControlsProps> = ({
  preloadedCount,
  totalCount,
  isPreloadingAll,
  isPreloading,
  onPreloadAll,
  disabled = false,
  lang,
  t
}) => {
  const percentage = (preloadedCount / totalCount) * 100;
  const isComplete = preloadedCount === totalCount;

  return (
    <div className="mt-2 p-2 bg-gray-700 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-300">
          {lang === 'ru' ? 'Предзагружено:' : 'Preloaded:'}
        </span>
        <span className="text-xs font-medium text-green-400">
          {preloadedCount} / {totalCount}
        </span>
      </div>
      
      {/* Progress bar - only show if not complete */}
      {!isComplete && (
        <div className="w-full bg-gray-600 rounded-full h-1.5 mb-2">
          <div 
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Action button or status */}
      <div className="flex items-center justify-between">
        {!isPreloadingAll && !isComplete && (
          <button
            onClick={onPreloadAll}
            disabled={disabled || isPreloading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
          >
            {lang === 'ru' ? 'Загрузить все' : 'Preload All'}
          </button>
        )}
        
        {isPreloadingAll && (
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-blue-400">
              {lang === 'ru' ? 'Загрузка...' : 'Loading...'}
            </span>
          </div>
        )}
        
        {isComplete && (
          <div className="text-xs text-green-400">
            ✓ {lang === 'ru' ? 'Все загружены' : 'All loaded'}
          </div>
        )}
      </div>
    </div>
  );
};