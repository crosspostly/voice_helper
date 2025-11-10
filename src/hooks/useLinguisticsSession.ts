/**
 * Hook for managing linguistics service sessions
 * 
 * This hook handles the integration with the linguistics service,
 * providing structured responses while maintaining compatibility with the existing audio pipeline.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { linguisticsApiClient, LinguisticsResponse, LinguisticsSessionResponse } from '../services/linguisticsApi';
import { Assistant, Transcript } from '../types';

export interface UseLinguisticsSessionProps {
  selectedAssistant: Assistant;
  userId: string;
  setTranscript: (updater: (prev: Transcript[]) => Transcript[]) => void;
  playAudio: (base64Audio: string) => Promise<void>;
  log: (message: string, level?: 'INFO' | 'ERROR' | 'DEBUG') => void;
}

export interface LinguisticsSessionState {
  isActive: boolean;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  serviceAvailable: boolean;
}

export const useLinguisticsSession = ({
  selectedAssistant,
  userId,
  setTranscript,
  playAudio,
  log,
}: UseLinguisticsSessionProps) => {
  const [sessionState, setSessionState] = useState<LinguisticsSessionState>({
    isActive: false,
    sessionId: null,
    isLoading: false,
    error: null,
    serviceAvailable: false,
  });

  const sessionStateRef = useRef(sessionState);
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  // Check if the selected assistant uses the linguistics service
  const isLinguisticsAssistant = selectedAssistant.isLinguisticsService === true;

  // Check service availability on mount and when assistant changes
  useEffect(() => {
    if (isLinguisticsAssistant) {
      checkServiceAvailability();
    }
  }, [isLinguisticsAssistant]);

  const checkServiceAvailability = useCallback(async () => {
    try {
      const available = await linguisticsApiClient.isAvailable();
      setSessionState(prev => ({ ...prev, serviceAvailable: available }));
      
      if (available) {
        log('Linguistics service is available', 'INFO');
      } else {
        log('Linguistics service is not available', 'ERROR');
      }
    } catch (error) {
      log(`Failed to check linguistics service availability: ${error}`, 'ERROR');
      setSessionState(prev => ({ ...prev, serviceAvailable: false }));
    }
  }, [log]);

  const generateSessionId = useCallback(() => {
    return `ling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const startSession = useCallback(async (): Promise<boolean> => {
    if (!isLinguisticsAssistant) {
      log('Not a linguistics assistant, skipping session start', 'DEBUG');
      return false;
    }

    if (!sessionStateRef.current.serviceAvailable) {
      log('Linguistics service not available, cannot start session', 'ERROR');
      setSessionState(prev => ({ 
        ...prev, 
        error: 'Linguistics service is not available' 
      }));
      return false;
    }

    setSessionState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const sessionId = generateSessionId();
      log(`Starting linguistics session with ID: ${sessionId}`, 'INFO');

      const response: LinguisticsSessionResponse = await linguisticsApiClient.startSession(
        userId,
        sessionId,
        'linguistics-assistant', // Default persona ID
        {
          language: 'en',
          selected_assistant: selectedAssistant.id,
        }
      );

      if (response.success) {
        setSessionState(prev => ({
          ...prev,
          isActive: true,
          sessionId: response.session_id,
          isLoading: false,
          error: null,
        }));

        // Add system message to transcript
        setTranscript(prev => [...prev, {
          speaker: 'Linguistics',
          text: response.message,
          isFinal: true,
          metadata: {
            response_type: 'structured',
            persona: response.persona,
          },
        }]);

        log(`Linguistics session started successfully: ${response.session_id}`, 'INFO');
        return true;
      } else {
        throw new Error(response.error || 'Failed to start session');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to start linguistics session: ${errorMessage}`, 'ERROR');
      
      setSessionState(prev => ({
        ...prev,
        isActive: false,
        sessionId: null,
        isLoading: false,
        error: errorMessage,
      }));

      // Add error message to transcript
      setTranscript(prev => [...prev, {
        speaker: 'Linguistics',
        text: `Failed to start session: ${errorMessage}. Falling back to regular Gemini.`,
        isFinal: true,
      }]);

      return false;
    }
  }, [isLinguisticsAssistant, selectedAssistant, userId, generateSessionId, setTranscript, log]);

  const processUtterance = useCallback(async (
    utterance: string
  ): Promise<boolean> => {
    if (!isLinguisticsAssistant || !sessionStateRef.current.isActive || !sessionStateRef.current.sessionId) {
      log('Not in an active linguistics session', 'DEBUG');
      return false;
    }

    setSessionState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      log(`Processing utterance with linguistics service: ${utterance.substring(0, 50)}...`, 'INFO');

      const response: LinguisticsResponse = await linguisticsApiClient.processUtterance(
        userId,
        sessionStateRef.current.sessionId!,
        utterance,
        {
          language: 'en',
          timestamp: new Date().toISOString(),
        }
      );

      if (response.success) {
        // Add user utterance to transcript
        setTranscript(prev => [...prev, {
          speaker: 'You',
          text: utterance,
          isFinal: true,
        }]);

        // Add structured response to transcript
        setTranscript(prev => [...prev, {
          speaker: 'Linguistics',
          text: response.response.detailed_text,
          isFinal: true,
          metadata: {
            response_type: 'structured',
            exercises: response.response.exercises,
            progress_updates: response.response.progress_updates,
            context_used: response.context_used,
            persona: response.persona,
          },
        }]);

        // Play TTS audio if available
        if (response.audio_data) {
          try {
            await playAudio(response.audio_data);
            log('Linguistics TTS audio played successfully', 'INFO');
          } catch (audioError) {
            log(`Failed to play linguistics TTS: ${audioError}`, 'ERROR');
            // Continue without audio - not a critical failure
          }
        } else {
          // Fallback: play the summary using the regular TTS system
          try {
            // This would need to be handled by the parent component
            // that has access to the regular Gemini TTS
            log('No linguistics TTS audio provided, using fallback', 'DEBUG');
          } catch (fallbackError) {
            log(`Fallback TTS also failed: ${fallbackError}`, 'ERROR');
          }
        }

        log(`Linguistics response processed successfully`, 'INFO');
        return true;
      } else {
        throw new Error(response.error || 'Failed to process utterance');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to process linguistics utterance: ${errorMessage}`, 'ERROR');
      
      setSessionState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      // Add error message to transcript
      setTranscript(prev => [...prev, {
        speaker: 'Linguistics',
        text: `Error processing response: ${errorMessage}. Please try again.`,
        isFinal: true,
      }]);

      return false;
    } finally {
      setSessionState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isLinguisticsAssistant, userId, setTranscript, playAudio, log]);

  const stopSession = useCallback(async () => {
    if (!sessionStateRef.current.isActive) {
      return;
    }

    log('Stopping linguistics session', 'INFO');
    
    setSessionState(prev => ({
      ...prev,
      isActive: false,
      sessionId: null,
      isLoading: false,
      error: null,
    }));

    // Add session end message to transcript
    setTranscript(prev => [...prev, {
      speaker: 'Linguistics',
      text: 'Session ended.',
      isFinal: true,
    }]);
  }, [setTranscript, log]);

  const clearError = useCallback(() => {
    setSessionState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    sessionState,
    
    // Computed
    isLinguisticsAssistant,
    
    // Actions
    startSession,
    processUtterance,
    stopSession,
    checkServiceAvailability,
    clearError,
  };
};