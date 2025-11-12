import React from 'react';
import { VoiceAppProvider } from './VoiceAppContext';
import { MainLayout } from './MainLayout';

// Default API key (restricted to project domain for security)
const DEFAULT_GEMINI_API_KEY = 'AIzaSyCrPJN5yn3QAmHEydsmQ8XK_vQPCJvamSA';

interface VoiceAppProps {
  customApiKey?: string | null;
}

export const VoiceApp: React.FC<VoiceAppProps> = ({ customApiKey }) => {
  return (
    <VoiceAppProvider customApiKey={customApiKey} defaultApiKey={DEFAULT_GEMINI_API_KEY}>
      <MainLayout />
    </VoiceAppProvider>
  );
};

export default VoiceApp;