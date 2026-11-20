# Bizdwaar

**Your business's digital home — an AI-assisted storefront and enquiry workspace for India's micro-businesses.**
*GoDaddy Inclusive Innovation Hackathon 2026*

> *Your business's doorway to the digital world.*

---

## Live demo

| Environment | URL |
|---|---|
| Production | https://bizdwaar.in |
| Direct (GoDaddy) | https://t3xjlpgdqh.c36.airoapp.ai |

No sign-up or access token is needed — open the site and click **Create your storefront**.
On the first screen, **"Fill in a sample business"** loads the fictional demo persona, *Sara's Studio*.

Architecture, data model, API and security design: **[docs/architecture.md](docs/architecture.md)**.

---

## What it does

A home-based maker, boutique or small service provider describes their business in everyday language.
Claude organises that description into a draft profile and catalogue, **points out what's missing instead of
guessing**, and flags claims it can't verify. The owner reviews, fills the gaps, chooses what customers see and
publishes a mobile-friendly storefront with a working enquiry channel. They can come back any time to update it
and manage enquiries.

**Core principle:** AI drafts, the owner decides. Prices, sizes, ingredients, certifications, availability and
delivery promises are never invented — they stay blank until the owner provides them, and nothing is public until
the owner approves it.

### Owner journey

1. **Describe** — visit `/owner`. An anonymous owner session starts automatically (no login form).
2. **AI draft** — Claude returns a structured profile, catalogue items, *missing-information questions* and
   *unsupported claims*.
3. **Review** — side-by-side "In your words → Organised by Bizdwaar"; every field shows whether it is an AI
   suggestion or confirmed by the owner. Each question has an **Answer** button that jumps to the right field and
   ticks off when answered. Products can be added, edited or removed.
4. **Approve** — items start *hidden*; the owner switches on what customers may see and sets availability.
   Flagged claims must be reviewed before publishing.
5. **Preview & publish** — the preview is the real storefront page; publishing creates `/s/:slug`.
6. **Manage** — enquiries arrive in the owner inbox (status: new / replied / closed). Returning owners see
   "Welcome back" with their storefronts and can edit them; saved changes appear publicly straight away.

### Customer journey

Open `/s/:slug` → browse offerings (confirmed prices, sizes, availability) → **Ask about this** on a product or
**Send an enquiry** → the enquiry is stored and appears in the owner's inbox with the product of interest.

---

## Features — implemented vs planned

| Capability | Status |
|---|---|
| AI-assisted profile + catalogue (Claude, schema-validated) | ✅ Implemented |
| Missing-information questions with in-place answering | ✅ Implemented |
| Unsupported-claim flagging, review required before publish | ✅ Implemented |
| Owner review, add/edit/remove items, per-item visibility | ✅ Implemented |
| Item availability (available / made to order / out of stock) | ✅ Implemented |
| Real-page preview and publish | ✅ Implemented |
| Public storefront (owner-approved fields only) | ✅ Implemented |
| Customer enquiries with product of interest | ✅ Implemented |
| Owner inbox with status filters | ✅ Implemented |
| Returning owners update their storefront (same browser) | ✅ Implemented |
| Email notification of enquiries | ⚠️ Partial — sent to one configured address (`ENQUIRY_TO`) and depends on outbound SMTP, which GoDaddy hosting may block. The inbox is the reliable channel. |
| Owner accounts across devices (login) | ❌ Not built — storefronts are managed from the browser they were created in |
| **Own custom domain** (search, buy via GoDaddy, connect) | 🗺️ Planned, not built |
| **Premium custom website service** | 🗺️ Planned, not built |
| Payments, orders, inventory, analytics | ❌ Out of scope |

### Business model (planned)

- **Free storefront** on `bizdwaar.in/s/your-business` — everything marked ✅ above.
- **Own domain** (planned) — an optional paid upgrade. The domain belongs to the owner; registration and renewal
  fees would be shown from GoDaddy at purchase time. Nothing is integrated yet and no prices are assumed.
- **Premium website** (planned) — a paid customised site, hosting and maintenance service.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 (no UI framework; custom CSS design system) |
| Backend | Node.js 22 + Express 4 |
| AI | Anthropic Claude via `@anthropic-ai/sdk` (model set by `CLAUDE_MODEL`, default `claude-opus-4-5`) |
| Validation | Zod (request bodies and Claude output) |
| Database | MySQL (GoDaddy hosted) via `mysql2` |
| Email | Nodemailer (SMTP) |
| Hosting | GoDaddy Node.js hosting, domain `bizdwaar.in` (HTTPS at the edge) |

---

## Repository layout

```
bizdwaar/
  package.json            # single root package — GoDaddy ZIP root
  vite.config.js          # Vite root = client/, output = ./dist
  .env.example            # all env vars documented; never commit .env
  client/
    index.html
    public/images/        # CC0 photos (credits in CREDITS.md)
    src/
      App.jsx             # router + owner workspace state machine
      pages/              # LandingPage, Onboarding, OwnerReview, OwnerInbox,
                          # PublicStorefront, EnquiryForm, OwnerLogin (admin)
      components/         # StorefrontView (shared by storefront, preview, homepage), Brand, SmartImage
      lib/                # demoData (Sara's Studio), imagery, navigate
      api/owner.js        # owner API helpers (credentials: 'include')
      styles/             # App.css (design system + workspace), Storefront.css
  server/
    index.js              # Express entry; JSON error handler; serves dist/
    db.js                 # mysql2 pool, schema creation, additive migrations
    middleware/ownerAuth.js   # anonymous owner sessions, ownership checks, admin fallback
    routes/
      owner.js            # session, businesses, publish, enquiries (owner-only)
      public.js           # GET /api/businesses/:slug (allowlisted fields)
      enquiry.js          # POST /api/enquiries (rate limit, honeypot, validation)
      ai.js               # POST /api/ai/analyse (owner session + rate limit)
    models/               # Business.js, Enquiry.js (MySQL query layer)
    services/             # claudeService.js (prompt + Zod), emailService.js
    scripts/              # integration / smoke tests (see Testing)
  dist/                   # built client (committed for GoDaddy ZIP deploy)
  docs/                   # architecture.md, demo-runbook.md, deployment-notes.md, product-spec.md
```

---

## Local setup

```bash
git clone https://github.com/sakshi13-m/BizDwaar.git
cd BizDwaar
npm install
cp .env.example .env      # fill in ANTHROPIC_API_KEY and DB_* (a local MySQL 8 database)
npm run dev               # Vite (5173) + Express (3000)

npm run build && npm start   # production build served by Express
```

Tables and migrations are created automatically on startup.

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (server only) |
| `CLAUDE_MODEL` | Claude model ID (default `claude-opus-4-5`) |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | MySQL connection (injected automatically on GoDaddy) |
| `OWNER_ADMIN_TOKEN` | Optional admin fallback token for `/owner/admin` (can manage any storefront) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | SMTP for enquiry notifications (587 = STARTTLS) |
| `ENQUIRY_TO` | Fixed address that receives enquiry notifications |
| `TRUST_PROXY_HOPS` | Proxy hops to trust for client IPs (rate limiting); 0 locally |
| `NODE_ENV` | `production` enables `Secure` cookies |

Secrets live only in environment variables — never in code or `VITE_` variables.

---

## API reference

| Method | Path | Who can call | Purpose |
|---|---|---|---|
| GET | `/api/health` | Anyone | Health check |
| POST | `/api/owner/session` | Anyone | Start or reuse an anonymous owner session (HttpOnly cookie) |
| GET | `/api/owner/businesses` | Owner session | List the caller's storefronts |
| POST | `/api/owner/businesses` | Owner session · 10/h per IP | Create a draft and run Claude analysis |
| GET | `/api/owner/businesses/:id` | Owner of that business | Load draft + approved data |
| PUT | `/api/owner/businesses/:id` | Owner of that business | Save approved profile + catalogue |
| POST | `/api/owner/businesses/:id/publish` | Owner of that business | Publish storefront |
| GET | `/api/owner/businesses/:id/enquiries` | Owner of that business | List enquiries |
| PATCH | `/api/owner/businesses/:id/enquiries/:enquiryId` | Owner of that business | Set status `new` / `replied` / `closed` |
| POST | `/api/owner/login` · `/logout` | Anyone | Optional admin fallback (token) / clear cookies |
| POST | `/api/ai/analyse` | Owner session · 10/h per IP | Run Claude analysis without saving |
| GET | `/api/businesses/:slug` | Anyone | Public storefront — allowlisted, approved fields only |
| POST | `/api/enquiries` | Anyone · 3/h per IP | Submit enquiry (honeypot, validation, optional `productName`) |

Requests for another owner's business return **403**; requests without a session return **401**.

---

## Security and privacy

- **Anonymous owner sessions:** a random 32-byte secret in an `HttpOnly`, `SameSite=Strict` (and `Secure` in
  production) cookie, valid for 30 days. Only its SHA-256 hash is stored; the secret is never returned to JavaScript.
- **Ownership checks** on every business-specific route; enquiry status changes are scoped to the business.
- **Public allowlist:** storefront responses contain only approved fields and visible items — never owner input,
  AI drafts, session hashes or enquiries.
- **Abuse and cost controls:** rate limits on enquiries (3/h), business creation (10/h) and analysis (10/h);
  honeypot field; Zod validation; Claude output schema-validated before use.
- **Errors:** async route errors return JSON 500s instead of crashing the process.
- Customer enquiries are never public: they are visible in the owning business's inbox (and to the optional
  admin fallback), and notification emails go only to the configured `ENQUIRY_TO` address.

---

## Testing

| Script | What it covers |
|---|---|
| `server/scripts/testSessionsAndEnquiries.js` | **35 checks:** session cookies, 401/403 ownership, no hash leakage, availability, public allowlist, enquiry product validation, status updates incl. cross-business protection. Needs `DB_*`; no Claude calls; cleans up its own rows. |
| `server/scripts/testOwnerSelf.js` | Admin-token path: create, review, publish (calls Claude if a key is set) |
| `server/scripts/testClaude.js` | Five varied personas — verifies Claude leaves unknown facts null |
| `server/scripts/testLive.js` | Smoke test against a deployed URL (admin path; creates data — use with care) |

```bash
node server/scripts/testSessionsAndEnquiries.js
```

---

## Deployment (GoDaddy Node.js hosting)

GoDaddy hosting has two stages: **PREVIEW** (staging) and **PUBLISH** (production). Both use the same database.

1. `npm run build` — refresh `dist/`
2. `node server/scripts/makeZip.cjs` — creates `bizdwaar-deploy.zip`
3. `gddy hosting source upload --app-id <APP_ID> --file bizdwaar-deploy.zip` → updates **PREVIEW** only
4. `gddy hosting deployment publish --app-id <APP_ID>` → rolls out to **production**
5. Check `https://bizdwaar.in/api/health` and the served asset hash

Database migrations are additive and run automatically on startup. Details: [docs/deployment-notes.md](docs/deployment-notes.md).

---

## Known limitations

- **Single-browser management:** storefronts are tied to the browser session that created them (30-day cookie).
  Another browser cannot manage them; there is no account recovery yet.
- **Email:** one fixed recipient; outbound SMTP may be blocked on the hosting platform. Enquiries are always saved
  and visible in the inbox.
- **Rate limiter** is in-memory (resets on restart).
- **Images** on storefronts are category-based *illustrative* photos (labelled as such); owners cannot upload
  photos yet.
- Storefronts created before owner sessions existed can only be managed through the admin fallback.

---

## Demo persona

**Sara's Studio** — a *fictional* independent studio in Jaipur making hand-poured candles, painted terracotta and
block-printed cotton dupattas. All names, prices and details are sample data and are labelled as fictional in the
product. See [docs/demo-runbook.md](docs/demo-runbook.md).

## Credits

Photographs: CC0, WordPress Photo Directory — see `client/public/images/CREDITS.md`.

## Licence

See [LICENSE](LICENSE).
