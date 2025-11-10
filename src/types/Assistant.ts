export interface PersonaType {
  preset: 'companion' | 'eloquence' | 'helpful' | 'negotiator' | 'linguistics' | 'therapist' | 'romantic' | 'robot' | 'poet' | 'writer' | 'socratic' | 'debate' | 'emdr_therapist';
  custom: string;
}

export interface AssistantConfig {
  id: string;
  title?: string; // For custom personas
  titleKey?: string; // For preset personas
  prompt: string;
  isLinguisticsService?: boolean; // Flag for linguistics service routing
}

// Legacy type for backward compatibility
export interface Assistant extends AssistantConfig {}