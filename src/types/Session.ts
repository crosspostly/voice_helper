export interface SessionState {
  status: 'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING' | 'PROCESSING' | 'RECONNECTING' | 'ERROR';
  isActive: boolean;
  isReconnecting: boolean;
  error?: string;
}

export interface SessionConfig {
  apiKey?: string;
  model?: string;
  language?: string;
  voice?: string;
  speechRate?: number;
  speechPitch?: number;
  maxDuration?: number;
  autoReconnect?: boolean;
  adultMode?: boolean;
  devMode?: boolean;
}