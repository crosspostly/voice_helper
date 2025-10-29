export interface Transcript {
  speaker: 'You' | 'Gemini';
  text: string;
}

export interface Assistant {
  id: string;
  title?: string; // For custom personas
  titleKey?: string; // For preset personas
  prompt: string;
}
