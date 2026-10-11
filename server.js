// GuidanceBridge server: serves the site and proxies the AI chat to Groq.
// Use this for running locally or on always-on hosts (Render, Railway). On Vercel, api/chat.js is used instead.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Load the key file (Node 20.12+ built-in loader). Real environment variables take precedence.
// It is kept OUTSIDE the project folder by default (%USERPROFILE%\.guidancebridge\.env) so uploading
// the folder to GitHub or a host can never include it. GB_ENV_FILE overrides the location.
const os = require('node:os');
const envFiles = [process.env.GB_ENV_FILE, path.join(os.homedir(), '.guidancebridge', '.env'), path.join(__dirname, '.env')].filter(Boolean);
const envFile = envFiles.find(f => fs.existsSync(f));
if (envFile) process.loadEnvFile(envFile);
const {handleChat, rateLimited} = require('./api/_lib/chat-core');

const PORT = Number(process.env.PORT) || 3000;
if (!process.env.GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY. Put it in ' + envFiles[envFiles.length - 2] + ' (see .env.example).');
  process.exit(1);
}

const MAX_BODY = 64 * 1024;
const send = (res, code, obj) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}); res.end(JSON.stringify(obj)); };

async function chat(req, res){
  if (rateLimited(req.socket.remoteAddress)) return send(res, 429, {error:'Too many messages. Please wait a minute.'});
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) return send(res, 413, {error:'Message too long.'}); }
  let payload;
  try { payload = JSON.parse(raw); } catch { return send(res, 400, {error:'Invalid JSON.'}); }
  const {status, body} = await handleChat(payload);
  send(res, status, body);
}

// Static files: only the site itself is served (never .env, server code or other project files).
const PUBLIC = new Set(['/index.html']);
function serveStatic(req, res){
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  if (!PUBLIC.has(p)) { res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('Not found'); }
  fs.readFile(path.join(__dirname, p), (err, buf) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('Not found'); }
    // Same security headers as vercel.json, so local and deployed behave alike.
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'X-Frame-Options':'DENY'});
    res.end(buf);
  });
}

http.createServer((req, res) => {
  if (req.url === '/api/chat') return req.method === 'POST' ? chat(req, res) : send(res, 405, {error:'Use POST.'});
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  send(res, 405, {error:'Method not allowed.'});
}).listen(PORT, () => {
  console.log(`GuidanceBridge running at http://localhost:${PORT}`);
  // Lets autostart\uninstall.ps1 stop exactly this process.
  const pidFile = path.join(__dirname, 'server.pid');
  fs.writeFileSync(pidFile, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(pidFile); } catch {} });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
});
