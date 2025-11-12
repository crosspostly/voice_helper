import { Transcript } from '../types';

export class TranscriptService {
  /**
   * Convert transcript array to Gemini chat history format
   */
  static transcriptToHistory(transcript: Transcript[]): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
    return transcript
      .filter(entry => entry.text.trim() !== '') // Ensure we don't send empty messages
      .map(entry => ({
        role: entry.speaker === 'You' ? 'user' : 'model',
        parts: [{ text: entry.text }],
      }));
  }

  /**
   * Export transcript to plain text format
   */
  static exportToText(transcript: Transcript[]): string {
    return transcript
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n\n');
  }

  /**
   * Copy transcript text to clipboard
   */
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

  /**
   * Export transcript to PDF using jsPDF
   */
  static async exportToPdf(transcript: Transcript[], filename: string = 'transcript.pdf'): Promise<void> {
    if (!window.jspdf) {
      throw new Error('jsPDF library not loaded');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Conversation Transcript', 20, 20);
    
    // Add transcript content
    doc.setFontSize(12);
    let yPosition = 40;
    const lineHeight = 10;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    transcript.forEach((entry) => {
      const lines = doc.splitTextToSize(`${entry.speaker}: ${entry.text}`, doc.internal.pageSize.width - 2 * margin);
      
      // Check if we need a new page
      if (yPosition + lines.length * lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      lines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += 5; // Add space between entries
    });

    doc.save(filename);
  }

  /**
   * Export transcript to JSON
   */
  static exportToJson(transcript: Transcript[]): string {
    return JSON.stringify(transcript, null, 2);
  }

  /**
   * Trim transcript history to keep only recent entries
   */
  static trimHistory(transcript: Transcript[], maxEntries: number): Transcript[] {
    return transcript.slice(-maxEntries);
  }

  /**
   * Add a new message to transcript
   */
  static addMessage(
    transcript: Transcript[],
    speaker: Transcript['speaker'],
    text: string,
    isFinal: boolean = true,
    metadata?: Transcript['metadata']
  ): Transcript[] {
    const newEntry: Transcript = {
      speaker,
      text,
      isFinal,
      metadata,
    };
    return [...transcript, newEntry];
  }

  /**
   * Append partial text to the last transcript entry
   */
  static appendPartial(transcript: Transcript[], text: string): Transcript[] {
    if (transcript.length === 0) {
      return this.addMessage(transcript, 'Gemini', text, false);
    }

    const lastEntry = transcript[transcript.length - 1];
    const updatedEntry = {
      ...lastEntry,
      text: lastEntry.text + text,
      isFinal: false,
    };

    return [...transcript.slice(0, -1), updatedEntry];
  }

  /**
   * Finalize the last transcript entry
   */
  static finalizeLast(transcript: Transcript[]): Transcript[] {
    if (transcript.length === 0) return transcript;

    const lastEntry = transcript[transcript.length - 1];
    const updatedEntry = {
      ...lastEntry,
      isFinal: true,
    };

    return [...transcript.slice(0, -1), updatedEntry];
  }

  /**
   * Clear all transcript entries
   */
  static clear(): Transcript[] {
    return [];
  }
}