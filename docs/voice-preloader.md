# Voice Sample Preloader Feature

## Overview
This feature adds voice sample preloading to improve user experience when selecting voices. Users can preload voice samples to avoid waiting for API calls when previewing different voices.

## Features

### 1. Fixed Scrolling Issue
- **Problem**: When selecting a voice, the list would scroll to the top, making it hard to find the selected voice again.
- **Solution**: Added smooth scrolling that centers the selected voice in view using `scrollIntoView` with `block: 'center'`.

### 2. Voice Sample Preloading
- **Cache System**: Voice samples are cached in localStorage with expiration (7 days)
- **Visual Indicators**: 
  - Green button for preloaded voices
  - Gray button for non-preloaded voices
  - Progress bar showing preload status
- **Batch Preloading**: Users can preload all voice samples at once

### 3. Components

#### VoiceSampleCache (`services/voiceSampleCache.ts`)
- Manages localStorage caching of voice samples
- Handles expiration (7 days)
- Limits cache to 20 most recent samples

#### useVoiceSamplePreloader (`hooks/useVoiceSamplePreloader.ts`)
- Custom hook for managing voice sample preloading
- Provides methods for:
  - Preloading individual voices
  - Preloading all voices
  - Playing cached samples
  - Managing cache

#### VoicePreloaderControls (`components/VoicePreloaderControls.tsx`)
- UI component for preloader controls
- Shows progress bar and status
- Provides "Preload All" button

#### VoiceSelector (Updated)
- Added smooth scrolling to selected voice
- Shows preloaded status with color-coded buttons
- Uses cached samples when available

## Usage

### For Users
1. **Manual Preloading**: Click "Preload All" button to download all voice samples
2. **Individual Preloading**: Click preview button on any voice to preload it
3. **Visual Feedback**: Green buttons indicate preloaded voices

### For Developers

#### Adding Voice Preloader to a Component
```tsx
import { useVoiceSamplePreloader } from './hooks/useVoiceSamplePreloader';

const voicePreloader = useVoiceSamplePreloader({ 
  ai, 
  lang, 
  enabled: !!ai 
});

// Check if voice is preloaded
const isPreloaded = voicePreloader.isVoicePreloaded('Achernar');

// Play cached sample
await voicePreloader.playCachedSample('Achernar');

// Preload all voices
await voicePreloader.preloadAllVoiceSamples();
```

#### VoiceSelector Props
```tsx
<VoiceSelector
  selectedVoice={selectedVoice}
  onVoiceChange={handleVoiceChange}
  lang={lang}
  t={t}
  onPreviewVoice={previewVoice}
  previewingVoice={previewingVoice}
  disabled={voicesLoading || !ai}
  isVoicePreloaded={voicePreloader.isVoicePreloaded}
  onPlayCachedSample={voicePreloader.playCachedSample}
/>
```

## Technical Details

### Caching Strategy
- **Storage**: localStorage
- **Format**: Base64 encoded audio data
- **Expiration**: 7 days
- **Limit**: 20 most recent samples
- **Size Management**: Automatic cleanup of old samples

### API Rate Limiting
- **Delay**: 1 second between preload requests
- **Queue**: Sequential processing to avoid overwhelming API
- **Batch Size**: Processes all voices with delays

### Audio Playback
- **Context**: Separate AudioContext for preview samples
- **Sample Rate**: 24kHz (matches Gemini TTS)
- **Channels**: Mono (1 channel)

## Benefits

1. **Better UX**: No waiting when previewing voices
2. **Reduced API Calls**: Cached samples reduce API usage
3. **Visual Feedback**: Clear indication of preload status
4. **Smooth Scrolling**: Easy navigation through voice list
5. **Offline Capability**: Cached samples work offline

## Future Enhancements

1. **Background Preloading**: Preload samples during idle time
2. **Priority Ordering**: Preload frequently used voices first
3. **Compression**: Compress cached samples to save storage
4. **IndexedDB**: Use IndexedDB for larger storage capacity
5. **Smart Preloading**: Preload based on user preferences

## Troubleshooting

### Common Issues
1. **Cache Full**: Automatically managed, but can be cleared manually
2. **API Limits**: Built-in rate limiting prevents overwhelming
3. **Storage Quota**: Monitor cache size with `voiceSampleCache.getCacheSize()`

### Debug Commands
```javascript
// Clear all cached samples
voiceSampleCache.clearCache();

// Check cache size
console.log('Cache size:', voiceSampleCache.getCacheSize(), 'bytes');

// Get cached voice names
console.log('Cached voices:', voiceSampleCache.getCachedVoiceNames());
```