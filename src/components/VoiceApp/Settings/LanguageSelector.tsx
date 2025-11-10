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
      className="bg-gray-700 text-white rounded-md p-1 text-sm focus:outline-none"
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
    </select>
  );
};