import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiPath = req.url?.replace(/^\/api\/gemini-proxy/, '') || '';
    const targetUrl = `https://generativelanguage.googleapis.com${apiPath}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(req.headers['authorization'] && { 'Authorization': req.headers['authorization'] as string }),
      ...(req.headers['x-goog-api-key'] && { 'x-goog-api-key': req.headers['x-goog-api-key'] as string })
    };
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.text(); // Gemini иногда возвращает не только JSON
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
