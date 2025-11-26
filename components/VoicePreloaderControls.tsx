import React from 'react';

interface VoicePreloaderControlsProps {
  preloadedCount: number;
  totalCount: number;
  isPreloadingAll: boolean;
  isPreloading: boolean;
  onPreloadAll: () => void;
  disabled?: boolean;
  lang: 'en' | 'ru';
  t: Record<string, string>;
}

export const VoicePreloaderControls: React.FC<VoicePreloaderControlsProps> = ({
  preloadedCount,
  totalCount,
  isPreloadingAll,
  isPreloading,
  onPreloadAll,
  disabled = false,
  lang,
  t
}) => {
  return (
    <div className="mt-3 p-3 bg-gray-700 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">
          {lang === 'ru' ? 'Предзагруженные примеры голосов:' : 'Preloaded voice samples:'}
        </span>
        <span className="text-sm font-medium text-green-400">
          {preloadedCount} / {totalCount}
        </span>
      </div>
      
      <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(preloadedCount / totalCount) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {lang === 'ru' 
            ? `${preloadedCount} из ${totalCount} голосов предзагружено`
            : `${preloadedCount} of ${totalCount} voices preloaded`
          }
        </span>
        
        {!isPreloadingAll && preloadedCount < totalCount && (
          <button
            onClick={onPreloadAll}
            disabled={disabled || isPreloading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-xs rounded-md transition-colors"
          >
            {lang === 'ru' ? 'Загрузить все' : 'Preload All'}
          </button>
        )}
        
        {isPreloadingAll && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-blue-400">
              {lang === 'ru' ? 'Загрузка...' : 'Loading...'}
            </span>
          </div>
        )}
      </div>
      
      {preloadedCount === totalCount && (
        <div className="mt-2 text-xs text-green-400 text-center">
          {lang === 'ru' ? '✓ Все голоса предзагружены' : '✓ All voices preloaded'}
        </div>
      )}
    </div>
  );
};