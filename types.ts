export interface Transcript {
  speaker: 'You' | 'Gemini';
  text: string;
}

export interface Assistant {
  id: string;
  title: string;
  prompt: string;
}
