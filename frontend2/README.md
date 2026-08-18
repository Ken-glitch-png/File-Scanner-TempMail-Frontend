# Sinta Tools — Frontend (File Scanner + Temp Mail)

React (Vite) frontend for the two backend services from `backend2/`. This
does **not** include the email breach checker — that stays as the separate
standalone `leak-checker.html` and isn't touched by this project.

## Local setup

```bash
cp .env.example .env      # set VITE_API_BASE_URL to your local or deployed backend
npm install
npm run dev                # http://localhost:5173
```

Run the backend from `backend2/` alongside this (see its README) so
`VITE_API_BASE_URL` has something to talk to.

## Deploying to Vercel

1. Push this folder to a GitHub repo (or a subfolder of your monorepo — set
   Vercel's "Root Directory" to `frontend2` if so).
2. Import it in Vercel. Framework preset: **Vite**.
3. Add an environment variable: `VITE_API_BASE_URL` = your Render gateway's
   public URL, e.g. `https://your-gateway.onrender.com`.
4. Deploy. Also add this exact Vercel URL to `ALLOWED_ORIGINS` in the
   backend's environment variables on Render, or CORS will block it.

## What's here

- **File Scanner tab** — drag-and-drop or click to pick a file, uploads to
  `POST /api/scan-file`, shows a verdict (clean / suspicious / malicious /
  unknown) with the reasons why, plus the file's SHA-256 hash.
- **Temp Mail tab** — generates a disposable address via
  `POST /api/temp-mail/create`, then polls `GET /api/temp-mail/:inbox` every
  10 seconds for new messages until it expires. Address is click-to-copy.

Both share the same visual language (navy/paper/gold, "receipt" result
cards) as the standalone breach checker, so they feel like the same product
even though they're deployed separately.
