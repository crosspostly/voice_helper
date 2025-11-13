import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ProxyMetric {
  timestamp: number;
  type: 'direct' | 'proxy';
  operation: 'websocket' | 'http' | 'tts';
  success: boolean;
  duration: number;
  error?: string;
  responseSize?: number;
}

interface AnalyticsPayload {
  metrics: ProxyMetric[];
  timestamp: number;
  userAgent: string;
  locale: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: AnalyticsPayload = req.body;

    if (!payload.metrics || !Array.isArray(payload.metrics)) {
      return res.status(400).json({ error: 'Invalid metrics data' });
    }

    // Log the metrics (in production, you'd store this in a database)
    console.log('📊 Proxy metrics received:', {
      count: payload.metrics.length,
      timestamp: new Date(payload.timestamp).toISOString(),
      userAgent: payload.userAgent,
      locale: payload.locale,
      summary: {
        total: payload.metrics.length,
        direct: payload.metrics.filter(m => m.type === 'direct').length,
        proxy: payload.metrics.filter(m => m.type === 'proxy').length,
        successful: payload.metrics.filter(m => m.success).length,
        failed: payload.metrics.filter(m => !m.success).length,
        avgLatency: payload.metrics.reduce((sum, m) => sum + m.duration, 0) / payload.metrics.length,
      }
    });

    // In a real implementation, you would:
    // 1. Store in a database (e.g., PostgreSQL, MongoDB)
    // 2. Send to analytics service (e.g., Google Analytics, Mixpanel)
    // 3. Aggregate for dashboard display

    return res.status(200).json({
      status: 'received',
      count: payload.metrics.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics processing failed:', error);
    return res.status(500).json({
      error: 'Failed to process analytics data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}