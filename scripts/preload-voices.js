#!/usr/bin/env node

/**
 * Voice Preloader Script
 * 
 * This script generates voice samples for all available voices and saves them
 * to static files that can be served with the application. This ensures that
 * users don't need to generate voice samples themselves.
 * 
 * Usage: node scripts/preload-voices.js [output-dir]
 */

import { GoogleGenAI } from '@google/genai';
import { Modality } from '@google/genai';
import { AVAILABLE_VOICES } from '../src/constants/voices.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const OUTPUT_DIR = process.argv[2] || join(process.cwd(), 'public', 'voice-samples');
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB0zVRuswGxr1phrdeFanIsE59OwehCFH8';
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay to avoid rate limiting

// Generate sample text for voice preview
const generateSampleText = (lang = 'en') => {
  return lang === 'ru' 
    ? "Привет! Я голосовой ассистент. Это демонстрация моего голоса."
    : "Hello! I'm a voice assistant. This is a demonstration of my voice.";
};

// Create output directory if it doesn't exist
const ensureOutputDir = () => {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
};

// Generate voice sample for a single voice
const generateVoiceSample = async (ai, voiceName, lang) => {
  try {
    const previewText = generateSampleText(lang);
    
    const speechConfig = {
      voiceConfig: { 
        prebuiltVoiceConfig: { 
          voiceName: voiceName 
        } 
      },
    };
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: previewText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig,
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error(`Error generating sample for ${voiceName}:`, error);
    return null;
  }
};

// Save voice sample to file
const saveVoiceSample = (voiceName, base64Audio, lang) => {
  const filename = `${voiceName.toLowerCase()}_${lang}.json`;
  const filepath = join(OUTPUT_DIR, filename);
  
  const sampleData = {
    voiceName,
    lang,
    base64Audio,
    timestamp: Date.now(),
    text: generateSampleText(lang)
  };
  
  writeFileSync(filepath, JSON.stringify(sampleData, null, 2));
  console.log(`✓ Saved sample for ${voiceName} (${lang})`);
};

// Generate index file with all available voices
const generateIndexFile = () => {
  const indexData = {
    voices: AVAILABLE_VOICES,
    generatedAt: new Date().toISOString(),
    totalVoices: AVAILABLE_VOICES.length
  };
  
  const indexPath = join(OUTPUT_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`✓ Generated index file`);
};

// Main function
const main = async () => {
  console.log('🎤 Starting voice preloader...');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total voices to process: ${AVAILABLE_VOICES.length}`);
  
  // Initialize AI
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Ensure output directory exists
  ensureOutputDir();
  
  let successCount = 0;
  let failureCount = 0;
  
  // Process each voice
  for (let i = 0; i < AVAILABLE_VOICES.length; i++) {
    const voice = AVAILABLE_VOICES[i];
    console.log(`\n[${i + 1}/${AVAILABLE_VOICES.length}] Processing ${voice.name}...`);
    
    try {
      // Generate sample for both English and Russian
      const enSample = await generateVoiceSample(ai, voice.name, 'en');
      const ruSample = await generateVoiceSample(ai, voice.name, 'ru');
      
      if (enSample) {
        saveVoiceSample(voice.name, enSample, 'en');
        successCount++;
      } else {
        console.log(`✗ Failed to generate English sample for ${voice.name}`);
        failureCount++;
      }
      
      if (ruSample) {
        saveVoiceSample(voice.name, ruSample, 'ru');
        successCount++;
      } else {
        console.log(`✗ Failed to generate Russian sample for ${voice.name}`);
        failureCount++;
      }
      
      // Add delay between requests to avoid rate limiting
      if (i < AVAILABLE_VOICES.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
      
    } catch (error) {
      console.error(`✗ Error processing ${voice.name}:`, error);
      failureCount++;
    }
  }
  
  // Generate index file
  generateIndexFile();
  
  console.log('\n🎉 Voice preloader completed!');
  console.log(`✓ Successfully generated: ${successCount} samples`);
  console.log(`✗ Failed: ${failureCount} samples`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  
  if (failureCount > 0) {
    console.log('\n⚠️  Some voice samples failed to generate. Check the logs above for details.');
    process.exit(1);
  }
};

// Run the script
main().catch(error => {
  console.error('❌ Voice preloader failed:', error);
  process.exit(1);
});