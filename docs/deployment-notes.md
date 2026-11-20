# Bizdwaar — Deployment Notes

## GoDaddy Node.js hosting requirements

- ZIP root must contain `package.json` and `package-lock.json` directly (no extra parent directory)
- `package.json` must have non-empty `name` and `version`, plus `build` and `start` scripts
- Express must listen on `process.env.PORT` and bind to `0.0.0.0`
- Vite and `@vitejs/plugin-react` go in `dependencies` (not only `devDependencies`) — GoDaddy needs them available during build
- Exclude from ZIP: `node_modules/`, `.env`, `.git/`, `logs/`, temporary files

## Vite output contract

- Vite root: `client/`
- `build.outDir`: absolute path to repository-root `dist/`
- Verify `dist/index.html` exists after `npm run build` from repository root

## Release procedure

```bash
# 1. Clean install and build
npm ci
npm run build

# 2. Verify locally before zipping
npm start
# Check: frontend loads, /api/health returns 200, /b/<slug> works

# 3. Create ZIP (from repo root; excludes node_modules/.env/.git)
node server/scripts/makeZip.cjs

# 4. Upload → PREVIEW (staging) only
gddy hosting source upload --app-id <APP_ID> --file bizdwaar-deploy.zip
# poll: gddy hosting source status --app-id <APP_ID> --import-id <ID>

# 5. Promote PREVIEW → PUBLISH (production) — required, upload alone does NOT go live
gddy hosting deployment publish --app-id <APP_ID>
# poll: gddy hosting deployment get --app-id <APP_ID> --deployment-id <ID>

# 6. Verify: https://bizdwaar.in/api/health is 200 and the homepage serves the new dist/assets hash
```

## Environment variables to set in GoDaddy panel

```
PORT                  (assigned by GoDaddy — read process.env.PORT)
NODE_ENV=production
TRUST_PROXY_HOPS=     (verify actual proxy hop count before setting)
DB_HOST= DB_PORT= DB_NAME= DB_USER= DB_PASSWORD=   (injected automatically by GoDaddy MySQL)
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
OWNER_ADMIN_TOKEN=     (optional admin fallback)
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
ENQUIRY_TO=
```

## Proxy verification (do before enabling rate limiting)

In production, inspect actual forwarded headers using a temporary restricted diagnostic route. Verify `req.ip`, `req.ips` and `req.socket.remoteAddress`. Remove the diagnostic after verification. Never set `trust proxy=true` blindly.

## Top deployment risks

| Risk | Mitigation |
|---|---|
| GoDaddy ZIP/build fails | Root `package.json`, correct scripts, Vite in `dependencies`, clean-clone ZIP test |
| Rate limiter sees proxy IP | Verify forwarded headers; configure exact proxy trust hop count |
| SMTP delivery fails | Test actual mailbox early; retain enquiry record; report notification failure honestly |
| Secret leaks | `.gitignore` committed first; no `VITE_` secrets; use GoDaddy env settings |

## Notes learned in production

- PREVIEW and PUBLISH share the same MySQL database, so migrations run when PREVIEW starts. Migrations must
  stay additive (see `server/db.js`).
- `source upload` updates PREVIEW only. Production changes only after `hosting deployment publish`.
- Outbound SMTP may be blocked on the platform. Enquiries are always stored and shown in the owner inbox.
