# Geo-Blocking Auto-Detection and Proxy Metrics

This document describes the new geo-blocking auto-detection and proxy metrics system implemented for the live voice assistant.

## Overview

The system automatically detects when Google Gemini API is geo-blocked and switches to using a proxy, while collecting detailed performance metrics for both direct and proxy connections.

## Features

### 1. Auto-Detection (`useGeoProxyDetection`)

- **Automatic Detection**: Tests direct connection to Google Gemini API on app load and every 5 minutes
- **Smart Switching**: Automatically enables proxy when geo-blocking is detected
- **Fallback Support**: Tests proxy availability when direct connection fails
- **Real-time Status**: Provides real-time connection status and last check time

### 2. Metrics Collection (`proxyMetrics`)

- **Comprehensive Tracking**: Records metrics for HTTP requests, WebSocket connections, and TTS operations
- **Performance Analysis**: Tracks latency, success rates, and error rates
- **Memory Efficient**: Stores last 1000 metrics with automatic cleanup
- **Batch Analytics**: Sends metrics to analytics endpoint in batches

### 3. Development UI (`ProxyStatsPanel`)

- **Real-time Dashboard**: Shows current connection status and detailed statistics
- **Visual Indicators**: Progress bars for success rates and latency comparisons
- **Export Functionality**: Export metrics as JSON for analysis
- **Dev-only**: Only visible in development mode

## Implementation Details

### Files Created/Modified

1. **`src/hooks/useGeoProxyDetection.ts`** (NEW)
   - Auto-detection logic for geo-blocking
   - Connection testing for direct and proxy routes
   - State management for detection results

2. **`src/services/proxyMetrics.ts`** (NEW)
   - Metrics collection and analysis
   - Batch processing for analytics
   - React hook for component integration

3. **`src/components/ProxyStatsPanel.tsx`** (NEW)
   - Development-only metrics dashboard
   - Real-time statistics display
   - Export and management functions

4. **`src/hooks/useSessionManager.ts`** (MODIFIED)
   - Integration with auto-detection
   - Automatic proxy switching
   - Enhanced error handling

5. **`src/hooks/useLiveSession.ts`** (MODIFIED)
   - WebSocket metrics collection
   - Connection performance tracking

6. **`src/hooks/useAudioEngine.ts`** (MODIFIED)
   - TTS playback metrics
   - Audio performance tracking

7. **`src/App.tsx`** (MODIFIED)
   - Added ProxyStatsPanel for development

8. **`api/gemini-proxy/health.ts`** (NEW)
   - Health check endpoint for proxy availability

9. **`api/analytics/proxy-metrics.ts`** (NEW)
   - Analytics endpoint for metrics collection

### Configuration

Updated `src/proxy.ts`:
```typescript
export const PROXY_CONFIG = {
  HTTP_PROXY_URL: '/api/gemini-proxy',
  WSS_PROXY_URL: 'wss://subbot.sheepoff.workers.dev',
  AUTO_ENABLE_PROXY: true,
  HEALTH_ENDPOINT: '/api/gemini-proxy/health',
};
```

## Usage

### In Development

The ProxyStatsPanel automatically appears in the bottom-right corner during development, showing:
- Connection status (Direct OK / Blocked)
- Request statistics (Total/Direct/Proxy)
- Success rates with progress bars
- Latency comparisons
- Recent errors

### Testing

Use the browser console to test functionality:

```javascript
// Test connection detection
window.testGeoDetection();

// Test metrics recording
window.testMetrics();

// Export metrics
console.log(window.exportMetrics());
```

## Metrics Collected

For each operation, the system records:
- **Timestamp**: When the operation occurred
- **Type**: 'direct' or 'proxy'
- **Operation**: 'websocket', 'http', or 'tts'
- **Success**: Boolean indicating success/failure
- **Duration**: Operation duration in milliseconds
- **Error**: Error message (if failed)
- **Response Size**: Response size in bytes (for HTTP)

## Analytics

Metrics are automatically sent to `/api/analytics/proxy-metrics` in batches:
- Every 10 metrics
- Includes user agent and locale data
- Anonymous and aggregated

## Performance Impact

- **Minimal Overhead**: Metrics collection uses `performance.now()` for accurate timing
- **Memory Efficient**: Limited to 1000 recent metrics
- **Batch Processing**: Reduces network overhead for analytics
- **Development Only**: UI components only load in development mode

## Troubleshooting

### Common Issues

1. **Proxy Health Check Fails**
   - Check if `/api/gemini-proxy/health` endpoint is accessible
   - Verify proxy server is running

2. **Metrics Not Recording**
   - Ensure `metricsCollector` is imported in relevant files
   - Check browser console for any JavaScript errors

3. **Auto-Detection Not Working**
   - Verify Google API connectivity
   - Check browser console for detection logs

### Debug Logs

The system provides detailed console logs:
- `✅ Direct connection works - no proxy needed`
- `⚠️ Direct connection blocked - using proxy`
- `❌ Both direct and proxy connections failed`
- `📊 [DIRECT/PROXY] operation - ✅/❌ durationms`

## Future Enhancements

1. **Advanced Analytics**: Dashboard for historical metrics
2. **A/B Testing**: Compare performance of different proxy endpoints
3. **Smart Routing**: Automatic selection of fastest proxy based on metrics
4. **User Preferences**: Allow manual proxy selection with performance hints
5. **Regional Detection**: Detect optimal proxy based on user location