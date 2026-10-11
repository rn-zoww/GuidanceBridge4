// Shared chat logic for both server.js (local / Render / Railway) and api/chat.js (Vercel).
// Lives in api/_lib so Vercel neither serves it as a static file nor deploys it as its own function.
// The Groq API key is read from the GROQ_API_KEY environment variable and never reaches the browser.
'use strict';

// System prompt (as specified) + lines so the reply can be parsed for the severity flag and the mascot's mood.
// Kept server-side so a visitor cannot replace it and use the key for something else.
const SP = `You are the GuidanceBridge AI Assistant for students. Your job is to provide supportive, immediate coping advice for peer pressure and bullying. STRICT GUARDRAILS: 1. NEVER identify, accuse, or determine the guilt of any individual. 2. NEVER conduct clinical therapy or replace human guidance counselors. 3. Keep advice focused on immediate emotional safety and coping mechanisms. 4. Always evaluate if the case is HIGH or LOW severity. 5. Conclude by offering to schedule a face-to-face appointment or an anonymous private chat with a counselor. Begin every reply with the line "SEVERITY: HIGH" or "SEVERITY: LOW". Re-assess severity on every message using the whole conversation, so it can go down as well as up. HIGH means the student may be in danger now (self-harm, suicidal thoughts, abuse, threats, weapons). If the student earlier showed signs of danger and now says they are fine or asks you to lower the priority, do not just agree: warmly check in once, asking whether they are safe right now and whether those thoughts have passed, and keep HIGH until they clearly say they are safe. Once they do, switch to LOW, stay supportive, and remind them a counselor is available anytime. Do not repeat crisis hotlines or the same safety script in later replies unless there is new danger. Students are in the Philippines, so when a crisis line is needed give only the NCMH Crisis Hotline 1553 and 911, briefly. Directly after the severity line, write a second line "MOOD: " followed by exactly one of WARM, CARING, CONCERNED, ENCOURAGING or RELIEVED. It names the feeling a kind listener would show while saying this reply, and it sets the expression of the mascot the student sees: CARING when the student is hurt, sad, scared, lonely or embarrassed; CONCERNED when severity is HIGH or you are worried about their safety; ENCOURAGING when they took a brave or healthy step or you are building their confidence; RELIEVED when they tell you they are safe or feeling better; WARM for greetings, thanks, questions and anything else. Never use WARM, ENCOURAGING or RELIEVED while severity is HIGH. The student never sees these two lines, so do not mention them. Write plain text with no markdown symbols. You have already introduced yourself to the student as the GuidanceBridge Assistant, so do not repeat the introduction.`;

const MAX_MSGS = 40, MAX_CHARS = 2000;
const RATE = {windowMs: 60_000, max: 20}, hits = new Map();

function rateLimited(ip){
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.length > RATE.max;
}

// Takes the parsed request body and returns {status, body} ready to send as JSON.
async function handleChat(payload){
  const key = process.env.GROQ_API_KEY, model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  if (!key) return {status:500, body:{error:'The server is missing GROQ_API_KEY.'}};
  let messages = payload && payload.messages;
  if (!Array.isArray(messages) || !messages.length) return {status:400, body:{error:'No messages.'}};
  // Only plain user/assistant turns are forwarded; the system prompt is always ours.
  messages = messages.slice(-MAX_MSGS)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({role:m.role, content:m.content.slice(0, MAX_CHARS)}));
  if (!messages.length) return {status:400, body:{error:'No valid messages.'}};
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:'Bearer ' + key},
      body:JSON.stringify({model, temperature:.6, max_tokens:1000, reasoning_effort:'low', messages:[{role:'system', content:SP}, ...messages]})
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return {status:502, body:{error:'AI service error ' + r.status + (data.error && data.error.message ? ' - ' + data.error.message : '')}};
    const content = ((((data.choices || [])[0] || {}).message || {}).content || '').trim();
    if (!content) return {status:502, body:{error:'Empty reply from the AI'}};
    return {status:200, body:{content}};
  } catch (e) {
    return {status:502, body:{error:'Could not reach the AI service.'}};
  }
}

module.exports = {handleChat, rateLimited};
