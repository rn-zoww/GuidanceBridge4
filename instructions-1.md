# PROGRAM SPECIFICATION: GuidanceBridge

## 1. Context & Core Problem
- **Target User:** Students subjected to bullying and negative peer influence.
- **Problem:** High social friction, fear of peer retaliation, public embarrassment, and social stigma prevent students from seeking help through traditional channels (e.g., physical guidance offices, drop-boxes).
- **Solution:** A web and mobile-responsive bridge connecting vulnerable students to school guidance counselors safely and anonymously.

## 2. Scope & Guardrails (Strict Constraints)
- **In Scope:** AI coping advice, severity assessment, intake routing, and appointment scheduling.
- **Out of Scope:** The AI does NOT conduct deep therapy, replace human counselors, run formal investigations, determine guilt, accuse individuals, support retaliation, or collect live reports for disciplinary judging. Complex/severe cases must immediately route to human counselors.

## 3. Core Features & User Journey

### MUST-HAVE
- **Customizable AI Intake Chatbot:**
  - Delivers immediate coping strategies while adhering to guardrails.
  - Flags case severity (High vs. Low Priority) and re-assesses it on every message, so it can go down as well as up. If a student who showed signs of danger says they are okay or asks to lower the priority, the AI checks in once before lowering the flag. A danger keyword in the student's message forces HIGH unless the same message reassures ("I'm okay", "I won't").
  - Automates counseling routing: after each reply, shows the priority badge and two buttons, a scheduled face-to-face appointment or an anonymous private chat with a counselor.
  - Accessible via a dedicated FULL-SCREEN page (header on top, a small title bar, a scrolling conversation that fills the screen, and an input bar pinned to the bottom; no settings or key fields on screen) AND a persistent floating widget on the bottom-right of every other page. Both share one conversation, and the widget is hidden on the full-screen page.
  - If the AI service cannot be reached, shows the reason in the chat and falls back to built-in coping tips with a local severity flag.
- **Face-to-Face Appointment Form:** Dedicated intake form (students must be logged in) capturing name or nickname (optional), grade and section, optional contact, concern (Bullying, Cyberbullying, Peer pressure, Other), case severity (pre-filled from the chatbot), available date, available time slot, and a description that does not require naming anyone. Submits directly to the counselor dashboard and shows a confirmation.

**Implement Groq Cloud's API as the AI chatbot: POST https://api.groq.com/openai/v1/chat/completions, model `openai/gpt-oss-20b`, `reasoning_effort: "low"`, `max_tokens: 1000`, with the API key stored in a constant named GROQ_KEY (use YOUR_GROQ_API_KEY as the placeholder). Send the full conversation each time. Read the first line of the reply ("SEVERITY: HIGH" or "SEVERITY: LOW") to set the priority badge, then hide that line from the student. Display `**bold**` as bold. It should have this system prompt:**

You are the GuidanceBridge AI Assistant for students. Your job is to provide supportive, immediate coping advice for peer pressure and bullying. STRICT GUARDRAILS: 1. NEVER identify, accuse, or determine the guilt of any individual. 2. NEVER conduct clinical therapy or replace human guidance counselors. 3. Keep advice focused on immediate emotional safety and coping mechanisms. 4. Always evaluate if the case is HIGH or LOW severity. 5. Conclude by offering to schedule a face-to-face appointment or an anonymous private chat with a counselor. Begin every reply with the line "SEVERITY: HIGH" or "SEVERITY: LOW". Re-assess severity on every message using the whole conversation, so it can go down as well as up. HIGH means the student may be in danger now (self-harm, suicidal thoughts, abuse, threats, weapons). If the student earlier showed signs of danger and now says they are fine or asks you to lower the priority, do not just agree: warmly check in once, asking whether they are safe right now and whether those thoughts have passed, and keep HIGH until they clearly say they are safe. Once they do, switch to LOW, stay supportive, and remind them a counselor is available anytime. Do not repeat crisis hotlines or the same safety script in later replies unless there is new danger. Students are in the Philippines, so when a crisis line is needed give only the NCMH Crisis Hotline 1553 and 911, briefly. Write plain text with no markdown symbols.

### OPTIONAL / EXTENSION
1. **Digital Evidence Locker / Private Journal:** Local/encrypted log for timestamped notes or screenshots to optionally share with counselors. (Not built in the current version.)
2. **Counselor Priority Triage Dashboard (built):** Counselor-only inbox with two tabs, Appointments and Anonymous chats. Items are auto-sorted with HIGH priority first, then newest. Shows a summary line (high-priority open, total appointments, total chats). Appointments have a status dropdown (New, Scheduled, Done). If a case was flagged HIGH earlier in the AI chat and later dropped to LOW, show a note on that item so counselors still follow up gently.
3. **Anonymous Chat Portal (built):** Real-time two-way messaging between a student and a counselor. Each student gets a random alias such as "Student-4821", and counselors never see the student's username. Messages sync live across browser tabs. Counselors open a chat from the dashboard and reply there.

## 4. Technical & Design Requirements
- **Platform:** Fully responsive web and mobile application, built as one self-contained HTML file (HTML, CSS, vanilla JavaScript, no frameworks or build step) with hash-based page routing. On phones, the top navigation is a single horizontally scrolling row. Pages: Home, AI chat, Appointment, Anonymous chat, Dashboard, Student login, Counselor login, Log out.
- **Branding / Theme:** University of Perpetual Help System DALTA palette (White, Maroon `#800000`, Gold `#FFD700`). Maroon header with a gold bottom border, Georgia serif headings, a maroon home hero with a gold bridge-arch line that draws itself in (respect reduced-motion settings), plain sentence-case labels, visible gold focus outlines, and aria labels on inputs.
- **Auth & State:** Dedicated Auth (Login/Register) pages for both Users (Students) and Admins (Counselors/Team).
  - Students register with a nickname-style username and password. Appointment, anonymous chat, and portal pages require a student login.
  - Counselors register with a staff username, password, and staff access code (demo code: UPHSD-STAFF). Seed a demo counselor (counselor / counselor123). The dashboard requires a counselor login.
  - Passwords are stored as SHA-256 hashes.
  - Data (users, appointments, chat threads) lives in localStorage, the login session lives in sessionStorage, and storage events keep open tabs in sync.
- **Production note:** Keeping the API key in the page means anyone can read it from the source. For a real deployment, call the AI through your own server and use a real backend and database instead of localStorage.

**Implement Groq Cloud's API as the AI chatbot, with these parameters:**
- Endpoint: POST https://api.groq.com/openai/v1/chat/completions
- Model: `openai/gpt-oss-20b`
- temperature: 0.6
- max_tokens: 1000
- reasoning_effort: "low"
- API key: stored in a constant named GROQ_KEY (use YOUR_GROQ_API_KEY as the placeholder)
- Send the system prompt below plus the full conversation on every request.
- Read the first line of each reply ("SEVERITY: HIGH" or "SEVERITY: LOW") to set the priority badge, then hide that line from the student. Display `**bold**` as bold.

**It should have this system prompt:**

You are the GuidanceBridge AI Assistant for students. Your job is to provide supportive, immediate coping advice for peer pressure and bullying. STRICT GUARDRAILS:
1. NEVER identify, accuse, or determine the guilt of any individual.
2. NEVER conduct clinical therapy or replace human guidance counselors.
3. Keep advice focused on immediate emotional safety and coping mechanisms.
4. Always evaluate if the case is HIGH or LOW severity.
5. Conclude by offering to schedule a face-to-face appointment or an anonymous private chat with a counselor.
6. Begin every reply with the line "SEVERITY: HIGH" or "SEVERITY: LOW".
7. Re-assess severity on every message using the whole conversation, so it can go down as well as up.
8. HIGH means the student may be in danger now (self-harm, suicidal thoughts, abuse, threats, weapons).
9. If the student earlier showed signs of danger and now says they are fine or asks you to lower the priority, do not just agree: warmly check in once, asking whether they are safe right now and whether those thoughts have passed, and keep HIGH until they clearly say they are safe. Once they do, switch to LOW, stay supportive, and remind them a counselor is available anytime.
10. Do not repeat crisis hotlines or the same safety script in later replies unless there is new danger.
11. Students are in the Philippines, so when a crisis line is needed give only the NCMH Crisis Hotline 1553 and 911, briefly.
12. Write plain text with no markdown symbols.
