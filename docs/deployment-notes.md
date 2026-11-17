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

# 3. Create ZIP (from repo root, excluding node_modules/.env/.git/dist)
# Upload ZIP to GoDaddy Node.js hosting panel

# 4. In GoDaddy panel: set all environment variables (never commit these)
# 5. Attach domain, configure DNS, verify HTTPS
# 6. Run live email/enquiry test
```

## Environment variables to set in GoDaddy panel

```
PORT                  (assigned by GoDaddy — read process.env.PORT)
NODE_ENV=production
TRUST_PROXY_HOPS=     (verify actual proxy hop count before setting)
MONGODB_URI=
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
OWNER_ADMIN_TOKEN=
COOKIE_SECRET=
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
