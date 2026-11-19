# Bizdwaar

**AI-powered digital launch companion for micro-businesses | GoDaddy Inclusive Innovation Hackathon 2026**

> *Your business's doorway to the digital world.*

---

## Live demo

| Environment | URL |
|---|---|
| Production | https://bizdwaar.in *(DNS propagating — available shortly)* |
| Direct | https://t3xjlpgdqh.c36.airoapp.ai |

Owner token for demo: `bizdwaar-admin`

---

## What it does

Bizdwaar lets a micro-business owner describe their business in plain language. Claude structures that description into a reviewed catalogue, the owner approves only what is accurate, and the result is a mobile-friendly public storefront with a working customer enquiry form.

**The core principle**: Claude organises owner-provided facts. It never invents missing information — prices, sizes, ingredients, and certifications are always left as explicit questions for the owner to answer.

**Demo flow:**
1. Owner visits `/owner` and logs in with their token
2. Describes their business in plain language
3. Claude drafts a structured profile and product catalogue
4. Missing facts (price, size, ingredients) surface as explicit questions — never guessed
5. Owner reviews, edits and approves only what is true
6. Owner publishes — a shareable storefront at `/s/:slug` goes live instantly
7. Customer submits an enquiry via the storefront
8. Enquiry is saved and owner receives an email notification

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Backend | Node.js 22 + Express 4 |
| AI | Anthropic Claude (`claude-opus-4-5`) |
| Database | MySQL (GoDaddy hosted, auto-provisioned) |
| Email | Nodemailer + GoDaddy Professional Email SMTP |
| Hosting | GoDaddy Platform (Node.js hosting) |
| Domain | bizdwaar.in (GoDaddy, HTTPS via edge TLS) |

---

## Repository layout

```
bizdwaar/
  package.json          # single root package — GoDaddy ZIP root
  vite.config.js
  .env.example          # all required env vars documented; never commit .env
  client/
    index.html
    src/
      pages/            # OwnerLogin, Onboarding, OwnerReview, PublicStorefront, EnquiryForm
      api/              # owner.js fetch helpers
      styles/           # App.css, Storefront.css
  server/
    index.js            # Express entry point; starts HTTP then connects DB
    db.js               # mysql2 pool + auto-create schema on first boot
    routes/
      ai.js             # POST /api/ai/analyse
      owner.js          # owner login/logout, business CRUD, publish
      public.js         # GET /api/businesses/:slug (public, allowlisted fields)
      enquiry.js        # POST /api/enquiries (rate limit, honeypot, validation)
    middleware/
      ownerAuth.js      # requireOwner — signed HttpOnly cookie check
    models/
      Business.js       # MySQL query layer for businesses table
      Enquiry.js        # MySQL query layer for enquiries table
    services/
      claudeService.js  # Claude API + Zod schema validation
      emailService.js   # Nodemailer SMTP
    scripts/
      testLive.js       # 19/19 live smoke test against deployed URL
  dist/                 # built React client (committed for GoDaddy ZIP deploy)
  docs/
```

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/sakshi13-m/BizDwaar.git
cd BizDwaar

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, DB_* (needs local MySQL), SMTP_*, OWNER_ADMIN_TOKEN, COOKIE_SECRET

# 4. Dev server (runs Vite + Express concurrently)
npm run dev

# 5. Production build
npm run build
npm start
```

---

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `CLAUDE_MODEL` | Model name (default: `claude-opus-4-5`) |
| `DB_HOST` | MySQL host (auto-injected on GoDaddy) |
| `DB_PORT` | MySQL port (auto-injected on GoDaddy) |
| `DB_NAME` | MySQL database (auto-injected on GoDaddy) |
| `DB_USER` | MySQL user (auto-injected on GoDaddy) |
| `DB_PASSWORD` | MySQL password (auto-injected on GoDaddy) |
| `OWNER_ADMIN_TOKEN` | Secret token for owner login |
| `COOKIE_SECRET` | Secret for signed HttpOnly session cookie |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for STARTTLS) |
| `SMTP_USER` | SMTP username / from address |
| `SMTP_PASS` | SMTP password |
| `ENQUIRY_TO` | Email address that receives enquiry notifications |

See `.env.example` for a full template. Secrets must never be committed or prefixed with `VITE_`.

---

## API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Server health check |
| POST | `/api/ai/analyse` | — | Run Claude analysis on business input |
| POST | `/api/owner/login` | — | Exchange token for session cookie |
| POST | `/api/owner/logout` | cookie | Clear session |
| POST | `/api/owner/businesses` | cookie | Create business + run Claude |
| GET | `/api/owner/businesses/:id` | cookie | Fetch draft for review |
| PUT | `/api/owner/businesses/:id` | cookie | Save approved profile + catalogue |
| POST | `/api/owner/businesses/:id/publish` | cookie | Publish storefront |
| GET | `/api/businesses/:slug` | — | Public storefront (allowlisted fields only) |
| POST | `/api/enquiries` | — | Submit customer enquiry |

---

## Security notes

- Owner auth uses a single `OWNER_ADMIN_TOKEN` verified against a signed HttpOnly cookie (hackathon MVP scope)
- Public API returns only an explicit allowlist of fields — `ownerInput`, `aiDraft`, and internal IDs are never exposed
- Enquiry endpoint: Zod validation, honeypot field (silent 200 to bots), 3-per-IP-per-hour rate limit
- All secrets in environment variables; none in code or logs

---

## Known limitations (hackathon scope)

- **SMTP**: GoDaddy Platform blocks outbound SMTP ports 465 and 587 — enquiries are saved to the database and the owner can view them, but email delivery is pending. Can be resolved by routing through a transactional email relay (SendGrid, Mailgun) post-hackathon.
- **Owner auth**: Single shared token — not suitable for multi-owner production use.
- **Rate limiter**: In-memory store — resets on server restart. Use Redis for production.
- **No DELETE endpoint**: Test data must be cleaned up directly in the database.

---

## GitHub issues

| Issue | Title | Status |
|---|---|---|
| GH-01 | Repo scaffold, README, docs | ✅ Done |
| GH-02 | React shell + Express health route | ✅ Done |
| GH-03 | Database models | ✅ Done |
| GH-04 | Claude structured analysis | ✅ Done |
| GH-05 | Owner auth, CRUD, publish | ✅ Done |
| GH-06 | Public storefront | ✅ Done |
| GH-07 | Enquiry form, rate limiting, honeypot | ✅ Done |
| GH-08 | GoDaddy deploy, domain, HTTPS, MySQL migration | ✅ Done |
| GH-09 | QA, README, smoke test (19/19 live) | ✅ Done |

---

## Demo persona

A fictional home-based candle maker in Pune. All prices, sizes and product details on screen are explicitly entered sample data treated as fictional demo data.

---

## Licence

See [LICENSE](LICENSE).
