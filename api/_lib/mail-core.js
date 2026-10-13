// Shared email-alert logic used by both server.js (local / always-on hosts) and api/notify.js (Vercel).
// Emails the counselors through Brevo when a student submits a HIGH priority case.
'use strict';

// The email is written here from a few fixed choices, so the endpoint cannot be used to send someone
// else's text. It never carries the student's name, contact details or what they wrote.
const KINDS = {
  appointment: {what:'appointment request', did:'submitted a HIGH priority appointment request', tab:'a'},
  chat: {what:'anonymous chat', did:'started a HIGH priority anonymous chat', tab:'c'}
};
const CONCERNS = ['Bullying', 'Cyberbullying', 'Peer pressure', 'Other'];
const SLOTS = ['Morning', 'Lunch break', 'Afternoon', 'After class'];

// Alerts are rare, so the limits are tight: a few per visitor, and a ceiling for everyone combined
// that keeps the Brevo free tier (about 300 emails a day) from being used up.
const RATE = {windowMs: 10 * 60_000, max: 3, maxAll: 30}, hits = new Map();
let sentAll = [];

function mailLimited(ip){
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  sentAll = sentAll.filter(t => now - t < 60 * 60_000);
  h.push(now); hits.set(ip, h); sentAll.push(now);
  if (hits.size > 5000) hits.clear();
  return h.length > RATE.max || sentAll.length > RATE.maxAll;
}

const addresses = s => String(s || '').split(/[,;\s]+/).filter(a => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)).slice(0, 20);

// Takes the parsed request body and returns {status, body} ready to send as JSON.
async function handleNotify(payload){
  const key = process.env.BREVO_API_KEY, from = addresses(process.env.MAIL_FROM)[0], to = addresses(process.env.COUNSELOR_EMAILS);
  if (!key || !from || !to.length) return {status:503, body:{error:'Email alerts are not set up on the server.'}};
  const kind = KINDS[payload && payload.kind];
  if (!kind) return {status:400, body:{error:'Unknown alert.'}};

  const lines = ['A student has ' + kind.did + ' on GuidanceBridge.', ''];
  if (CONCERNS.includes(payload.concern)) lines.push('Concern: ' + payload.concern);
  if (/^\d{4}-\d{2}-\d{2}$/.test(payload.date || '') && SLOTS.includes(payload.slot)) lines.push('Available: ' + payload.date + ', ' + payload.slot);
  lines.push('Received: ' + new Date().toLocaleString('en-PH', {timeZone:'Asia/Manila', dateStyle:'medium', timeStyle:'short'}) + ' (Philippine time)', '');
  const site = (process.env.SITE_URL || '').replace(/\/+$/, '');
  lines.push('Please open the triage dashboard to review it and respond' + (site ? ': ' + site + '/#/dashboard?tab=' + kind.tab : '.'), '');
  lines.push("To protect the student's privacy, this email leaves out their name, contact details and what they wrote.");

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:'POST',
      headers:{'Content-Type':'application/json', Accept:'application/json', 'api-key':key},
      body:JSON.stringify({sender:{name:'GuidanceBridge', email:from}, to:to.map(email => ({email})), subject:'GuidanceBridge: HIGH priority ' + kind.what, textContent:lines.join('\n')}),
      signal:AbortSignal.timeout(15_000)
    });
    if (r.ok) return {status:200, body:{ok:true}};
    const data = await r.json().catch(() => ({}));
    console.error('[notify] Brevo error ' + r.status + (data.message ? ' - ' + data.message : ''));
  } catch (e) {
    console.error('[notify] Could not reach Brevo.');
  }
  return {status:502, body:{error:'The email alert could not be sent.'}};
}

module.exports = {handleNotify, mailLimited};
