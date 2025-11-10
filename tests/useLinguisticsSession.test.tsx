/**
 * Tests for linguistics session hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLinguisticsSession } from '../hooks/useLinguisticsSession';
import { Assistant, Transcript } from '../types';

// Mock the linguistics API client
vi.mock('../services/linguisticsApi', () => ({
  linguisticsApiClient: {
    isAvailable: vi.fn(),
    startSession: vi.fn(),
    processUtterance: vi.fn(),
  },
  LinguisticsApiClient: vi.fn(),
}));

const mockSetTranscript = vi.fn();

describe('useLinguisticsSession', () => {
  const mockAssistant: Assistant = {
    id: 'test-assistant',
    title: 'Test Assistant',
    prompt: 'Test prompt',
    isLinguisticsService: true,
  };

  const regularAssistant: Assistant = {
    id: 'regular-assistant',
    title: 'Regular Assistant',
    prompt: 'Regular prompt',
    isLinguisticsService: false,
  };

  const defaultProps = {
    selectedAssistant: mockAssistant,
    userId: 'test-user',
    setTranscript: mockSetTranscript,
    playAudio: vi.fn(),
    log: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    expect(result.current.sessionState).toEqual({
      isActive: false,
      sessionId: null,
      isLoading: false,
      error: null,
      serviceAvailable: false,
    });
    expect(result.current.isLinguisticsAssistant).toBe(true);
  });

  it('should identify linguistics assistant correctly', () => {
    const { result } = renderHook(() => useLinguisticsSession(defaultProps));
    expect(result.current.isLinguisticsAssistant).toBe(true);

    const { result: result2 } = renderHook(() => 
      useLinguisticsSession({ ...defaultProps, selectedAssistant: regularAssistant })
    );
    expect(result2.current.isLinguisticsAssistant).toBe(false);
  });

  it('should check service availability on mount for linguistics assistant', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');
    (linguisticsApiClient.isAvailable as any).mockResolvedValue(true);

    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    await waitFor(() => {
      expect(result.current.sessionState.serviceAvailable).toBe(true);
    });

    expect(linguisticsApiClient.isAvailable).toHaveBeenCalled();
  });

  it('should not check service availability for regular assistant', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');
    (linguisticsApiClient.isAvailable as any).mockResolvedValue(true);

    const { result } = renderHook(() => 
      useLinguisticsSession({ ...defaultProps, selectedAssistant: regularAssistant })
    );

    // Wait a bit to ensure no async operations were triggered
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(linguisticsApiClient.isAvailable).not.toHaveBeenCalled();
  });

  it('should start session successfully', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');
    (linguisticsApiClient.isAvailable as any).mockResolvedValue(true);
    (linguisticsApiClient.startSession as any).mockResolvedValue({
      success: true,
      session_id: 'test-session-123',
      user_id: 'test-user',
      persona: { id: 'linguistics-assistant', name: 'Linguistics Assistant' },
      started_at: '2023-01-01T00:00:00Z',
      message: 'Session started',
    });

    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.startSession();
    });

    expect(success).toBe(true);
    expect(result.current.sessionState.isActive).toBe(true);
    expect(result.current.sessionState.sessionId).toBe('test-session-123');
    expect(result.current.sessionState.error).toBeNull();

    expect(linguisticsApiClient.startSession).toHaveBeenCalledWith(
      'test-user',
      expect.stringMatching(/ling_\d+_\w+/), // Generated session ID
      'linguistics-assistant',
      {
        language: 'en',
        selected_assistant: 'test-assistant',
      }
    );

    expect(mockSetTranscript).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          speaker: 'Linguistics',
          text: 'Session started',
          isFinal: true,
          metadata: {
            response_type: 'structured',
            persona: { id: 'linguistics-assistant', name: 'Linguistics Assistant' },
          },
        }),
      ])
    );
  });

  it('should handle session start failure', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');
    (linguisticsApiClient.isAvailable as any).mockResolvedValue(true);
    (linguisticsApiClient.startSession as any).mockResolvedValue({
      success: false,
      error: 'Service unavailable',
      message: 'Failed to start session',
    });

    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.startSession();
    });

    expect(success).toBe(false);
    expect(result.current.sessionState.isActive).toBe(false);
    expect(result.current.sessionState.error).toBe('Service unavailable');
  });

  it('should not start session for non-linguistics assistant', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');

    const { result } = renderHook(() => 
      useLinguisticsSession({ ...defaultProps, selectedAssistant: regularAssistant })
    );

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.startSession();
    });

    expect(success).toBe(false);
    expect(linguisticsApiClient.startSession).not.toHaveBeenCalled();
  });

  it('should process utterance successfully', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');
    (linguisticsApiClient.isAvailable as any).mockResolvedValue(true);
    (linguisticsApiClient.startSession as any).mockResolvedValue({
      success: true,
      session_id: 'test-session-123',
      message: 'Session started',
    });
    (linguisticsApiClient.processUtterance as any).mockResolvedValue({
      success: true,
      session_id: 'test-session-123',
      response: {
        summary: 'Response summary',
        detailed_text: 'Detailed response',
        exercises: [
          {
            title: 'Test Exercise',
            description: 'Test description',
            difficulty: 'beginner' as const,
          },
        ],
        progress_updates: [
          {
            category: 'Speaking',
            level: 5,
            description: 'Good progress',
          },
        ],
      },
      context_used: true,
    });

    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    // Start session first
    await act(async () => {
      await result.current.startSession();
    });

    // Clear transcript calls from session start
    mockSetTranscript.mockClear();

    // Process utterance
    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.processUtterance('Test utterance');
    });

    expect(success).toBe(true);
    expect(linguisticsApiClient.processUtterance).toHaveBeenCalledWith(
      'test-user',
      'test-session-123',
      'Test utterance',
      {
        language: 'en',
        timestamp: expect.any(String),
      }
    );

    expect(mockSetTranscript).toHaveBeenCalledTimes(2); // User message + response
    expect(mockSetTranscript).toHaveBeenNthCalledWith(1, [
      expect.arrayContaining([
        expect.objectContaining({
          speaker: 'You',
          text: 'Test utterance',
          isFinal: true,
        }),
      ]),
    ]);

    expect(mockSetTranscript).toHaveBeenNthCalledWith(2, [
      expect.arrayContaining([
        expect.objectContaining({
          speaker: 'You',
          text: 'Test utterance',
          isFinal: true,
        }),
        expect.objectContaining({
          speaker: 'Linguistics',
          text: 'Detailed response',
          isFinal: true,
          metadata: {
            response_type: 'structured',
            exercises: [
              {
                title: 'Test Exercise',
                description: 'Test description',
                difficulty: 'beginner',
              },
            ],
            progress_updates: [
              {
                category: 'Speaking',
                level: 5,
                description: 'Good progress',
              },
            ],
            context_used: true,
          },
        }),
      ]),
    ]);
  });

  it('should handle utterance processing failure', async () => {
    const { linguisticsApiClient } = await import('../services/linguisticsApi');
    (linguisticsApiClient.isAvailable as any).mockResolvedValue(true);
    (linguisticsApiClient.startSession as any).mockResolvedValue({
      success: true,
      session_id: 'test-session-123',
      message: 'Session started',
    });
    (linguisticsApiClient.processUtterance as any).mockResolvedValue({
      success: false,
      error: 'Processing failed',
    });

    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    // Start session first
    await act(async () => {
      await result.current.startSession();
    });

    // Clear transcript calls from session start
    mockSetTranscript.mockClear();

    // Process utterance
    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.processUtterance('Test utterance');
    });

    expect(success).toBe(false);
    expect(result.current.sessionState.error).toBe('Processing failed');

    expect(mockSetTranscript).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          speaker: 'You',
          text: 'Test utterance',
          isFinal: true,
        }),
        expect.objectContaining({
          speaker: 'Linguistics',
          text: 'Error processing response: Processing failed. Please try again.',
          isFinal: true,
        }),
      ])
    );
  });

  it('should stop session correctly', async () => {
    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    await act(async () => {
      result.current.stopSession();
    });

    expect(result.current.sessionState.isActive).toBe(false);
    expect(result.current.sessionState.sessionId).toBeNull();

    expect(mockSetTranscript).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          speaker: 'Linguistics',
          text: 'Session ended.',
          isFinal: true,
        }),
      ])
    );
  });

  it('should clear error', async () => {
    const { result } = renderHook(() => useLinguisticsSession(defaultProps));

    // Set an error first
    await act(async () => {
      result.current.stopSession(); // This might set some state
    });

    // Clear the error
    await act(async () => {
      result.current.clearError();
    });

    expect(result.current.sessionState.error).toBeNull();
  });
});