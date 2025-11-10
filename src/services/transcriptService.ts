import { Transcript } from '../types';

export class TranscriptService {
  private storageKey = 'transcript';

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

  exportToText(transcript: Transcript[]): string {
    return transcript.map(entry => `${entry.speaker}: ${entry.text}`).join('\n');
  }

  async exportToPdf(transcript: Transcript[], filename: string = 'conversation.pdf'): Promise<void> {
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

  exportToJson(transcript: Transcript[]): string {
    return JSON.stringify(transcript, null, 2);
  }

  async copyToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }
}