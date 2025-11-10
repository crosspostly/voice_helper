# Linguistics Assistant Integration

This document describes the integration of the Linguistics Assistant service into the Live Voice Assistant application.

## Overview

The Linguistics Assistant provides structured learning experiences with progress tracking, recommended exercises, and personalized feedback. It integrates seamlessly with the existing voice assistant infrastructure while maintaining backward compatibility with all existing personas.

## Features

### 1. Linguistics Service Integration
- **API Client**: Robust HTTP client with retry logic, backoff, and environment configuration
- **Mock Service**: Development mock service for testing and offline development
- **Health Checks**: Automatic service availability detection and graceful fallback

### 2. New Persona
- **Linguistics Assistant**: New preset persona that routes through the linguistics service
- **Structured Responses**: Receives detailed feedback with exercises and progress updates
- **Context Awareness**: Uses conversation history for personalized responses

### 3. Enhanced UI Components
- **ProgressCard**: Visual display of skill progress and recommended exercises
- **ServiceStatusIndicator**: Real-time service status with accessibility support
- **Responsive Design**: Mobile-friendly layouts with keyboard navigation

### 4. Session Management
- **Dual Mode**: Supports both regular Gemini and linguistics service sessions
- **Seamless Switching**: Automatic routing based on selected persona
- **Error Handling**: Graceful degradation when service is unavailable

## Architecture

### API Client (`services/linguisticsApi.ts`)
```typescript
// Environment-based configuration
const client = new LinguisticsApiClient(); // Uses VITE_LINGUISTICS_API_URL

// Retry logic with exponential backoff
await client.processUtterance(userId, sessionId, utterance);

// Mock service support
VITE_LINGUISTICS_USE_MOCK=true // Enables mock for development
```

### Hook Integration (`hooks/useLinguisticsSession.ts`)
```typescript
const linguisticsSession = useLinguisticsSession({
  selectedAssistant,
  userId,
  setTranscript,
  playAudio,
  log,
});

// Automatic service detection
if (linguisticsSession.isLinguisticsAssistant) {
  await linguisticsSession.startSession();
  await linguisticsSession.processUtterance(text);
}
```

### UI Components
- **ProgressCard**: Displays progress bars, exercise recommendations
- **ServiceStatusIndicator**: Shows service availability with color coding
- **Enhanced Transcript**: Supports linguistics metadata with structured display

## Configuration

### Environment Variables
```bash
# Service URL
VITE_LINGUISTICS_API_URL=http://localhost:8000

# Mock mode (development)
VITE_LINGUISTICS_USE_MOCK=false

# Debug logging
VITE_LINGUISTICS_DEBUG=false
```

### Persona Definition
```typescript
{
  titleKey: "persona_linguistics",
  prompt: "LINGUISTICS_ASSISTANT",
  isLinguisticsService: true, // Special routing flag
}
```

## Testing

### Unit Tests
- **API Client Tests**: Comprehensive coverage of HTTP client, retry logic, and error handling
- **Hook Tests**: React Testing Library tests for session management and state updates
- **Component Tests**: Visual rendering and accessibility testing for UI components

### Mock Service
- **Realistic Responses**: Context-aware mock responses based on utterance content
- **Progress Simulation**: Automatic skill progression and exercise recommendations
- **Development Support**: Enables offline development without backend service

## Usage

### For Development
1. **Start Mock Service**:
   ```bash
   VITE_LINGUISTICS_USE_MOCK=true npm run dev
   ```

2. **Use Real Service**:
   ```bash
   VITE_LINGUISTICS_API_URL=http://localhost:8000 npm run dev
   ```

### For Production
1. **Deploy Service**: Ensure linguistics service is accessible at configured URL
2. **Configure Environment**: Set production API URL in deployment
3. **Test Integration**: Verify service health and fallback behavior

## Response Structure

### Linguistics Response
```typescript
{
  response: {
    summary: string,           // TTS-friendly summary
    detailed_text: string,      // Full response with explanations
    exercises: Exercise[],      // Recommended practice items
    progress_updates: ProgressUpdate[], // Skill improvements
  },
  audio_data?: string,         // Base64 encoded TTS audio
  context_used: boolean,       // Whether conversation history was used
}
```

### Exercise Format
```typescript
{
  title: string,
  description: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
}
```

### Progress Update Format
```typescript
{
  category: string,    // e.g., "Speaking", "Listening", "Vocabulary"
  level: number,       // Current skill level (1-10)
  description: string, // Progress explanation
}
```

## Accessibility

### Screen Reader Support
- **ARIA Labels**: All status indicators have proper ARIA labels
- **Live Regions**: Progress updates announced via aria-live regions
- **Keyboard Navigation**: Full keyboard support for all interactive elements

### Visual Design
- **Color Coding**: Consistent color scheme for difficulty levels and status
- **High Contrast**: WCAG AA compliant color combinations
- **Responsive**: Mobile-optimized layouts and touch targets

## Error Handling

### Service Unavailable
- **Graceful Fallback**: Automatic switch to regular Gemini when service is down
- **User Feedback**: Clear error messages and recovery options
- **Retry Logic**: Automatic reconnection attempts with exponential backoff

### Network Issues
- **Offline Support**: Mock service enables offline development
- **Timeout Handling**: Configurable timeouts with user feedback
- **Recovery**: Automatic session recovery on reconnection

## Performance

### Optimization
- **Lazy Loading**: Components load only when needed
- **Memoization**: Expensive computations are cached
- **Bundle Size**: Tree-shaking removes unused linguistics code

### Monitoring
- **Health Checks**: Regular service availability monitoring
- **Error Logging**: Comprehensive error tracking and reporting
- **Performance Metrics**: Response time and success rate tracking

## Future Enhancements

### Planned Features
- **Real-time Collaboration**: Multi-user practice sessions
- **Advanced Analytics**: Detailed learning analytics dashboard
- **Voice Biometrics**: Voice quality analysis and improvement tips
- **Gamification**: Achievement system and progress rewards

### Extensibility
- **Plugin System**: Support for custom exercise types
- **API Versioning**: Backward-compatible API evolution
- **Internationalization**: Multi-language support for exercises

## Troubleshooting

### Common Issues
1. **Service Not Found**: Check VITE_LINGUISTICS_API_URL configuration
2. **Mock Not Working**: Ensure VITE_LINGUISTICS_USE_MOCK=true
3. **Test Failures**: Verify mock imports and vi.clearAllMocks()
4. **Type Errors**: Check interface compatibility between services

### Debug Mode
Enable verbose logging:
```bash
VITE_LINGUISTICS_DEBUG=true npm run dev
```

This integration maintains full compatibility with existing functionality while adding powerful new linguistics learning capabilities.