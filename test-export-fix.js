// Simple test to check if exportToPdf is properly guarded
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing exportToPdf fixes...\n');

// Check if the ModalsContainer.tsx has the fix
const modalsContainerPath = path.join(__dirname, 'src/components/VoiceApp/ModalsContainer.tsx');
const modalsContainerContent = fs.readFileSync(modalsContainerPath, 'utf8');

if (modalsContainerContent.includes('session.transcript?.exportToPdf?.()')) {
  console.log('✅ ModalsContainer.tsx: Fixed with optional chaining');
} else {
  console.log('❌ ModalsContainer.tsx: Missing optional chaining');
}

// Check if SettingsModal.tsx has the fix
const settingsModalPath = path.join(__dirname, 'src/components/SettingsModal.tsx');
const settingsModalContent = fs.readFileSync(settingsModalPath, 'utf8');

if (settingsModalContent.includes('onSavePdf?.()')) {
  console.log('✅ SettingsModal.tsx: Fixed with optional chaining');
} else {
  console.log('❌ SettingsModal.tsx: Missing optional chaining');
}

// Check if VoiceAppContext.tsx has default values
const voiceAppContextPath = path.join(__dirname, 'src/components/VoiceApp/VoiceAppContext.tsx');
const voiceAppContextContent = fs.readFileSync(voiceAppContextPath, 'utf8');

if (voiceAppContextContent.includes('defaultTranscript') && voiceAppContextContent.includes('exportToPdf: async () => console.warn')) {
  console.log('✅ VoiceAppContext.tsx: Has default transcript with safe exportToPdf');
} else {
  console.log('❌ VoiceAppContext.tsx: Missing default transcript or safe exportToPdf');
}

// Check if useTranscript.ts includes setTranscript
const useTranscriptPath = path.join(__dirname, 'src/hooks/useTranscript.ts');
const useTranscriptContent = fs.readFileSync(useTranscriptPath, 'utf8');

if (useTranscriptContent.includes('setTranscript: (transcript: Transcript[]) => void;')) {
  console.log('✅ useTranscript.ts: Includes setTranscript in interface');
} else {
  console.log('❌ useTranscript.ts: Missing setTranscript in interface');
}

if (useTranscriptContent.includes('setTranscript, // Add setTranscript for external updates')) {
  console.log('✅ useTranscript.ts: Returns setTranscript method');
} else {
  console.log('❌ useTranscript.ts: Missing setTranscript in return object');
}

// Check if ErrorBoundary.tsx exists
const errorBoundaryPath = path.join(__dirname, 'src/components/ErrorBoundary.tsx');
if (fs.existsSync(errorBoundaryPath)) {
  console.log('✅ ErrorBoundary.tsx: Created successfully');
} else {
  console.log('❌ ErrorBoundary.tsx: Not found');
}

// Check if App.tsx includes ErrorBoundary
const appPath = path.join(__dirname, 'src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

if (appContent.includes('<ErrorBoundary>')) {
  console.log('✅ App.tsx: Wrapped with ErrorBoundary');
} else {
  console.log('❌ App.tsx: Not wrapped with ErrorBoundary');
}

console.log('\nTesting complete!');