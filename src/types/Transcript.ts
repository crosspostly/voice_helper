export interface Message {
  speaker: 'You' | 'Gemini' | 'Linguistics';
  text: string;
  isFinal?: boolean;
  metadata?: {
    response_type?: 'structured';
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
    context_used?: boolean;
    persona?: {
      id: string;
      name: string;
    };
  };
}

export interface ConversationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  messages: Message[];
  persona?: {
    id: string;
    name: string;
  };
}

// Legacy type for backward compatibility
export interface Transcript extends Message {}