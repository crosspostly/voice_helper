/**
 * Tests for linguistics API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinguisticsApiClient } from '../services/linguisticsApi';

// Mock axios
vi.mock('axios', () => ({
  create: vi.fn(() => ({
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    post: vi.fn(),
    get: vi.fn(),
  })),
}));

describe('LinguisticsApiClient', () => {
  let client: LinguisticsApiClient;

  beforeEach(() => {
    client = new LinguisticsApiClient('http://test-api.com', {
      maxRetries: 2,
      baseDelay: 100,
    });
  });

  describe('constructor', () => {
    it('should create client with default base URL when none provided', () => {
      const defaultClient = new LinguisticsApiClient();
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom base URL', () => {
      const customClient = new LinguisticsApiClient('http://custom.com');
      expect(customClient).toBeDefined();
    });
  });

  describe('startSession', () => {
    it('should start a session successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          session_id: 'test-session-123',
          user_id: 'user-1',
          persona: { id: 'linguistics-assistant', name: 'Linguistics Assistant' },
          started_at: '2023-01-01T00:00:00Z',
          message: 'Session started',
        },
      };

      client['client'].post = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.startSession('user-1', 'test-session-123');

      expect(result).toEqual(mockResponse.data);
      expect(client['client'].post).toHaveBeenCalledWith('/session/start', {
        user_id: 'user-1',
        session_id: 'test-session-123',
        persona_id: undefined,
        context: undefined,
      });
    });

    it('should handle session start failure', async () => {
      const mockError = new Error('Network error');
      client['client'].post = vi.fn().mockRejectedValue(mockError);

      await expect(client.startSession('user-1', 'test-session-123')).rejects.toThrow('Network error');
    });
  });

  describe('processUtterance', () => {
    it('should process utterance successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          session_id: 'test-session-123',
          user_id: 'user-1',
          persona: { id: 'linguistics-assistant', name: 'Linguistics Assistant' },
          response: {
            summary: 'Summary of response',
            detailed_text: 'Detailed response text',
            exercises: [
              {
                title: 'Exercise 1',
                description: 'Practice exercise',
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
          timestamp: '2023-01-01T00:00:00Z',
        },
      };

      client['client'].post = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.processUtterance('user-1', 'test-session-123', 'Hello');

      expect(result).toEqual(mockResponse.data);
      expect(client['client'].post).toHaveBeenCalledWith('/utterance', {
        user_id: 'user-1',
        session_id: 'test-session-123',
        utterance: 'Hello',
        context: undefined,
      });
    });
  });

  describe('getProgress', () => {
    it('should get progress successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          user_id: 'user-1',
          progress: {
            overall_level: 7,
            categories: [
              {
                name: 'Speaking',
                level: 8,
                exercises_completed: 10,
                last_updated: '2023-01-01T00:00:00Z',
              },
            ],
            recommendations: ['Practice more', 'Keep it up'],
          },
        },
      };

      client['client'].get = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.getProgress('user-1');

      expect(result).toEqual(mockResponse.data);
      expect(client['client'].get).toHaveBeenCalledWith('/progress', { params: {} });
    });

    it('should get progress for specific session', async () => {
      const mockResponse = {
        data: {
          success: true,
          user_id: 'user-1',
          session_id: 'test-session-123',
          progress: {
            overall_level: 7,
            categories: [],
            recommendations: [],
          },
        },
      };

      client['client'].get = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.getProgress('user-1', 'test-session-123');

      expect(result).toEqual(mockResponse.data);
      expect(client['client'].get).toHaveBeenCalledWith('/progress', {
        params: { session_id: 'test-session-123' },
      });
    });
  });

  describe('healthCheck', () => {
    it('should perform health check successfully', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          timestamp: '2023-01-01T00:00:00Z',
        },
      };

      client['client'].get = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.healthCheck();

      expect(result).toEqual(mockResponse.data);
      expect(client['client'].get).toHaveBeenCalledWith('/health');
    });

    it('should handle health check failure', async () => {
      const mockError = new Error('Service unavailable');
      client['client'].get = vi.fn().mockRejectedValue(mockError);

      await expect(client.healthCheck()).rejects.toThrow('Linguistics service health check failed: Error: Service unavailable');
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is available', async () => {
      client.healthCheck = vi.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00Z',
      });

      const result = await client.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when service is unavailable', async () => {
      client.healthCheck = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });
  });
});