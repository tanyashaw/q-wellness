# Deploy: backend on Render, frontend on Vercel

## 0. Before anything is pushed (required)

Your GitHub repo `tanyashaw/q-wellness` is public and its first commit (`76bd685`) contains the old `.env`, including a Groq API key. Anyone can read it.

1. **Revoke that Groq key** at console.groq.com → API Keys, and create a new one. Do the same for any OpenAI key that was ever in `.env`.
2. **Remove the secret from the repo history.** The simplest way is to replace the history with one clean commit (this deletes the old commits on GitHub):
   ```bash
   rm -rf .git
   git init -b main
   git add .
   git status                 # confirm .env and dev.db are NOT listed
   git commit -m "Initial commit"
   git remote add origin https://github.com/tanyashaw/q-wellness.git
   git push --force -u origin main
   ```
   Even after this, treat the old key as compromised: GitHub may keep cached copies, so revoking in step 1 is the real fix.
3. Put the new key only in Render's dashboard (step 1 below) and your local `.env`.

## 1. Backend on Render

1. Render dashboard → **New → Blueprint** → pick the repo. It reads `render.yaml` (service `qwellness-api`, root `backend`, free plan).
2. When asked, set **`GROQ_API_KEY`** to the new key. Everything else is pre-filled.
3. Deploy. When it is live, open `https://<your-service>.onrender.com/api/health`. It should return `{"ok": true}`.

Notes
- Free instances sleep after about 15 minutes idle and take about a minute to wake. Open the URL a minute before a demo.
- The database is SQLite on temporary disk. It is re-seeded each time the service starts, so bookings made in a demo disappear on restart. That is fine for a demo.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the same repo.
2. Set **Root Directory** to `frontend` (framework: Next.js, detected automatically).
3. Add the environment variable **`API_URL`** = `https://<your-service>.onrender.com` (no trailing slash).
4. Deploy. The browser keeps calling `/api/*` on the Vercel domain, and Vercel forwards it to Render, so no CORS setup is needed.

If you later call the backend directly from another domain, set `CORS_ORIGINS` on Render (comma-separated origins).

## 3. Check it works

1. Open the Vercel URL. The sidebar should say "AI assistant connected".
2. Run the receptionist booking from `DEMO_PLAN.md` (B1 to B7).

## 4. Things to know

- Anyone with the Vercel link can use the AI and spend your Groq quota. Keep the link private, or set a spending limit in Groq.
- The app has no login. It uses fictional data only.
- Voice (microphone) needs HTTPS and Chrome. Vercel provides HTTPS.
