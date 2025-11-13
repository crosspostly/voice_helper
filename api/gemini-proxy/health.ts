import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test if the proxy can reach Google's API
    const targetUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=health-check';
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // We don't care about the auth status, just that the connection works
    if (response.status === 401 || response.status === 403 || response.ok) {
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        proxyTarget: 'generativelanguage.googleapis.com',
        testStatus: response.status,
      });
    } else {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        proxyTarget: 'generativelanguage.googleapis.com',
        testStatus: response.status,
        error: 'Target API not responding correctly',
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}