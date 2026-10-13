// Vercel serverless function: POST /api/notify. Emails the counselors about a HIGH priority case.
// Set BREVO_API_KEY, MAIL_FROM and COUNSELOR_EMAILS in Vercel → Project → Settings → Environment Variables.
'use strict';
const {handleNotify, mailLimited} = require('./_lib/mail-core');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST.'});
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (mailLimited(ip)) return res.status(429).json({error:'Too many alerts. Please wait a few minutes.'});
  let payload = req.body;
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { return res.status(400).json({error:'Invalid JSON.'}); } }
  const {status, body} = await handleNotify(payload);
  res.status(status).json(body);
};
