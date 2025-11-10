import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSessionManager } from '../../hooks/useSessionManager';
import { Assistant } from '../../types';
import { PersonaService } from '../../services/personaService';

// Context interfaces
interface VoiceAppContextType {
  // Session management
  session: {
    status: string;
    isActive: boolean;
    timeLeft: number;
    reconnecting: boolean;
    errorState: string | null;
    selectedAssistant: Assistant | null;
    start: (assistant: Assistant) => Promise<void>;
    stop: () => Promise<void>;
    restart: () => Promise<void>;
    sendText: (text: string) => Promise<void>;
    sendStructuredMessage: (message: any) => Promise<void>;
    setSelectedAssistant: (assistant: Assistant) => void;
    setVoice: (voice: string) => void;
  };
  
  // Transcript management
  transcript: {
    transcript: any[];
    displayedTranscript: any[];
    numMessagesToDisplay: number;
    addMessage: (speaker: any, text: string, metadata?: any) => void;
    appendPartial: (text: string) => void;
    finalizeLast: () => void;
    clear: () => void;
    setNumMessagesToDisplay: (count: number) => void;
    loadMoreMessages: () => void;
    exportToPdf: (filename?: string) => Promise<void>;
    exportToJson: () => string;
    copyToClipboard: () => Promise<void>;
    canLoadMore: boolean;
    transcriptEndRef: React.RefObject<HTMLDivElement>;
  };
  
  // Audio management
  audio: {
    isPlaying: boolean;
    playBase64Audio: (base64Audio: string, options?: any) => Promise<void>;
    playText: (text: string, voice?: string) => Promise<void>;
    stopAll: () => void;
    attachOnEnded: (callback: () => void) => () => void;
  };
  
  // Language management
  language: {
    locale: string;
    setLocale: (locale: string) => void;
    strings: Record<string, string>;
    t: (key: string, fallback?: string) => string;
    availableLanguages: string[];
  };
  
  // Logger
  logger: {
    logs: any[];
    log: (message: string, level?: string) => void;
    clearLogs: () => void;
    getFilteredLogs: (filterLevel?: string) => any[];
    logCount: number;
  };
  
  // UI state (these would be managed by the provider)
  ui: {
    customAssistants: Assistant[];
    setCustomAssistants: (assistants: Assistant[]) => void;
    customApiKey: string;
    setCustomApiKey: (key: string) => void;
    isDevMode: boolean;
    setIsDevMode: (enabled: boolean) => void;
    isSettingsModalOpen: boolean;
    setIsSettingsModalOpen: (open: boolean) => void;
    isPersonaInfoModalOpen: boolean;
    setIsPersonaInfoModalOpen: (open: boolean) => void;
    isPanelVisible: boolean;
    setIsPanelVisible: (visible: boolean) => void;
    showLogs: boolean;
    setShowLogs: (show: boolean) => void;
    textInputValue: string;
    setTextInputValue: (value: string) => void;
    copyButtonText: string;
    setCopyButtonText: (text: string) => void;
    personaView: 'select' | 'edit' | 'add';
    setPersonaView: (view: 'select' | 'edit' | 'add') => void;
    editingPersona: any;
    setEditingPersona: (persona: any) => void;
  };
}

// Create context
const VoiceAppContext = createContext<VoiceAppContextType | null>(null);

// Provider props
interface VoiceAppProviderProps {
  children: ReactNode;
  customApiKey?: string | null;
  defaultApiKey?: string;
}

// Provider component
export const VoiceAppProvider: React.FC<VoiceAppProviderProps> = ({
  children,
  customApiKey,
  defaultApiKey
}) => {
  // Core session management
  const sessionManager = useSessionManager({
    customApiKey,
    defaultApiKey,
  });

  // Persona service
  const personaService = React.useMemo(() => new PersonaService(), []);

  // Additional UI state (simplified for this example)
  const [customAssistants, setCustomAssistants] = React.useState<Assistant[]>([]);
  const [customApiKeyState, setCustomApiKeyState] = React.useState<string>('');
  const [isDevMode, setIsDevMode] = React.useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [isPersonaInfoModalOpen, setIsPersonaInfoModalOpen] = React.useState(false);
  const [isPanelVisible, setIsPanelVisible] = React.useState(false);
  const [showLogs, setShowLogs] = React.useState(false);
  const [textInputValue, setTextInputValue] = React.useState('');
  const [copyButtonText, setCopyButtonText] = React.useState('');
  const [personaView, setPersonaView] = React.useState<'select' | 'edit' | 'add'>('select');
  const [editingPersona, setEditingPersona] = React.useState<any>(null);

  // Initialize assistants and selected assistant on mount
  useEffect(() => {
    const allAssistants = personaService.getAllAssistants();
    setCustomAssistants(allAssistants);

    // Load or set default selected assistant
    const savedAssistantId = personaService.loadSelectedAssistantId();
    let selectedAssistant = savedAssistantId 
      ? personaService.getAssistantById(savedAssistantId)
      : null;
    
    // If no saved assistant or saved one not found, use first preset
    if (!selectedAssistant && allAssistants.length > 0) {
      selectedAssistant = allAssistants[0];
      if (selectedAssistant.id) {
        personaService.saveSelectedAssistantId(selectedAssistant.id);
      }
    }

    if (selectedAssistant) {
      sessionManager.setSelectedAssistant(selectedAssistant);
    }
  }, [personaService, sessionManager]);

  // Context value
  const contextValue: VoiceAppContextType = {
    session: {
      status: sessionManager.status,
      isActive: sessionManager.isActive,
      timeLeft: sessionManager.timeLeft,
      reconnecting: sessionManager.reconnecting,
      errorState: sessionManager.errorState,
      selectedAssistant: sessionManager.selectedAssistant,
      start: sessionManager.start,
      stop: sessionManager.stop,
      restart: sessionManager.restart,
      sendText: sessionManager.sendText,
      sendStructuredMessage: sessionManager.sendStructuredMessage,
      setSelectedAssistant: sessionManager.setSelectedAssistant,
      setVoice: sessionManager.setVoice,
    },
    
    transcript: {
      transcript: sessionManager.transcript.transcript,
      displayedTranscript: sessionManager.transcript.displayedTranscript,
      numMessagesToDisplay: sessionManager.transcript.numMessagesToDisplay,
      addMessage: sessionManager.transcript.addMessage,
      appendPartial: sessionManager.transcript.appendPartial,
      finalizeLast: sessionManager.transcript.finalizeLast,
      clear: sessionManager.transcript.clear,
      setNumMessagesToDisplay: sessionManager.transcript.setNumMessagesToDisplay,
      loadMoreMessages: sessionManager.transcript.loadMoreMessages,
      exportToPdf: sessionManager.transcript.exportToPdf,
      exportToJson: sessionManager.transcript.exportToJson,
      copyToClipboard: sessionManager.transcript.copyToClipboard,
      canLoadMore: sessionManager.transcript.canLoadMore,
      transcriptEndRef: sessionManager.transcript.transcriptEndRef,
    },
    
    audio: {
      isPlaying: sessionManager.audioEngine.isPlaying,
      playBase64Audio: sessionManager.audioEngine.playBase64Audio,
      playText: sessionManager.audioEngine.playText,
      stopAll: sessionManager.audioEngine.stopAll,
      attachOnEnded: sessionManager.audioEngine.attachOnEnded,
    },
    
    language: {
      locale: sessionManager.languageManager.locale,
      setLocale: sessionManager.languageManager.setLocale,
      strings: sessionManager.languageManager.strings,
      t: sessionManager.languageManager.t,
      availableLanguages: sessionManager.languageManager.availableLanguages,
    },
    
    logger: {
      logs: sessionManager.logger.logs,
      log: sessionManager.logger.log,
      clearLogs: sessionManager.logger.clearLogs,
      getFilteredLogs: sessionManager.logger.getFilteredLogs,
      logCount: sessionManager.logger.logCount,
    },
    
    ui: {
      customAssistants,
      setCustomAssistants,
      customApiKey: customApiKeyState,
      setCustomApiKey: setCustomApiKeyState,
      isDevMode,
      setIsDevMode,
      isSettingsModalOpen,
      setIsSettingsModalOpen,
      isPersonaInfoModalOpen,
      setIsPersonaInfoModalOpen,
      isPanelVisible,
      setIsPanelVisible,
      showLogs,
      setShowLogs,
      textInputValue,
      setTextInputValue,
      copyButtonText,
      setCopyButtonText,
      personaView,
      setPersonaView,
      editingPersona,
      setEditingPersona,
    },
  };

  return (
    <VoiceAppContext.Provider value={contextValue}>
      {children}
    </VoiceAppContext.Provider>
  );
};

// Hook to use the context
export const useVoiceAppContext = (): VoiceAppContextType => {
  const context = useContext(VoiceAppContext);
  if (!context) {
    throw new Error('useVoiceAppContext must be used within a VoiceAppProvider');
  }
  return context;
};

// Export types for external use
export type { VoiceAppContextType, VoiceAppProviderProps };