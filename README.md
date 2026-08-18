# Cybersecurity Platform — Backend (File Scanner + Temp Mail)

This backend covers **only** two services: file scanning and temporary
email. Your breach checker (`leak-checker.html`) stays completely separate
and standalone — it doesn't call this backend and isn't affected by it at all.

```
backend/
├── node-gateway/          # Public API — deploy to Render as Service A
│   ├── src/
│   │   ├── server.js
│   │   ├── config/cors.js
│   │   ├── middleware/{errorHandler,upload}.js
│   │   ├── routes/{scan,tempMail}.js
│   │   └── services/{scanService,tempMailService}.js
│   ├── package.json
│   └── .env.example
└── python-scanner/        # Internal-only — deploy to Render as Service B
    ├── main.py
    ├── app/
    │   ├── routers/scan.py
    │   └── services/scanner.py
    ├── requirements.txt
    └── .env.example
```

```
Your frontend (Vercel/GitHub Pages/etc.)
   │  HTTPS, CORS-restricted to your domain
   ▼
Render: node-gateway  (public)
   │  HTTP over Render's private network + shared-secret header
   ▼
Render: python-scanner (internal)
```

---

## 1. Local setup

### Node gateway

```bash
cd node-gateway
cp .env.example .env
npm install
npm run dev                # http://localhost:8080
```

### Python scanner

```bash
cd python-scanner
cp .env.example .env      # INTERNAL_SERVICE_SECRET must match the Node .env exactly
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

With both running locally, set `SCANNER_SERVICE_URL=http://localhost:8000` in
`node-gateway/.env`.

Sanity check:

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/scan-file -F "file=@/path/to/sample.pdf"
curl -X POST http://localhost:8080/api/temp-mail/create
```

---

## 2. Deploying to Render

Two separate Web Services in the same Render project (so they share a
private network):

### Service A — `node-gateway`
- Root directory: `node-gateway`
- Build command: `npm install`
- Start command: `npm start`
- Env vars from `.env.example`, with:
  - `ALLOWED_ORIGINS` = your real frontend URL(s)
  - `SCANNER_SERVICE_URL` = python-scanner's **internal** Render URL
  - `INTERNAL_SERVICE_SECRET` = a long random string
  - `TEMP_MAIL_DOMAIN` = a domain you own (see note below)

### Service B — `python-scanner`
- Root directory: `python-scanner`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env vars:
  - `INTERNAL_SERVICE_SECRET` = **same value** as Service A
  - `VIRUSTOTAL_API_KEY` = optional
- Keep this service private if your Render plan supports it. If not, the
  `x-internal-secret` header check is what stands between it and public
  internet traffic — make sure the secret is set.

---

## 3. Endpoints

| Endpoint | Method | Notes |
|---|---|---|
| `/api/scan-file` | POST | `multipart/form-data`, field name `file`. 20MB limit, extension + MIME allowlist, processed entirely in memory (never written to disk on either service), forwarded to the Python scanner. |
| `/api/temp-mail/create` | POST | Generates a disposable inbox address, expires after `TEMP_MAIL_TTL_MINUTES`. Rate-limited (5/min/IP). |
| `/api/temp-mail/:inbox` | GET | Returns the inbox's stored messages. 404 if unknown, 410 if expired. |
| `/api/temp-mail/:inbox/receive` | POST | **Not** for the frontend — webhook target for an inbound-email provider (see below). |

### Important: temp-mail needs a domain + mail provider to receive real email

Generating an address is easy; **receiving** mail sent to it needs:
1. A domain you own, with MX records pointing at an inbound-email provider
   (Mailgun Routes, SendGrid Inbound Parse, Postmark, etc.)
2. That provider configured to POST incoming messages to
   `/api/temp-mail/:inbox/receive` as a webhook.

The code is ready for that wiring but the provider/domain setup is on you —
happy to walk through whichever provider you pick.

Also: the current inbox store is an in-memory `Map` — resets on redeploy,
won't work across multiple instances. Fine for a prototype; swap for Redis
(TTL-native, a great fit) or a DB table before real traffic.

---

## 4. Security choices worth knowing about

- **File uploads never touch disk** on either service.
- **Allowlist, not denylist**, for file extensions/MIME types.
- **Magic-byte verification** catches content that doesn't match its claimed
  extension (e.g. an executable renamed to `.pdf`).
- **CORS is an explicit allowlist**, not `*`.
- **The scanner service is never called directly by the browser** — only
  server-to-server from the Node gateway, checked via a shared secret header.
- **Rate limiting**: global baseline, plus a stricter limit on temp-mail
  creation specifically (classic abuse target).

### Before going to production:
- Swap the temp-mail in-memory store for Redis or a DB.
- Add authentication/API keys if this won't be fully public.
- Add structured logging (never log file contents or full email addresses)
  and monitoring on the Render services.
- Consider adding a real AV engine (e.g. ClamAV) as a third scanning layer.
