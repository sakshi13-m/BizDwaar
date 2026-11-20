# Bizdwaar

**An AI-powered digital business companion for India's micro-businesses.**
*GoDaddy Inclusive Innovation Hackathon 2026*

> *Your business doesn't stand still. Your digital presence shouldn't either.*

---

## Live demo

| Environment | URL |
|---|---|
| Production | https://bizdwaar.in |
| Direct (GoDaddy) | https://t3xjlpgdqh.c36.airoapp.ai |

No registration is needed to start — open the site and click **Create your business page**. On the first
screen, **"Fill in a sample business"** loads the fictional demo business, *Sara's Studio*. Logging in with an
email code is optional (see [Owner access and accounts](#owner-access-and-accounts)).

Architecture, data model, API and security design: **[docs/architecture.md](docs/architecture.md)** ·
Demo script: **[docs/demo-runbook.md](docs/demo-runbook.md)**

> **Terminology.** The product calls the public page a **business page**. In the code and API it is still
> called a *storefront* (`StorefrontView`, `/s/:slug`); the two words mean the same thing.

---

## The problem

India has millions of home-based makers, home kitchens, boutiques and small service providers. Their business
lives in WhatsApp chats, Instagram posts, paper notes and word of mouth. Customers ask the same questions again
and again (*"Price?" "Size?" "Do you deliver?"*), and a website feels out of reach: it needs time, money and
technical confidence many owners don't have. Generic AI website builders make it worse in one important way —
they fill gaps with invented prices, sizes and claims the owner never made.

## Who it is for

- Home-based sellers and makers (crafts, candles, décor, textiles)
- Home kitchens and food businesses
- Boutiques and small local service providers
- Owners who are not technically confident and may be getting online for the first time

## The solution

The owner describes their business in everyday language. Claude organises it into a draft profile and product
catalogue, **asks about what's missing instead of guessing**, and flags claims it can't verify. The owner reviews
every detail, chooses what customers see and publishes a mobile-friendly business page with a working enquiry
channel. Afterwards they manage enquiries and keep the page up to date.

**Core principle — AI drafts, the owner decides.** Prices, sizes, ingredients, certifications, availability and
delivery promises are never invented; they stay blank until the owner provides them. Nothing is public until the
owner publishes it, and later edits stay private until the owner publishes again.

---

## Journey: Describe → Organise → Approve → Publish → Connect → Manage → Update

### Owner

1. **Describe** — visit `/owner`. An anonymous browser session starts automatically, so a new owner can begin
   without registering.
2. **Organise** — Claude returns a structured profile, catalogue items with numeric INR prices,
   *missing-information questions* and *unsupported claims*.
3. **Approve** — side-by-side "In your words → Organised by Bizdwaar". Every field shows whether it is an AI
   suggestion or confirmed by the owner. Each question has an **Answer** button that jumps to the right field and
   ticks off once answered. Products can be added, edited or removed; items start *hidden* until the owner
   switches them on; availability is shown only if the owner sets it. Flagged claims must be ticked as reviewed
   before the publish button is enabled.
4. **Publish** — the preview is the real page. An owner who isn't logged in confirms their email here ("One last
   step": email → 6-digit code → **Verify & publish**), so every live page has a verified owner email for
   enquiries and access from any device. Publishing creates `/s/:slug`.
5. **Connect** — customers browse the page and send enquiries, optionally about a specific product. If the page
   belongs to a logged-in owner account, the owner is also emailed at their login address.
6. **Manage** — enquiries arrive in the owner inbox with status *new / replied / closed*.
7. **Update** — returning owners see "Welcome back" with the pages they can manage (see
   [Owner access and accounts](#owner-access-and-accounts)). The review screen shows **Draft**,
   **Live · up to date** or **Live · changes not published yet**. Saved edits stay private; customers keep
   seeing the last published version until the owner clicks **Preview & update live**.

### Owner access and accounts

Bizdwaar has two kinds of page ownership. Both use an `HttpOnly` session cookie; owners never see or type a token.
**Drafts** can be created and edited anonymously; **publishing** requires a verified owner email (see below), so
every new live page belongs to an account.

| | **Anonymous browser session (drafts)** | **Owner account (required to publish)** |
|---|---|---|
| How it starts | Opening `/owner` creates an anonymous browser session automatically — no registration | **Log in** at any time, or at **Publish** → enter an email → enter the 6-digit code sent to it (no password) |
| Who owns a page | The browser session that created it (`businesses.owner_session_hash`) | The account (`businesses.owner_id`) |
| Where it can be managed | Only in the original browser, while its session cookie lasts (30 days). Clearing cookies or switching device loses access | On any device, after logging in with the same email |
| Enquiry emails | To the fallback address `ENQUIRY_TO` (only pages published before this rule, or while email was unavailable) | To the owner's login email |

- **Claiming pages.** Logging in attaches every page created in that browser and not yet owned by an account to
  the account. The browser then gets a fresh session secret; the old anonymous one stops working.
- **After login.** Pages created while logged in belong to the account immediately. The owner sees all of their
  account's pages under "Welcome back" on every device where they log in.
- **Email required to publish.** Publishing a page that has no owner account is refused (`login_required`) and
  the owner is asked to verify their email instead; verifying claims the draft and then publishes it. The
  administrator can publish without an account. The rule applies only while email delivery is configured, so
  owners are never blocked if email is unavailable. Existing anonymous live pages are asked to verify an email
  the next time they are updated.
- **Unclaimed drafts stay browser-bound.** Drafts that are never published or claimed can be edited only from the
  original browser; there is no recovery if that session is lost.
- **Exclusive ownership.** Once a page belongs to an account, only a logged-in session for that account (or the
  administrator) can edit it or read its enquiries — not the original anonymous browser, and not other accounts.
- **Log out** ends that device's session on the server and clears its cookies; the workspace then starts a
  fresh anonymous session. The button is shown only to logged-in owners, whose pages stay with the account and
  reappear at the next login. Other devices stay logged in until their own sessions end.
- **Availability.** The **Log in** buttons appear only when email delivery is configured (`RESEND_API_KEY`);
  without it, owners use anonymous sessions only.
- **Administrator.** A separate, optional token login at `/owner/admin` (not an owner account) lists and can
  manage every page.

### Customer

Open `/s/:slug` → browse offerings (owner-confirmed prices in ₹, sizes, availability) → **Ask about this** on a
product or **Send an enquiry** → enter a name, a message and **an email or phone number (at least one is
required, so the owner can reply)** → the enquiry is stored and appears in the owner's inbox with the product of
interest.

---

## Prices (INR)

Bizdwaar targets Indian micro-businesses, so every price is in **Indian Rupees**.

- Prices are stored as **numbers** (`1299`, `250.5`); formatting happens only at display time.
- One shared formatter, [`shared/price.js`](shared/price.js), is used by the client and the server
  (`Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`):
  `250 → ₹250`, `1299 → ₹1,299`, `12500 → ₹12,500`, `250.5 → ₹250.50`.
- A blank price is shown as **"Price on request"**; `₹0` appears only when the owner enters 0.
- The owner's price field takes a plain rupee amount and shows "Customers will see ₹1,299". Text such as
  "₹1,299" or "Rs. 450/-" is accepted and converted; anything that isn't a single amount (e.g. a range) is
  rejected with a clear message rather than guessed.
- Records saved before this change, with text prices, still display: text that is a single amount is read as
  INR, and anything else is shown exactly as written. No currency conversion is ever applied.

---

## Features — implemented vs planned

| Capability | Status |
|---|---|
| AI-assisted profile + catalogue (Claude, schema-validated) | ✅ Implemented |
| Missing-information questions with in-place answering | ✅ Implemented |
| Unsupported-claim flagging, review required before publish | ✅ Implemented (enforced in the owner UI) |
| Owner review, add/edit/remove items, per-item visibility | ✅ Implemented |
| Prices stored as numbers and shown in INR (₹, Indian digit grouping) | ✅ Implemented |
| Item availability (available / made to order / out of stock) | ✅ Implemented |
| Real-page preview and publish | ✅ Implemented |
| Draft vs live: edits stay private until published again | ✅ Implemented |
| Public business page (published, owner-approved fields only) | ✅ Implemented |
| Customer enquiries with product of interest; email or phone required so the owner can reply | ✅ Implemented |
| Owner inbox with status filters | ✅ Implemented |
| Start without registration (anonymous browser session owns the draft) | ✅ Implemented |
| Verified owner email required to publish ("One last step" at Publish) | ✅ Implemented (when email delivery is configured) |
| Email one-time-code login that claims the browser's pages for an account (any time, or at Publish) | ✅ Implemented — verified in production (code received in a real inbox, login succeeded) |
| Account-owned pages and enquiries managed from any device after login | ✅ Implemented |
| Anonymous (unclaimed) drafts managed from the original browser only | ✅ By design — no recovery without logging in |
| Log out (ends the device's session, clears cookies) | ✅ Implemented |
| Email notification of enquiries | ✅ Implemented — Resend HTTPS API (GoDaddy blocks outbound SMTP) to the owner's login email, or `ENQUIRY_TO` for pages without an account. Same delivery path as the verified login codes; enquiry emails not separately verified. The inbox remains the source of truth |
| Administrator view of all business pages (`/owner/admin`) | ✅ Implemented (needs a 32+ character `OWNER_ADMIN_TOKEN`) |
| Owner photo uploads | ❌ Not built — see *Images* under Known limitations |
| **Own domain** — "Find a domain on GoDaddy" link on the homepage | ✅ Link to GoDaddy domain search (the owner buys it on GoDaddy) |
| Connecting a bought domain to the Bizdwaar page | 🗺️ Planned, not built |
| **Custom website** — "Enquire about a custom website" on the homepage | ✅ Email enquiry to the Bizdwaar team (sakshi.m@bizdwaar.in); the build itself is a manual service |
| Payments, orders, inventory, analytics | ❌ Out of scope |

### Business model

- **Free business page** on `bizdwaar.in/s/your-business` — everything marked ✅ above.
- **Own domain** — an optional paid upgrade. Today the homepage links to GoDaddy's domain search, where the owner
  buys a domain in their own name at GoDaddy's prices. Connecting it to the Bizdwaar page is planned; no
  partnership, commission or prices are assumed.
- **Custom website** — a paid service: owners email the Bizdwaar team (sakshi.m@bizdwaar.in) from the homepage
  and the team designs and builds a fuller site.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 (no UI framework; custom CSS design system) |
| Backend | Node.js 22 + Express 4 |
| AI | Anthropic Claude via `@anthropic-ai/sdk` (model set by `CLAUDE_MODEL`, default `claude-opus-4-5`) |
| Validation | Zod (request bodies and Claude output) |
| Database | MySQL (GoDaddy hosted) via `mysql2` |
| Email | Resend HTTPS API (production; GoDaddy blocks SMTP) · Nodemailer SMTP fallback for local use |
| Hosting | GoDaddy Node.js hosting, domain `bizdwaar.in` (HTTPS at the edge) |

## Architecture overview

One deployable unit: Express serves the JSON API and the Vite-built React app from `dist/`, so the browser talks
to a single origin. Claude is called only from the server. Each business row keeps four separate layers of data:

| Column | Contents | Public? |
|---|---|---|
| `owner_input` | the owner's original words | never |
| `ai_draft` | what Claude suggested | never |
| `approved_profile` / `approved_catalogue` | the owner's saved working copy | never directly |
| `published_profile` / `published_catalogue` | snapshot taken when the owner publishes | yes — visible items only |

Full diagrams, data model and API: [docs/architecture.md](docs/architecture.md).

### Repository layout

```
bizdwaar/
  package.json            # single root package — GoDaddy ZIP root
  vite.config.js          # Vite root = client/, output = ./dist
  .env.example            # all env vars documented; never commit .env
  shared/price.js         # INR parsing + formatting, used by client and server
  client/
    index.html
    public/images/        # CC0 photos (credits in CREDITS.md)
    src/
      App.jsx             # router + owner workspace state machine
      pages/              # LandingPage, Onboarding, OwnerReview, OwnerInbox, OwnerSignIn,
                          # PublicStorefront, EnquiryForm, OwnerLogin + AdminPanel (admin)
      components/         # StorefrontView (business page, preview, homepage example), Brand, SmartImage
      lib/                # demoData (Sara's Studio), imagery, navigate
      api/owner.js        # owner API helpers (credentials: 'include')
      styles/             # App.css (design system + workspace), Storefront.css
  server/
    index.js              # entry: loads .env, starts the app, connects MySQL with retry
    app.js                # Express app: routes, JSON errors, serves dist/
    db.js                 # mysql2 pool, schema creation, additive migrations
    middleware/ownerAuth.js   # anonymous owner sessions, ownership checks, admin fallback
    routes/
      owner.js            # session, businesses, publish, enquiries (owner-only)
      auth.js             # email one-time-code login, logout, /me, admin list
      public.js           # GET /api/businesses/:slug (published snapshot, allowlisted)
      enquiry.js          # POST /api/enquiries (rate limit, honeypot, validation)
      ai.js               # POST /api/ai/analyse (owner session + rate limit)
    models/               # Business.js, Enquiry.js, Owner.js (MySQL query layer)
    services/             # claudeService.js (prompt + Zod), emailService.js (Resend API / SMTP)
    test/                 # npm test — journey tests with an in-memory database
    scripts/              # older MySQL / live integration scripts, ZIP builder
  dist/                   # built client (committed for GoDaddy ZIP deploy)
  docs/                   # architecture, demo runbook, deployment notes, product spec
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

**No MySQL?** `npm run build && node server/test/helpers/localServer.js` starts the real app on
http://127.0.0.1:3100 with an in-memory database and a canned Claude response, seeded with a published
Sara's Studio at `/s/saras-studio`. Nothing is saved and no API credits are used.

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (server only) |
| `CLAUDE_MODEL` | Claude model ID (default `claude-opus-4-5`) |
| `AI_DAILY_LIMIT` | Max Claude calls per UTC day across all users (default 150; `0` turns AI off). Spend guard on top of per-IP limits; counts per running instance and resets on restart |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | MySQL connection (injected automatically on GoDaddy) |
| `OWNER_ADMIN_TOKEN` | Optional admin fallback for `/owner/admin` (can manage any page). Must be **at least 32 random characters**, otherwise the fallback stays disabled. |
| `RESEND_API_KEY` | Resend API key — sends login codes and enquiry notifications over HTTPS (required for login in production) |
| `EMAIL_FROM` | Sender, e.g. `Bizdwaar <login@bizdwaar.in>` (the domain must be verified in Resend) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | Optional SMTP fallback for local development (blocked on GoDaddy hosting) |
| `ENQUIRY_TO` | Fallback recipient for enquiries on pages not linked to an owner email |
| `TRUST_PROXY_HOPS` | Proxy hops to trust for client IPs (rate limiting); 0 locally — see deployment notes |
| `NODE_ENV` | `production` enables `Secure` cookies |
| `PORT` | Assigned by the host |

Secrets live only in environment variables — never in code, docs or `VITE_` variables.

---

## API reference

| Method | Path | Who can call | Purpose |
|---|---|---|---|
| GET | `/api/health` | Anyone | Health check |
| POST | `/api/owner/session` | Anyone | Start or reuse an anonymous owner session (HttpOnly cookie) |
| GET | `/api/owner/businesses` | Owner session | List the pages the caller can manage (account pages + this browser's unclaimed pages) |
| POST | `/api/owner/businesses` | Owner session · 10/h per IP | Create a draft and run Claude analysis |
| GET | `/api/owner/businesses/:id` | Owner of that business | Load draft + saved data (+ `hasUnpublishedChanges`) |
| PUT | `/api/owner/businesses/:id` | Owner of that business | Save the working copy (not public until published) |
| POST | `/api/owner/businesses/:id/publish` | Owner of that business | Publish the saved copy to the public page · `403 login_required` if the page has no owner account (when email is configured) |
| GET | `/api/owner/businesses/:id/enquiries` | Owner of that business | List enquiries (latest 50) |
| PATCH | `/api/owner/businesses/:id/enquiries/:enquiryId` | Owner of that business | Set status `new` / `replied` / `closed` |
| POST | `/api/owner/login/code` | Anyone · 10/15 min per IP, 3 per email | Email a 6-digit login code (valid 10 min) |
| POST | `/api/owner/login/verify` | Anyone · 30/15 min per IP | Log in with the code; claims this browser's pages |
| GET | `/api/owner/me` | Anyone | `{ loggedIn, email, isAdmin, emailLogin }` — `emailLogin` says whether login is offered |
| POST | `/api/owner/logout` | Anyone | Delete this device's login session on the server and clear its cookies |
| POST | `/api/owner/login` | Anyone · 10/15 min per IP | Admin fallback (token) |
| GET | `/api/owner/admin/businesses` | Admin | Every page with status, owner email and enquiry counts |
| POST | `/api/ai/analyse` | Owner session · 10/h per IP | Run Claude analysis without saving |
| GET | `/api/businesses/:slug` | Anyone | Public business page — published, allowlisted fields only |
| POST | `/api/enquiries` | Anyone · 3/h per IP | Submit enquiry (email or phone required; honeypot, validation, optional `productName`) |

Requests for another owner's business return **403**; requests without a session return **401**. Unknown API
routes return a JSON **404**; malformed request bodies return **400**.

---

## Security and privacy

- **Owner sessions:** each browser gets a random 32-byte secret in an `HttpOnly`, `SameSite=Strict`
  (and `Secure` in production) cookie, valid for 30 days. Only its SHA-256 hash is stored; the secret is never
  returned to JavaScript. Owners never see or type a token.
- **Email login:** 6-digit one-time codes, stored only as salted SHA-256 hashes, valid 10 minutes, single use,
  5 attempts, a new code cancels the previous one, rate limited per IP and per email. Logging in issues a fresh
  session secret (no session fixation) recorded in `owner_sessions` with a 30-day expiry; logout deletes it.
- **Ownership:** account-owned pages (`owner_id`) are managed only by that account's logged-in sessions;
  unclaimed pages only by the browser session that created them; the administrator can manage all.
- **Ownership checks** on every business-specific route; enquiry status changes are scoped to the business.
- **Public allowlist:** the public endpoint returns only the published snapshot's approved fields and visible
  items — never owner input, AI drafts, unpublished edits, session hashes or enquiries.
- **Admin fallback:** disabled unless `OWNER_ADMIN_TOKEN` is at least 32 characters; login attempts are rate
  limited.
- **Abuse and cost controls:** rate limits on enquiries (3/h), business creation (10/h), analysis (10/h) and
  admin login, keyed by the real client address (`TRUST_PROXY_HOPS=1` on GoDaddy, verified); a global daily cap
  on Claude calls (`AI_DAILY_LIMIT`); honeypot field; Zod validation and length limits; Claude output schema-validated before use.
- **Errors:** API errors return JSON and never crash the process; the server keeps retrying the database if it
  is unavailable at startup.
- Customer enquiries are never public: they are visible in the owning business's inbox (and to the optional
  admin fallback), and notification emails go only to the page owner's login email (or `ENQUIRY_TO`).

---

## Testing

```bash
npm test
```

Runs [`server/test/`](server/test) with Node's built-in test runner — no MySQL, no network, no API credits.
The real Express routes and models run against an in-memory database and a fake Claude endpoint. Covers INR
formatting and missing prices, Claude response parsing, onboarding validation, AI draft creation, owner editing
and price validation, publishing rules, public visibility and data leakage, unpublished changes staying private,
enquiry submission and validation, the owner inbox and statuses, cross-owner access (401/403/404), older records,
the admin token and rate limiting, and email login: code expiry, reuse and lockout, per-email limits, honest errors
when email can't be sent, claiming pages at login, access from a second device, logout and the admin list.
Emails are captured in tests, never sent.

Older integration scripts in `server/scripts/` need a real MySQL database (`DB_*`) and, for some, Claude or an
admin token:

| Script | What it covers |
|---|---|
| `testSessionsAndEnquiries.js` | Session cookies, ownership, public allowlist, enquiry validation and statuses |
| `testOwnerSelf.js` | Admin-token path: create, review, publish (calls Claude if a key is set) |
| `testClaude.js` | Five varied personas — verifies Claude leaves unknown facts null (uses API credits) |
| `testLive.js` | Smoke test against a deployed URL (admin path; **creates data in production** — use with care) |

---

## Deployment (GoDaddy Node.js hosting)

GoDaddy hosting has two stages: **PREVIEW** (staging) and **PUBLISH** (production). Both use the same database.

1. `npm test` and `npm run build` — refresh `dist/`
2. `node server/scripts/makeZip.cjs` — creates `bizdwaar-deploy.zip` (excludes `.env`, `node_modules`, `.git`)
3. `gddy hosting source upload --app-id <APP_ID> --file bizdwaar-deploy.zip` → updates **PREVIEW** only
4. `gddy hosting deployment publish --app-id <APP_ID>` → rolls out to **production**
5. Check `https://bizdwaar.in/api/health` and the served asset hash

Database migrations are additive and run automatically on startup. Details:
[docs/deployment-notes.md](docs/deployment-notes.md).

---

## Known limitations

- **Anonymous drafts are browser-bound:** drafts that are never published or claimed can be edited only from the
  browser session that created them, and are lost to the owner if that session is cleared. Pages published
  anonymously before the email-at-publish rule stay browser-bound until their owner verifies an email. Login
  needs an email address; phone/WhatsApp login is planned. Sessions last 30 days.
- **Email delivery** depends on Resend (GoDaddy blocks outbound SMTP). If the provider is unavailable, owners see
  an honest "couldn't send" message and enquiries are still saved in the inbox. New sending domains can land in
  spam at first.
- **Claim review** is enforced in the owner interface, and the "reviewed" ticks are not saved between visits.
- **Rate limiter** is in-memory (resets on restart) and relies on `TRUST_PROXY_HOPS` being set correctly.
- **Images:** owners cannot upload photos yet. A product shows a labelled *illustrative* photo only when its own
  name clearly matches one of a small set of stock images; otherwise a branded colour tile with its initial.
- Pages created before owner sessions existed can only be managed through the admin fallback.

---

## Demo business

**Sara's Studio** — a *fictional* independent studio in Jaipur making hand-poured candles, painted terracotta
planters and block-printed cotton dupattas. All names, prices and details are sample data and are labelled as
fictional in the product. See [docs/demo-runbook.md](docs/demo-runbook.md).

## Credits

Photographs: CC0, WordPress Photo Directory — see `client/public/images/CREDITS.md`.

## Licence

See [LICENSE](LICENSE).
