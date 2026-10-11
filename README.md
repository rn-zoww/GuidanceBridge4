# GuidanceBridge

A safe, anonymous bridge between University of Perpetual Help System DALTA students and their guidance counselors.

- **Students** (no account needed): talk to an AI coping assistant, book a face-to-face appointment, or chat anonymously with a counselor under a random alias.
- **Counselors** (sign-in required): a triage dashboard that lists high-priority cases first, with full-page views for each request and chat.

The AI assistant runs on [Groq](https://groq.com). It gives coping steps, flags each case as HIGH or LOW priority, and never names or blames anyone.

## Assistant mascot

The assistant's face is a book-shaped mascot (maroon book, gold graduation cap, round glasses) whose expression follows the conversation:

- The AI tags every reply with a hidden `MOOD:` line (`WARM`, `CARING`, `CONCERNED`, `ENCOURAGING` or `RELIEVED`), next to the `SEVERITY:` line. The page removes both lines and shows the mood on the mascot.
- The mascot also reacts on its own: it waves hello, leans in while the student types, reacts the moment a message is sent, and waves goodbye when the chat ends.
- A HIGH priority conversation never gets a cheerful face, whatever the tag says.
- If a reply has no tag (for example the built-in tips shown when the AI is unreachable), the page picks a mood from the wording.

The drawing and its expressions live in `index.html` (`MASCOT_SVG`, and the `assistant mascot` block in the CSS). The mood instruction sent to the AI is in `api/_lib/chat-core.js`.

## Project structure

| Path | What it is |
|---|---|
| `index.html` | The whole website (single page, no build step) |
| `api/chat.js` | Vercel serverless function: `POST /api/chat` |
| `api/_lib/chat-core.js` | Shared AI logic: system prompt, input checks, Groq call |
| `server.js` | Local server for development (serves the site + `/api/chat`) |
| `vercel.json` | Vercel settings (security headers) |
| `.env.example` | Template showing which environment variables are needed |

The Groq API key is **never** stored in this repository or sent to the browser. The browser calls `/api/chat`, and the server adds the key.

## Deploy to Vercel

1. Push this repository to GitHub.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repository.
   - Framework preset: **Other**. Leave the build command and output directory empty.
3. Under **Environment Variables**, add:
   - `GROQ_API_KEY` = your Groq key (from [console.groq.com/keys](https://console.groq.com/keys))
   - Optional: `GROQ_MODEL` (defaults to `openai/gpt-oss-20b`)
4. Click **Deploy**. Every later push to GitHub redeploys automatically.

If you change the key later, update it in Vercel's Environment Variables and redeploy.

## Run locally

Requires Node.js 20.12 or newer.

1. Create the file `%USERPROFILE%\.guidancebridge\.env` (Windows) or `~/.guidancebridge/.env` (macOS/Linux) containing:
   ```
   GROQ_API_KEY=your_key_here
   ```
   It lives **outside** the project folder on purpose, so it can never be committed or uploaded by accident.
2. Start the server:
   ```
   npm start
   ```
3. Open http://localhost:3000

Opening `index.html` directly from the file system works too, but the assistant then shows built-in coping tips instead of AI replies, because there is no server to call.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Counselor | `counselor` | `counselor123` |
| Student (optional) | `student` | `student123` |

Staff access code for creating new counselor accounts: `UPHSD-STAFF`.

> **Note:** this is a prototype. Accounts, appointments and chats are saved in each visitor's browser (`localStorage`), not in a shared database, and passwords are only hashed in the browser. Change the demo passwords and staff code, and add a real backend database and server-side authentication before using it with real students.

## Safety

GuidanceBridge is **not** an emergency service. In the Philippines, anyone in danger should call **911** or the **NCMH Crisis Hotline 1553**.
