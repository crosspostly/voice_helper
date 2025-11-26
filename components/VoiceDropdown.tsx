import React, { useState, useRef, useEffect } from 'react';
import { AVAILABLE_VOICES, Voice } from '../src/constants/voices';

interface VoiceDropdownProps {
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

export const VoiceDropdown: React.FC<VoiceDropdownProps> = ({
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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Male' | 'Female'>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedVoiceData = AVAILABLE_VOICES.find(v => v.name === selectedVoice);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleVoiceSelect = (voiceName: string) => {
    onVoiceChange(voiceName);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label htmlFor="voice" className="block text-sm font-medium">{t.voiceSelection}</label>
      
      {/* Custom Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span>{selectedVoiceData?.name || t.voiceSelection}</span>
            {selectedVoiceData && (
              <span className="text-xs text-gray-400">
                {selectedVoiceData.gender === 'Female' ? (lang === 'ru' ? 'жен' : 'F') : (lang === 'ru' ? 'муж' : 'M')}
              </span>
            )}
          </div>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-80 overflow-hidden">
            {/* Search and Filter Controls */}
            <div className="p-3 border-b border-gray-600 space-y-2">
              <input
                type="text"
                placeholder={lang === 'ru' ? 'Поиск голоса...' : 'Search voice...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
              />
              
              <div className="flex space-x-2">
                {(['All', 'Female', 'Male'] as const).map(gender => (
                  <button
                    key={gender}
                    onClick={(e) => {
                      setSelectedGender(gender);
                      e.stopPropagation();
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
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
            <div className="max-h-60 overflow-y-auto">
              {filteredVoices.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  {lang === 'ru' ? 'Голоса не найдены' : 'No voices found'}
                </div>
              ) : (
                Object.entries(groupedVoices).map(([gender, voices]) => (
                  <div key={gender}>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-700 sticky top-0">
                      {gender === 'Female' ? (lang === 'ru' ? 'Женские голоса' : 'Female Voices') :
                       (lang === 'ru' ? 'Мужские голоса' : 'Male Voices')}
                    </div>
                    {voices.map(voice => (
                      <div
                        key={voice.name}
                        className={`flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer transition-colors ${
                          selectedVoice === voice.name ? 'bg-green-900' : ''
                        }`}
                        onClick={() => handleVoiceSelect(voice.name)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{voice.name}</div>
                          <div className="text-xs text-gray-400 truncate">
                            {getVoiceDescription(voice)}
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewClick(voice.name);
                          }}
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
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Voice Preloader Status (Compact) */}
      {isVoicePreloaded && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {lang === 'ru' ? 'Предзагружено:' : 'Preloaded:'}
          </span>
          <span className="text-green-400 font-medium">
            {AVAILABLE_VOICES.filter(v => isVoicePreloaded(v.name)).length} / {AVAILABLE_VOICES.length}
          </span>
        </div>
      )}
    </div>
  );
};