import React from 'react';
import { useVoiceAppContext } from '../VoiceAppContext';

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

export const VoiceSettings: React.FC = () => {
  const { session, ui, language } = useVoiceAppContext();
  const { strings: t } = language;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = e.target.value;
    session.setVoice(newVoice);
  };

  const handleSpeakingRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = e.target.value;
    console.log('Speaking rate changed:', newRate);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = e.target.value;
    console.log('Pitch changed:', newPitch);
  };

  const personaSupportsRateAndPitch = () => false;

  return (
    <>
      <div>
        <label htmlFor="voice" className="block text-sm font-medium text-text mb-2">
          {t.voiceSelection}
        </label>
        <select 
          id="voice" 
          onChange={handleVoiceChange} 
          className="w-full bg-card text-text border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent font-medium"
        >
          {VOICES.map(voice => (
            <option key={voice} value={voice} className="bg-base text-text">{voice}</option>
          ))}
        </select>
      </div>
      
      {personaSupportsRateAndPitch() && (
        <>
          <div>
            <label htmlFor="speechRate" className="block text-sm font-medium text-text mb-2">
              {t.speechRate}
            </label>
            <input 
              type="range" 
              id="speechRate" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              onChange={handleSpeakingRateChange} 
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer" 
            />
          </div>
          <div>
            <label htmlFor="pitch" className="block text-sm font-medium text-text mb-2">
              {t.speechPitch}
            </label>
            <input 
              type="range" 
              id="pitch" 
              min="-10" 
              max="10" 
              step="0.5" 
              onChange={handlePitchChange} 
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer" 
            />
          </div>
        </>
      )}
    </>
  );
};
