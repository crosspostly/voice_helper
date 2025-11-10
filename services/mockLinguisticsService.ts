/**
 * Mock linguistics service handler for development and testing
 * This simulates the linguistics service API responses when the actual service is not available
 */

import { 
  LinguisticsSessionResponse, 
  LinguisticsResponse, 
  LinguisticsProgressResponse 
} from '../services/linguisticsApi';

export class MockLinguisticsService {
  private static instance: MockLinguisticsService;
  private sessions = new Map<string, any>();
  private userProgress = new Map<string, any>();

  static getInstance(): MockLinguisticsService {
    if (!MockLinguisticsService.instance) {
      MockLinguisticsService.instance = new MockLinguisticsService();
    }
    return MockLinguisticsService.instance;
  }

  async startSession(
    userId: string,
    sessionId: string,
    personaId?: string,
    context?: any
  ): Promise<LinguisticsSessionResponse> {
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const sessionData = {
      userId,
      sessionId,
      personaId,
      context,
      startedAt: new Date().toISOString(),
      messages: [],
    };

    this.sessions.set(sessionId, sessionData);

    // Initialize user progress if not exists
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        overall_level: 1,
        categories: {
          Speaking: { level: 1, exercises_completed: 0, last_updated: new Date().toISOString() },
          Listening: { level: 1, exercises_completed: 0, last_updated: new Date().toISOString() },
          Vocabulary: { level: 1, exercises_completed: 0, last_updated: new Date().toISOString() },
        },
        recommendations: ['Start with basic exercises', 'Practice daily'],
      });
    }

    return {
      success: true,
      session_id: sessionId,
      user_id: userId,
      persona: {
        id: personaId || 'linguistics-assistant',
        name: 'Linguistics Assistant',
        description: 'AI-powered linguistics coaching assistant',
      },
      started_at: sessionData.startedAt,
      message: `Session started with Linguistics Assistant. I'm here to help you improve your communication skills!`,
    };
  }

  async processUtterance(
    userId: string,
    sessionId: string,
    utterance: string,
    context?: any
  ): Promise<LinguisticsResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        session_id: sessionId,
        user_id: userId,
        error: 'Session not found',
        message: 'Failed to process utterance',
      };
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: utterance,
      timestamp: new Date().toISOString(),
    });

    // Generate mock response based on utterance content
    const mockResponse = this.generateMockResponse(utterance, session.messages.length);

    // Add assistant response to session
    session.messages.push({
      role: 'assistant',
      content: mockResponse.detailed_text,
      timestamp: new Date().toISOString(),
      metadata: {
        response_type: 'structured',
        exercises: mockResponse.exercises,
        progress_updates: mockResponse.progress_updates,
      },
    });

    // Update user progress
    this.updateUserProgress(userId, utterance);

    return {
      success: true,
      session_id: sessionId,
      user_id: userId,
      persona: {
        id: 'linguistics-assistant',
        name: 'Linguistics Assistant',
        description: 'AI-powered linguistics coaching assistant',
      },
      response: mockResponse,
      context_used: session.messages.length > 2, // Use context if we have some history
      timestamp: new Date().toISOString(),
    };
  }

  async getProgress(
    userId: string,
    sessionId?: string
  ): Promise<LinguisticsProgressResponse> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const progress = this.userProgress.get(userId);
    if (!progress) {
      return {
        success: false,
        user_id: userId,
        error: 'User progress not found',
      };
    }

    return {
      success: true,
      user_id: userId,
      session_id: sessionId,
      progress: {
        overall_level: progress.overall_level,
        categories: Object.entries(progress.categories).map(([name, data]: [string, any]) => ({
          name,
          level: data.level,
          exercises_completed: data.exercises_completed,
          last_updated: data.last_updated,
        })),
        recommendations: progress.recommendations,
      },
    };
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  private generateMockResponse(utterance: string, messageCount: number) {
    const lowerUtterance = utterance.toLowerCase();
    
    // Basic response generation based on keywords
    let summary = 'Great job practicing!';
    let detailedText = "I've analyzed your speech and I'm impressed with your progress. ";
    let exercises: any[] = [];
    let progressUpdates: any[] = [];

    if (lowerUtterance.includes('hello') || lowerUtterance.includes('hi')) {
      summary = 'Welcome to your session!';
      detailedText += "Welcome to your linguistics coaching session. I'm here to help you improve your communication skills through structured exercises and personalized feedback.";
      exercises = [
        {
          title: 'Introduction Practice',
          description: 'Practice introducing yourself clearly and confidently',
          difficulty: 'beginner' as const,
        },
      ];
    } else if (lowerUtterance.includes('help') || lowerUtterance.includes('practice')) {
      summary = 'Here are some practice exercises';
      detailedText += "Based on your request, I've prepared some targeted exercises to help you improve. Practice these regularly to see the best results.";
      exercises = [
        {
          title: 'Breathing Exercise',
          description: 'Practice deep breathing for better voice control',
          difficulty: 'beginner' as const,
        },
        {
          title: 'Pacing Exercise',
          description: 'Practice speaking at a steady, comfortable pace',
          difficulty: 'intermediate' as const,
        },
      ];
    } else if (lowerUtterance.includes('progress') || lowerUtterance.includes('improve')) {
      summary = 'You\'re making good progress!';
      detailedText += "I can see you've been working hard on your communication skills. Your progress is evident in several key areas. Keep up the excellent work!";
      progressUpdates = [
        {
          category: 'Speaking',
          level: Math.min(messageCount + 3, 10),
          description: 'Consistent practice is showing clear improvement',
        },
        {
          category: 'Confidence',
          level: Math.min(messageCount + 2, 10),
          description: 'Your speaking confidence is growing steadily',
        },
      ];
    } else {
      // Generic response
      detailedText += "Continue practicing your communication skills. Every conversation is an opportunity to improve. Focus on clarity, confidence, and active listening.";
      exercises = [
        {
          title: 'Active Listening Practice',
          description: 'Practice focusing completely on what others are saying',
          difficulty: 'beginner' as const,
        },
      ];
      progressUpdates = [
        {
          category: 'Engagement',
          level: Math.min(messageCount + 1, 10),
          description: 'Good engagement in today\'s session',
        },
      ];
    }

    return {
      summary,
      detailed_text: detailedText,
      exercises,
      progress_updates: progressUpdates,
    };
  }

  private updateUserProgress(userId: string, utterance: string) {
    const progress = this.userProgress.get(userId);
    if (!progress) return;

    // Simple progress simulation
    const utteranceLength = utterance.length;
    if (utteranceLength > 50) {
      // Longer utterances suggest more practice
      progress.overall_level = Math.min(progress.overall_level + 0.1, 10);
      progress.categories.Speaking.level = Math.min(progress.categories.Speaking.level + 0.1, 10);
      progress.categories.Speaking.exercises_completed += 1;
      progress.categories.Speaking.last_updated = new Date().toISOString();
    }

    // Update recommendations based on progress
    if (progress.overall_level < 3) {
      progress.recommendations = ['Focus on basic exercises', 'Practice daily for 15 minutes'];
    } else if (progress.overall_level < 7) {
      progress.recommendations = ['Try intermediate exercises', 'Practice with real conversations'];
    } else {
      progress.recommendations = ['Advanced techniques available', 'Consider joining a speaking group'];
    }
  }
}

// Export a singleton instance for easy use
export const mockLinguisticsService = MockLinguisticsService.getInstance();