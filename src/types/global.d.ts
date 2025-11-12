// --- Globals for browser APIs ---

declare global {
  // Fix: Re-added WakeLock and WakeLockSentinel interfaces. These are experimental APIs
  // and may not be in all TypeScript DOM lib versions. Defining them locally ensures
  // the app compiles correctly and the wake lock feature can be used.
  interface WakeLockSentinel extends EventTarget {
    readonly released: boolean;
    readonly type: 'screen';
    release(): Promise<void>;
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
  }

  interface WakeLock {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  }

  interface Window {
    webkitAudioContext: typeof AudioContext;
    marked: {
      parse: (markdown: string) => string;
    };
    jspdf: {
      jsPDF: any; // Using `any` for simplicity to avoid pulling in full jspdf types
    };
  }
  interface Navigator {
    // Fix: The `wakeLock` property declaration was updated to match the one in modern DOM type
    // libraries (`readonly wakeLock: WakeLock;`). This resolves errors caused by conflicting
    // property modifiers (e.g., optional `?`) and ensures type consistency.
    readonly wakeLock: WakeLock;
  }
}

export {};