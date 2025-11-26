# Voice Preloader and Dropdown System

This document describes the new voice preloader and dropdown system that replaces the full-screen voice selector.

## Overview

The new system includes:

1. **Compact Voice Dropdown** - A dropdown interface for voice selection instead of a full-screen list
2. **Automatic Voice Preloading** - Voice samples are pre-generated during deployment
3. **Browser Cache Storage** - Preloaded samples are stored in localStorage for instant access
4. **Deploy Script** - Automated script to generate voice samples during build

## Components

### VoiceDropdown
- **Location**: `components/VoiceDropdown.tsx`
- **Purpose**: Compact dropdown interface for voice selection
- **Features**:
  - Search functionality
  - Gender filtering (All/Female/Male)
  - Voice preview buttons
  - Preloaded status indicators
  - Click-outside-to-close behavior

### CompactVoicePreloaderControls
- **Location**: `components/CompactVoicePreloaderControls.tsx`
- **Purpose**: Minimal interface showing preload status
- **Features**:
  - Progress bar
  - Preload count display
  - Load all button
  - Status indicators

## Preloader System

### PreloadedVoiceLoader
- **Location**: `services/preloadedVoiceLoader.ts`
- **Purpose**: Loads pre-generated voice samples from static files
- **Features**:
  - Loads samples from `/voice-samples/` directory
  - Fallback to localStorage cache
  - Automatic initialization on app start

### Enhanced useVoiceSamplePreloader Hook
- **Location**: `hooks/useVoiceSamplePreloader.ts`
- **Enhancements**:
  - Integration with preloaded samples
  - Priority: preloaded → localStorage → generate on-demand
  - Improved caching logic

## Deployment Scripts

### preload-voices.js
- **Location**: `scripts/preload-voices.js`
- **Purpose**: Generates voice samples for all voices
- **Usage**:
  ```bash
  node scripts/preload-voices.js [output-dir]
  ```
- **Features**:
  - Generates samples for English and Russian
  - Rate limiting to avoid API limits
  - Progress tracking
  - Error handling

### deploy-with-voices.sh
- **Location**: `scripts/deploy-with-voices.sh`
- **Purpose**: Complete deployment with voice preloading
- **Usage**:
  ```bash
  ./scripts/deploy-with-voices.sh
  ```
- **Features**:
  - Installs dependencies
  - Preloads voice samples
  - Builds application
  - Copies samples to build directory
  - Creates manifest file

## Usage Instructions

### Development
1. Start development server normally:
   ```bash
   npm run dev
   ```

2. Voice samples will be generated on-demand during development

### Production Deployment
1. Use the deployment script:
   ```bash
   npm run deploy-with-voices
   ```

2. Or manually:
   ```bash
   # Generate voice samples
   npm run preload-voices
   
   # Build application
   npm run build
   
   # Copy samples to build directory
   cp -r public/voice-samples dist/
   ```

### Environment Variables
- `GEMINI_API_KEY`: API key for voice generation (optional, uses default if not set)

## File Structure

```
public/
├── voice-samples/
│   ├── achernar_en.json
│   ├── achernar_ru.json
│   ├── aoede_en.json
│   ├── aoede_ru.json
│   └── ...
└── ...

dist/
├── voice-samples/
│   └── ... (copied from public)
├── voice-manifest.json
└── ...
```

## Voice Sample Format

Each voice sample file contains:
```json
{
  "voiceName": "Achernar",
  "lang": "en",
  "base64Audio": "base64-encoded-audio-data",
  "timestamp": 1234567890123,
  "text": "Hello! I'm a voice assistant..."
}
```

## Benefits

1. **Improved UX**: Compact dropdown instead of full-screen interface
2. **Faster Loading**: Pre-generated samples load instantly
3. **Reduced API Calls**: Samples generated once during deployment
4. **Better Performance**: No waiting for voice generation during use
5. **Offline Capability**: Preloaded samples work offline
6. **Scalable**: Easy to add new voices without user intervention

## Migration Notes

The old `VoiceSelector` component has been replaced by `VoiceDropdown`. The interface is now much more compact and user-friendly. Voice samples are automatically preloaded during deployment, eliminating the need for users to generate them manually.

## Troubleshooting

### Voice Samples Not Loading
- Check if `/voice-samples/` directory exists in build output
- Verify network requests to sample files in browser dev tools
- Check console for error messages

### Preloading Script Fails
- Verify GEMINI_API_KEY is set correctly
- Check network connectivity
- Monitor API rate limits

### Build Issues
- Ensure Node.js version is compatible
- Check disk space for voice samples
- Verify write permissions to output directory