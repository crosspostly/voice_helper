/**
 * API client for the linguistics service with retry logic and environment configuration.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Import mock service for development
import { mockLinguisticsService } from './mockLinguisticsService';

// Types for linguistics service responses
export interface LinguisticsSessionResponse {
  success: boolean;
  session_id: string;
  user_id: string;
  persona: {
    id: string;
    name: string;
    description?: string;
  };
  started_at: string;
  message: string;
  error?: string;
}

export interface LinguisticsResponse {
  success: boolean;
  session_id: string;
  user_id: string;
  persona: {
    id: string;
    name: string;
    description?: string;
  };
  response: {
    summary: string;
    detailed_text: string;
    exercises?: Array<{
      title: string;
      description: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>;
    progress_updates?: Array<{
      category: string;
      level: number;
      description: string;
    }>;
  };
  audio_data?: string; // base64 encoded audio
  context_used: boolean;
  timestamp: string;
  error?: string;
}

export interface LinguisticsProgressResponse {
  success: boolean;
  user_id: string;
  session_id?: string;
  progress: {
    overall_level: number;
    categories: Array<{
      name: string;
      level: number;
      exercises_completed: number;
      last_updated: string;
    }>;
    recommendations: string[];
  };
  error?: string;
}

export class LinguisticsApiClient {
  private client: AxiosInstance;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private useMock: boolean = false;

  constructor(
    baseURL?: string,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      timeout?: number;
    } = {}
  ) {
    // Check if mock mode is enabled
    const useMock = import.meta.env.VITE_LINGUISTICS_USE_MOCK === 'true';
    
    if (useMock) {
      console.log('[Linguistics API] Using mock service');
      this.useMock = true;
      return;
    }

    // Environment-based base URL configuration
    const resolvedBaseURL = baseURL || this.getBaseURLFromEnvironment();
    
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;

    this.client = axios.create({
      baseURL: resolvedBaseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Linguistics API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Linguistics API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Linguistics API] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[Linguistics API] Response error:', error);
        return Promise.reject(error);
      }
    );
  }

  private getBaseURLFromEnvironment(): string {
    // Check environment variables first
    if (import.meta.env.VITE_LINGUISTICS_API_URL) {
      return import.meta.env.VITE_LINGUISTICS_API_URL;
    }
    
    // Fallback to default based on current environment
    if (import.meta.env.DEV) {
      return 'http://localhost:8000';
    }
    
    // Production fallback
    return '/api/linguistics';
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<AxiosResponse<T>>,
    retries: number = this.maxRetries
  ): Promise<AxiosResponse<T>> {
    try {
      return await operation();
    } catch (error: any) {
      if (retries === 0 || !this.shouldRetry(error)) {
        throw error;
      }

      const delay = this.baseDelay * Math.pow(2, this.maxRetries - retries);
      console.log(`[Linguistics API] Retry attempt ${this.maxRetries - retries + 1}, waiting ${delay}ms`);
      
      await this.sleep(delay);
      return this.retryWithBackoff(operation, retries - 1);
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx server errors
    if (!error.response) {
      return true; // Network error
    }
    
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors or rate limiting
  }

  /**
   * Start a new linguistics session
   */
  async startSession(
    userId: string,
    sessionId: string,
    personaId?: string,
    context?: Record<string, any>
  ): Promise<LinguisticsSessionResponse> {
    if (this.useMock) {
      return mockLinguisticsService.startSession(userId, sessionId, personaId, context);
    }

    const response = await this.retryWithBackoff(() =>
      this.client.post<LinguisticsSessionResponse>('/session/start', {
        user_id: userId,
        session_id: sessionId,
        persona_id: personaId,
        context,
      })
    );

    return response.data;
  }

  /**
   * Process user utterance and get structured response
   */
  async processUtterance(
    userId: string,
    sessionId: string,
    utterance: string,
    context?: Record<string, any>
  ): Promise<LinguisticsResponse> {
    if (this.useMock) {
      return mockLinguisticsService.processUtterance(userId, sessionId, utterance, context);
    }

    const response = await this.retryWithBackoff(() =>
      this.client.post<LinguisticsResponse>('/utterance', {
        user_id: userId,
        session_id: sessionId,
        utterance,
        context,
      })
    );

    return response.data;
  }

  /**
   * Get user progress snapshot
   */
  async getProgress(
    userId: string,
    sessionId?: string
  ): Promise<LinguisticsProgressResponse> {
    if (this.useMock) {
      return mockLinguisticsService.getProgress(userId, sessionId);
    }

    const params = sessionId ? { session_id: sessionId } : {};
    
    const response = await this.retryWithBackoff(() =>
      this.client.get<LinguisticsProgressResponse>('/progress', { params })
    );

    return response.data;
  }

  /**
   * Health check for the linguistics service
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    if (this.useMock) {
      return mockLinguisticsService.healthCheck();
    }

    try {
      const response = await this.client.get<{ status: string; timestamp: string }>('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Linguistics service health check failed: ${error}`);
    }
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.useMock) {
      return true; // Mock service is always available
    }

    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

// Default instance
export const linguisticsApiClient = new LinguisticsApiClient();