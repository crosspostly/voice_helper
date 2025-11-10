export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  rate: number;
  pitch: number;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  bufferSize: number;
}

export interface WakeLockState {
  isActive: boolean;
  supportedScreenWakeLock: boolean;
  supportedSilentAudio: boolean;
}

export interface SessionAudioConfig {
  enableWakeLock: boolean;
  enableSilentAudioFallback: boolean;
}