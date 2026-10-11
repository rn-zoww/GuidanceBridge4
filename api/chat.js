// Vercel serverless function: POST /api/chat. Vercel runs this on demand, so no server needs starting.
// Set GROQ_API_KEY in Vercel → Project → Settings → Environment Variables.
'use strict';
const {handleChat, rateLimited} = require('./_lib/chat-core');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST.'});
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({error:'Too many messages. Please wait a minute.'});
  let payload = req.body;
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { return res.status(400).json({error:'Invalid JSON.'}); } }
  const {status, body} = await handleChat(payload);
  res.status(status).json(body);
};
