import React from 'react';
import { VoiceApp } from './components/VoiceApp/VoiceApp';
import { ErrorBoundary } from './components/ErrorBoundary';

// Get custom API key from localStorage if available
const getCustomApiKey = (): string | null => {
  try {
    return localStorage.getItem('customApiKey');
  } catch (e) {
    console.error("Failed to read customApiKey from localStorage", e);
    return null;
  }
};

export const App: React.FC = () => {
  const customApiKey = getCustomApiKey();
  
  return (
    <ErrorBoundary>
      <React.StrictMode>
        <VoiceApp customApiKey={customApiKey} />
      </React.StrictMode>
    </ErrorBoundary>
  );
};

export default App;