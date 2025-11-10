import { useState, useCallback, useRef, useMemo } from 'react';
import { Transcript } from '../types';
import { TranscriptService } from '../services/transcriptService';
import { usePersistentState } from './usePersistentState';

interface UseTranscriptOptions {
  maxDisplayEntries?: number;
  enablePersistence?: boolean;
}

interface UseTranscriptReturn {
  // State
  transcript: Transcript[];
  displayedTranscript: Transcript[];
  numMessagesToDisplay: number;
  
  // Actions
  addMessage: (speaker: Transcript['speaker'], text: string, metadata?: Transcript['metadata']) => void;
  appendPartial: (text: string) => void;
  finalizeLast: () => void;
  clear: () => void;
  setNumMessagesToDisplay: (count: number) => void;
  loadMoreMessages: () => void;
  setTranscript: (transcript: Transcript[]) => void;
  
  // Export actions
  exportToPdf: (filename?: string) => Promise<void>;
  exportToJson: () => string;
  copyToClipboard: () => Promise<void>;
  
  // Computed values
  canLoadMore: boolean;
  transcriptEndRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for managing conversation transcript with persistence and export capabilities
 */
export function useTranscript(options: UseTranscriptOptions = {}): UseTranscriptReturn {
  const { maxDisplayEntries = 50, enablePersistence = true } = options;

  // Persistent transcript storage
  const [transcript, setTranscript] = usePersistentState<Transcript[]>(
    enablePersistence ? 'transcript' : 'temp-transcript',
    []
  );

  // Display control
  const [numMessagesToDisplay, setNumMessagesToDisplay] = useState(maxDisplayEntries);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Computed displayed transcript
  const displayedTranscript = useMemo(() => {
    return transcript.slice(-numMessagesToDisplay);
  }, [transcript, numMessagesToDisplay]);

  const canLoadMore = useMemo(() => {
    return transcript.length > numMessagesToDisplay;
  }, [transcript.length, numMessagesToDisplay]);

  // Actions
  const addMessage = useCallback((
    speaker: Transcript['speaker'],
    text: string,
    metadata?: Transcript['metadata']
  ) => {
    setTranscript(prev => TranscriptService.addMessage(prev, speaker, text, true, metadata));
  }, [setTranscript]);

  const appendPartial = useCallback((text: string) => {
    setTranscript(prev => TranscriptService.appendPartial(prev, text));
  }, [setTranscript]);

  const finalizeLast = useCallback(() => {
    setTranscript(prev => TranscriptService.finalizeLast(prev));
  }, [setTranscript]);

  const clear = useCallback(() => {
    setTranscript([]);
    setNumMessagesToDisplay(maxDisplayEntries);
  }, [setTranscript, maxDisplayEntries]);

  const loadMoreMessages = useCallback(() => {
    setNumMessagesToDisplay(prev => Math.min(prev + maxDisplayEntries, transcript.length));
  }, [transcript.length, maxDisplayEntries]);

  // Export actions
  const exportToPdf = useCallback(async (filename?: string) => {
    try {
      await TranscriptService.exportToPdf(transcript, filename);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw error;
    }
  }, [transcript]);

  const exportToJson = useCallback(() => {
    return TranscriptService.exportToJson(transcript);
  }, [transcript]);

  const copyToClipboard = useCallback(async () => {
    try {
      await TranscriptService.copyToClipboard(transcript);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }, [transcript]);

  return {
    // State
    transcript,
    displayedTranscript,
    numMessagesToDisplay,
    
    // Actions
    addMessage,
    appendPartial,
    finalizeLast,
    clear,
    setNumMessagesToDisplay,
    loadMoreMessages,
    setTranscript, // Add setTranscript for external updates
    
    // Export actions
    exportToPdf,
    exportToJson,
    copyToClipboard,
    
    // Computed values
    canLoadMore,
    transcriptEndRef,
  };
}