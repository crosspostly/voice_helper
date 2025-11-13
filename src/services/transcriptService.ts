import { Transcript } from '../types';

export class TranscriptService {
  private storageKey = 'transcript';

  static addMessage(transcript: Transcript[], speaker: Transcript['speaker'], text: string, isFinal: boolean = true, metadata?: Transcript['metadata']): Transcript[] {
    return [...transcript, { speaker, text, isFinal, metadata }];
  }

  static appendPartial(transcript: Transcript[], text: string): Transcript[] {
    const newTranscript = [...transcript];
    const last = newTranscript[newTranscript.length - 1];
    if (last && !last.isFinal) {
      last.text += text;
    } else {
      newTranscript.push({ speaker: 'Gemini', text, isFinal: false });
    }
    return newTranscript;
  }

  static finalizeLast(transcript: Transcript[]): Transcript[] {
    const newTranscript = [...transcript];
    const last = newTranscript[newTranscript.length - 1];
    if (last && !last.isFinal) {
      last.isFinal = true;
    }
    return newTranscript;
  }

  loadTranscript(): Transcript[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load transcript from localStorage", e);
      return [];
    }
  }

  saveTranscript(transcript: Transcript[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(transcript));
    } catch (e) {
      console.error("Error saving transcript to localStorage", e);
    }
  }

  clearTranscript(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error("Error clearing transcript from localStorage", e);
    }
  }

  static exportToText(transcript: Transcript[]): string {
    return transcript.map(entry => `${entry.speaker}: ${entry.text}`).join('\n');
  }

  static async exportToPdf(transcript: Transcript[], filename: string = 'conversation.pdf'): Promise<void> {
    if (!window.jspdf) {
      throw new Error("jsPDF not loaded");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;
    doc.setFont("Helvetica"); 
    
    transcript.forEach(entry => {
      const speaker = entry.speaker === 'You' ? 'You' : 'Gemini';
      const text = `${speaker}: ${entry.text}`;
      const splitText = doc.splitTextToSize(text, 180);
      
      if (y + (splitText.length * 7) > 280) { 
        doc.addPage();
        y = 10;
      }
      
      doc.text(splitText, 10, y);
      y += (splitText.length * 7);
    });
    
    doc.save(filename);
  }

  static exportToJson(transcript: Transcript[]): string {
    return JSON.stringify(transcript, null, 2);
  }

  static async copyToClipboard(transcript: Transcript[]): Promise<void> {
    const text = this.exportToText(transcript);
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }
}