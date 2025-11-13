// Test file to verify geo-proxy detection functionality
// This can be run in the browser console during development

import { useGeoProxyDetection } from '../src/hooks/useGeoProxyDetection';
import { metricsCollector } from '../src/services/proxyMetrics';

// Test functions that can be called from browser console
declare global {
  interface Window {
    testGeoDetection: () => Promise<void>;
    testMetrics: () => void;
    exportMetrics: () => string;
  }
}

// Test geo-blocking detection
window.testGeoDetection = async () => {
  console.log('🧪 Testing geo-blocking detection...');
  
  try {
    // Test direct connection
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=test', {
      method: 'GET',
    });
    
    console.log('✅ Direct connection test:', response.status, response.statusText);
    
    if (response.status === 401) {
      console.log('✅ Direct connection works (401 = expected auth error)');
    } else if (response.status === 403) {
      const text = await response.text();
      if (text.includes('User location is not supported')) {
        console.log('🚫 Geo-blocking detected');
      } else {
        console.log('⚠️ Other 403 error (not geo-blocking)');
      }
    }
  } catch (error) {
    console.error('❌ Direct connection failed:', error);
  }
  
  try {
    // Test proxy connection
    const response = await fetch('/api/gemini-proxy/health');
    console.log('✅ Proxy connection test:', response.status, response.statusText);
    const data = await response.json();
    console.log('📊 Proxy health data:', data);
  } catch (error) {
    console.error('❌ Proxy connection failed:', error);
  }
};

// Test metrics recording
window.testMetrics = () => {
  console.log('🧪 Testing metrics recording...');
  
  // Record test metrics
  metricsCollector.recordMetric({
    timestamp: Date.now(),
    type: 'direct',
    operation: 'http',
    success: true,
    duration: 150,
    responseSize: 1024,
  });
  
  metricsCollector.recordMetric({
    timestamp: Date.now(),
    type: 'proxy',
    operation: 'websocket',
    success: false,
    duration: 5000,
    error: 'Connection timeout',
  });
  
  const stats = metricsCollector.getStats();
  console.log('📊 Current stats:', stats);
};

// Export metrics
window.exportMetrics = () => {
  const data = {
    stats: metricsCollector.getStats(),
    metrics: metricsCollector.getMetrics(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
};

console.log('🧪 Test functions available:');
console.log('- testGeoDetection(): Test direct and proxy connections');
console.log('- testMetrics(): Record test metrics and show stats');
console.log('- exportMetrics(): Export all metrics as JSON');