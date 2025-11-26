export interface Voice {
  name: string;
  gender: 'Male' | 'Female';
  description: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  // Female Voices (14)
  { name: 'Achernar', gender: 'Female', description: 'Clear mid-range; friendly, engaging' },
  { name: 'Aoede', gender: 'Female', description: 'Clear, conversational, thoughtful' },
  { name: 'Autonoe', gender: 'Female', description: 'Mature, deeper; calm' },
  { name: 'Callirrhoe', gender: 'Female', description: 'Confident, professional' },
  { name: 'Despina', gender: 'Female', description: 'Warm, inviting, smooth' },
  { name: 'Erinome', gender: 'Female', description: 'Professional, articulate' },
  { name: 'Gacrux', gender: 'Female', description: 'Smooth, confident, authoritative' },
  { name: 'Kore', gender: 'Female', description: 'Energetic, youthful, higher pitch' },
  { name: 'Laomedeia', gender: 'Female', description: 'Clear, inquisitive; conversational' },
  { name: 'Leda', gender: 'Female', description: 'Youthful, clear; professional' },
  { name: 'Pulcherrima', gender: 'Female', description: 'Bright, energetic, higher pitch' },
  { name: 'Sulafat', gender: 'Female', description: 'Warm, confident, persuasive' },
  { name: 'Vindemiatrix', gender: 'Female', description: 'Calm, thoughtful, lower pitch' },
  { name: 'Zephyr', gender: 'Female', description: 'Energetic, bright, perky' },
  
  // Male Voices (15)
  { name: 'Achird', gender: 'Male', description: 'Youthful, inquisitive, friendly' },
  { name: 'Algenib', gender: 'Male', description: 'Warm, confident, deep authority' },
  { name: 'Alnilam', gender: 'Male', description: 'Energetic, clear' },
  { name: 'Charon', gender: 'Male', description: 'Smooth, assured, approachable' },
  { name: 'Enceladus', gender: 'Male', description: 'Energetic, enthusiastic' },
  { name: 'Fenrir', gender: 'Male', description: 'Friendly, clear, conversational' },
  { name: 'Iapetus', gender: 'Male', description: 'Casual, everyman' },
  { name: 'Orus', gender: 'Male', description: 'Mature, resonant, authoritative' },
  { name: 'Puck', gender: 'Male', description: 'Upbeat, playful, confident' },
  { name: 'Rasalgethi', gender: 'Male', description: 'Conversational, inquisitive' },
  { name: 'Sadachbia', gender: 'Male', description: 'Deeper, raspy, cool with gravitas' },
  { name: 'Sadaltager', gender: 'Male', description: 'Friendly, articulate' },
  { name: 'Schedar', gender: 'Male', description: 'Steady, approachable' },
  { name: 'Umbriel', gender: 'Male', description: 'Smooth, calm, friendly authority' },
  { name: 'Zubenelgenubi', gender: 'Male', description: 'Deep, resonant, commanding' },
];

export const VOICE_NAMES = AVAILABLE_VOICES.map(v => v.name);