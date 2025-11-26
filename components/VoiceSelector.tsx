import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_VOICES, Voice } from '../src/constants/voices';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  lang: 'en' | 'ru';
  t: Record<string, string>;
  onPreviewVoice: (voiceName: string) => Promise<void>;
  previewingVoice: string | null;
  disabled?: boolean;
  isVoicePreloaded?: (voiceName: string) => boolean;
  onPlayCachedSample?: (voiceName: string) => Promise<boolean>;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  lang,
  t,
  onPreviewVoice,
  previewingVoice,
  disabled = false,
  isVoicePreloaded,
  onPlayCachedSample
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Male' | 'Female'>('All');
  const voiceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getVoiceDescription = (voice: Voice): string => {
    const descKey = `voice${voice.name}Desc`;
    return lang === 'ru' && t[descKey] ? t[descKey] : voice.description;
  };

  const filteredVoices = AVAILABLE_VOICES.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getVoiceDescription(voice).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = selectedGender === 'All' || voice.gender === selectedGender;
    return matchesSearch && matchesGender;
  });

  const groupedVoices = filteredVoices.reduce((acc, voice) => {
    if (!acc[voice.gender]) {
      acc[voice.gender] = [];
    }
    acc[voice.gender].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);

  // Scroll to selected voice when it changes
  useEffect(() => {
    if (selectedVoice && voiceRefs.current[selectedVoice]) {
      setTimeout(() => {
        voiceRefs.current[selectedVoice]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [selectedVoice]);

  // Handle preview button click
  const handlePreviewClick = async (voiceName: string) => {
    // If we have a cached sample and the function to play it, use that first
    if (isVoicePreloaded?.(voiceName) && onPlayCachedSample) {
      const success = await onPlayCachedSample(voiceName);
      if (success) {
        return; // Successfully played cached sample
      }
      // If cached sample failed, fall back to generating new one
    }
    
    // Fall back to original preview method
    onPreviewVoice(voiceName);
  };

  return (
    <div className="space-y-3">
      <label htmlFor="voice" className="block text-sm font-medium">{t.voiceSelection}</label>
      
      {/* Search and Filter Controls */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder={lang === 'ru' ? 'Поиск голоса...' : 'Search voice...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={disabled}
        />
        
        <div className="flex space-x-2">
          {(['All', 'Female', 'Male'] as const).map(gender => (
            <button
              key={gender}
              onClick={() => setSelectedGender(gender)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedGender === gender
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={disabled}
            >
              {gender === 'All' ? (lang === 'ru' ? 'Все' : 'All') : 
               gender === 'Female' ? (lang === 'ru' ? 'Женские' : 'Female') :
               (lang === 'ru' ? 'Мужские' : 'Male')}
            </button>
          ))}
        </div>
      </div>

            {/* Voice List */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
        {Object.entries(groupedVoices).map(([gender, voices]) => (
          <div key={gender}>
            <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase">
              {gender === 'Female' ? (lang === 'ru' ? 'Женские голоса' : 'Female Voices') :
               (lang === 'ru' ? 'Мужские голоса' : 'Male Voices')}
            </h4>
            <div className="space-y-1">
              {voices.map(voice => (
                <div
                  key={voice.name}
                  ref={(el) => voiceRefs.current[voice.name] = el}
                  className={`flex items-center p-2 rounded-md border transition-colors ${
                    selectedVoice === voice.name
                      ? 'bg-green-900 border-green-600'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="voice"
                    value={voice.name}
                    checked={selectedVoice === voice.name}
                    onChange={() => onVoiceChange(voice.name)}
                    className="mr-3"
                    disabled={disabled}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{voice.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {getVoiceDescription(voice)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handlePreviewClick(voice.name)}
                    disabled={disabled || previewingVoice === voice.name}
                    className={`ml-2 p-1.5 rounded-md transition-colors ${
                      previewingVoice === voice.name
                        ? 'bg-yellow-600 text-white'
                        : isVoicePreloaded?.(voice.name)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={
                      isVoicePreloaded?.(voice.name) 
                        ? (lang === 'ru' ? 'Прослушать (предзагружено)' : 'Preview (preloaded)')
                        : (lang === 'ru' ? 'Прослушать голос' : 'Preview voice')
                    }
                  >
                    {previewingVoice === voice.name ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    ) : isVoicePreloaded?.(voice.name) ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Voice Preloader Status */}
      {isVoicePreloaded && (
        <div className="mt-3 p-2 bg-gray-700 rounded-md">
          <div className="text-xs text-gray-300 mb-1">
            {lang === 'ru' ? 'Предзагруженные примеры голосов:' : 'Preloaded voice samples:'}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {AVAILABLE_VOICES.filter(v => isVoicePreloaded(v.name)).length} / {AVAILABLE_VOICES.length} {lang === 'ru' ? 'голосов' : 'voices'}
            </div>
          </div>
        </div>
      )}
      
      {filteredVoices.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          {lang === 'ru' ? 'Голоса не найдены' : 'No voices found'}
        </div>
      )}
    </div>
  );
};