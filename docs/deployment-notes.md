# Bizdwaar — Deployment Notes

## GoDaddy Node.js hosting requirements

- ZIP root must contain `package.json` and `package-lock.json` directly (no extra parent directory)
- `package.json` must have non-empty `name` and `version`, plus `build` and `start` scripts
- Express must listen on `process.env.PORT` and bind to `0.0.0.0`
- Vite and `@vitejs/plugin-react` go in `dependencies` (not only `devDependencies`) — GoDaddy needs them available during build
- The ZIP must include `shared/` (used by both the server and the client build)
- Exclude from ZIP: `node_modules/`, `.env`, `.git/`, `deploy.ps1`, logs, temporary files

## Vite output contract

- Vite root: `client/`
- `build.outDir`: absolute path to repository-root `dist/`
- Verify `dist/index.html` exists after `npm run build` from repository root

## Release procedure

```bash
# 1. Clean install, test and build
npm ci
npm test
npm run build

# 2. Optional local check without MySQL (in-memory DB, canned Claude)
node server/test/helpers/localServer.js
# Check: homepage loads, /api/health returns 200, /s/saras-studio shows ₹ prices

# 3. Create ZIP (from repo root; excludes node_modules/.env/.git/deploy.ps1)
node server/scripts/makeZip.cjs

# 4. Upload → PREVIEW (staging) only
gddy hosting source upload --app-id <APP_ID> --file bizdwaar-deploy.zip
# poll: gddy hosting source status --app-id <APP_ID> --import-id <ID>

# 5. Promote PREVIEW → PUBLISH (production) — required, upload alone does NOT go live
gddy hosting deployment publish --app-id <APP_ID>
# poll: gddy hosting deployment get --app-id <APP_ID> --deployment-id <ID>

# 6. Verify: https://bizdwaar.in/api/health is 200 and the homepage serves the new dist/assets hash
```

The local `deploy.ps1` (git-ignored) automates steps 4–5. It reads the GoDaddy personal access token from the
`GDDY_PAT` user environment variable — set it once with
`[Environment]::SetEnvironmentVariable('GDDY_PAT', '<token>', 'User')` — and never stores it in the file.

## Environment variables to set in GoDaddy panel

```
PORT                  (assigned by GoDaddy — read process.env.PORT)
NODE_ENV=production
TRUST_PROXY_HOPS=     (verify actual proxy hop count — see below)
DB_HOST= DB_PORT= DB_NAME= DB_USER= DB_PASSWORD=   (injected automatically by GoDaddy MySQL)
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
AI_DAILY_LIMIT=       (optional, default 150 Claude calls per day across all users)
OWNER_ADMIN_TOKEN=    (optional; at least 32 random characters or the admin fallback stays disabled)
RESEND_API_KEY=       (required for owner login and enquiry emails — GoDaddy blocks SMTP)
EMAIL_FROM=           (e.g. Bizdwaar <login@bizdwaar.in>; domain verified in Resend)
ENQUIRY_TO=           (fallback recipient for pages without an owner account)
```

At startup the server logs a warning (never the value) if `OWNER_ADMIN_TOKEN` is set but too short.

## Proxy verification (rate limiting)

Verified 20 Nov 2026: GoDaddy's proxy appends the client address as the last `X-Forwarded-For` entry and the app
sees `127.0.0.1` as the socket, so **`TRUST_PROXY_HOPS=1`** (set in both PREVIEW and PUBLISH). With 0, every
visitor appeared as `127.0.0.1` and shared one rate limit.


Rate limits are keyed by `req.ip`. If `TRUST_PROXY_HOPS` is 0 behind GoDaddy's proxy, `req.ip` is the proxy's
address and **every visitor shares one limit** (for enquiries, 3 per hour). Verify the real hop count by
inspecting forwarded headers with a temporary, restricted diagnostic route (`req.ip`, `req.ips`,
`req.socket.remoteAddress`), set `TRUST_PROXY_HOPS` to that number, and remove the diagnostic. Never set
`trust proxy=true` blindly.

## Database migrations

`server/db.js` runs additive, idempotent migrations on every start. They only add missing columns or indexes and
never drop or rewrite data. Current list:

| Migration | Effect on existing rows |
|---|---|
| `businesses.owner_session_hash` + index | NULL → older pages are admin-managed only |
| `enquiries.status` | existing enquiries become `new` |
| `enquiries.product_name` | NULL |
| tables `owners`, `owner_sessions`, `login_codes`; `businesses.owner_id` + index | new tables; existing pages keep `owner_id` NULL (managed by their original browser until claimed) |
| `businesses.published_profile`, `businesses.published_catalogue` | NULL → page keeps serving `approved_*` exactly as before until the owner next publishes |

## Top deployment risks

| Risk | Mitigation |
|---|---|
| GoDaddy ZIP/build fails | Root `package.json`, correct scripts, Vite in `dependencies`, `shared/` included |
| Rate limiter sees proxy IP | Verify forwarded headers; configure exact proxy trust hop count |
| Email not delivered | GoDaddy blocks SMTP — use the HTTPS email API; enquiries are always stored; login shows an honest "couldn't send" error |
| Secret leaks | `.gitignore` committed first; no `VITE_` secrets; secrets only in GoDaddy env settings; rotate anything that appears in git history or logs |

## Notes learned in production

- PREVIEW and PUBLISH share the same MySQL database, so migrations run when PREVIEW starts. Migrations must
  stay additive.
- `source upload` updates PREVIEW only. Production changes only after `hosting deployment publish`.
- Outbound SMTP **is blocked** on the platform (`connect EACCES …:587`). Email goes through Resend's HTTPS API.

## Email provider setup (Resend)

1. Create a Resend account and add the domain `bizdwaar.in`.
2. Add the DNS records Resend shows (SPF/DKIM, usually TXT and CNAME) in GoDaddy DNS for `bizdwaar.in`; wait
   until Resend marks the domain verified.
3. Create an API key with "sending access" and set `RESEND_API_KEY` and `EMAIL_FROM` in the GoDaddy environment.
4. Restart the app (`gddy hosting app restart --app-id <APP_ID> --variant PUBLISH`, and PREVIEW) so it reads the
   new secrets; `/api/owner/me` then reports `emailLogin: true` and the Log in buttons appear.
5. Test: request a login code at `/owner?login=1` with your own email.

Status (20 Nov 2026): `bizdwaar.in` verified in Resend (Tokyo region, records added via GoDaddy Domain Connect);
login codes delivered to a real inbox and login succeeded in production.
- Browsers may cache the previous build briefly after a deploy — hard refresh when checking.
