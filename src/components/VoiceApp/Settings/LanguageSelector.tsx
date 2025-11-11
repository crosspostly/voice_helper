import React from 'react';
import { useVoiceAppContext } from '../VoiceAppContext';

export const LanguageSelector: React.FC = () => {
  const { language } = useVoiceAppContext();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as 'en' | 'ru';
    language.setLocale(newLang);
  };

  return (
    <select 
      value={language.locale} 
      onChange={handleLanguageChange} 
      className="bg-card text-text border border-border rounded-md p-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="en" className="bg-base text-text">EN</option>
      <option value="ru" className="bg-base text-text">RU</option>
    </select>
  );
};