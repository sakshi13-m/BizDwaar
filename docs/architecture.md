# Bizdwaar — Architecture

One document covering the high-level design (system, flows) and the low-level design (data model, API,
security). Diagrams are Mermaid and render on GitHub. Everything here describes code that exists in this
repository; planned work is listed separately under [Roadmap](#7-roadmap-not-built).

---

## 1. System overview

```mermaid
flowchart LR
  subgraph Browser
    O[Owner workspace<br/>/owner]
    C[Customer<br/>/s/:slug · /enquiry/:slug]
  end

  subgraph GoDaddy["GoDaddy Node.js hosting (bizdwaar.in, HTTPS at edge)"]
    E[Express 4 server<br/>server/index.js]
    S[Static React build<br/>dist/]
    E --- S
  end

  DB[(MySQL<br/>GoDaddy hosted)]
  AI[Anthropic Claude API]
  M[SMTP mailbox]

  O -- "JSON /api/owner/*<br/>HttpOnly session cookie" --> E
  C -- "GET /api/businesses/:slug<br/>POST /api/enquiries" --> E
  E -- mysql2 pool --> DB
  E -- "analyse description<br/>(server-side key)" --> AI
  E -. "enquiry notification<br/>(best effort)" .-> M
```

- **One deployable unit.** Express serves both the API and the Vite-built React app (`dist/`), so the browser
  only ever talks to one origin. There is no separate frontend host and no CORS.
- **Secrets stay server-side.** The Claude key, database credentials and SMTP password never reach the client.
- **Stateless app tier.** Sessions are verified by hashing the cookie and comparing it with the database, so the
  server holds no session state. (The in-memory rate limiter is the only per-process state.)

---

## 2. Main flow

```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant UI as React (owner workspace)
  participant API as Express API
  participant Claude
  participant DB as MySQL
  actor Customer

  Owner->>UI: open /owner
  UI->>API: POST /api/owner/session
  API-->>UI: Set-Cookie bdOwnerSession (HttpOnly)
  Owner->>UI: describe business
  UI->>API: POST /api/owner/businesses
  API->>Claude: owner facts + strict "never invent" prompt
  Claude-->>API: JSON draft (profile, items, missingQuestions, unsupportedClaims)
  API->>API: Zod-validate draft (failure ⇒ empty draft, owner input kept)
  API->>DB: INSERT business (status=draft, owner_session_hash)
  Owner->>UI: review, answer questions, choose visible items
  UI->>API: PUT /api/owner/businesses/:id (approved data)
  UI->>API: POST /api/owner/businesses/:id/publish
  API->>DB: status=published
  Customer->>API: GET /api/businesses/:slug
  API-->>Customer: allowlisted approved fields only
  Customer->>API: POST /api/enquiries (optional productName)
  API->>DB: INSERT enquiry (status=new)
  API--)API: try SMTP notification (failure recorded, not shown to customer)
  Owner->>API: GET /enquiries · PATCH status
```

---

## 3. AI trust design

The AI is a **drafting assistant with no authority to publish**. Trust is enforced in four layers:

| Layer | Mechanism | Where |
|---|---|---|
| Prompt | Use only owner-provided facts; prices, sizes, ingredients, certifications, stock, delivery and quality claims must be `null` if absent; list missing facts as questions; list unverifiable claims separately. | `server/services/claudeService.js` |
| Schema | Claude's JSON is parsed and validated with Zod. Anything malformed is rejected, and the owner's input is kept with an empty draft. | `ClaudeOutputSchema` |
| Separation of data | `ai_draft` (what Claude said) is stored separately from `approved_profile` / `approved_catalogue` (what the owner confirmed). Only approved data is ever public. | `businesses` table |
| UX | Fields show an *AI suggestion* or *Confirmed by you* badge. Missing facts become questions with **Answer** buttons. Flagged claims are kept out of the summary and must be reviewed before the publish button enables. Items start hidden; availability is only shown if the owner sets it. The preview is the real page. | `client/src/pages/OwnerReview.jsx` |

```mermaid
flowchart TD
  A[Owner description] --> B[Claude draft]
  B --> C{Fact present in owner input?}
  C -- yes --> D[Draft field<br/>badge: AI suggestion]
  C -- no --> E[Field left blank<br/>+ missing-information question]
  B --> F{Unverifiable claim?}
  F -- yes --> G[Kept out of summary<br/>owner must review]
  D & E & G --> H[Owner edits / answers / approves]
  H --> I[(approved_* columns)]
  I --> J[Public storefront]
  B -. never .-> J
```

---

## 4. Data model

```mermaid
erDiagram
  BUSINESSES ||--o{ ENQUIRIES : receives
  BUSINESSES {
    char36 id PK
    varchar name
    varchar slug UK
    varchar category
    varchar location
    json owner_input "owner's original words"
    json ai_draft "Claude output, never public"
    json approved_profile "owner-confirmed profile"
    json approved_catalogue "owner-confirmed items"
    enum status "draft | published"
    datetime published_at
    char64 owner_session_hash "SHA-256 of session secret, nullable"
    datetime created_at
    datetime updated_at
  }
  ENQUIRIES {
    char36 id PK
    char36 business_id FK
    varchar customer_name
    varchar customer_email
    varchar customer_phone
    text message
    varchar product_name "nullable, must match a visible item"
    enum status "new | replied | closed"
    enum notification_status "pending | sent | failed"
    datetime notification_attempted_at
    datetime created_at
    datetime updated_at
  }
```

**JSON shapes**

```jsonc
// approved_profile
{ "businessName": "...", "description": "...", "category": "...", "location": "...",
  "contactEmail": "... | null", "contactPhone": "... | null" }

// approved_catalogue[] item
{ "name": "...", "description": "...", "price": "₹350 | null", "unitOrSize": "200g | null",
  "attributes": ["..."], "publicVisible": false,
  "availability": "available | made_to_order | out_of_stock | null" }

// ai_draft
{ "businessSummary": "...", "suggestedCategory": "...", "catalogueDrafts": [ ... ],
  "missingQuestions": [{ "field": "price", "question": "..." }],
  "unsupportedClaims": ["..."], "analysedAt": "ISO date | null" }
```

**Migrations.** `server/db.js` creates the tables if they are missing, then runs *additive, idempotent*
migrations: it checks `information_schema` and only adds a column or index if it is absent. It never drops or
rewrites data. Existing rows get safe defaults (`owner_session_hash` NULL, `status` `'new'`,
`product_name` NULL).

---

## 5. API reference

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/health` | — | — | `{ status: "ok" }` |
| POST | `/api/owner/session` | — | — | `201 { created: true }` + cookie, or `200 { created: false }` |
| GET | `/api/owner/businesses` | session | — | `{ businesses: [{ id, name, slug, status, … }] }` |
| POST | `/api/owner/businesses` | session, 10/h/IP | `{ businessName, businessType?, location?, description, productsRaw? }` | `201 { businessId, slug }` |
| GET | `/api/owner/businesses/:id` | owner | — | `{ business }` (no session hash) |
| PUT | `/api/owner/businesses/:id` | owner | `{ approvedProfile?, approvedCatalogue? }` | `{ business }` |
| POST | `/api/owner/businesses/:id/publish` | owner | — | `{ slug, publishedAt }` or `422` if name/description missing |
| GET | `/api/owner/businesses/:id/enquiries` | owner | — | `{ enquiries: [...] }` (latest 50) |
| PATCH | `/api/owner/businesses/:id/enquiries/:enquiryId` | owner | `{ status }` | `{ enquiry }` · `404` if not this business's |
| POST | `/api/owner/login` | — | `{ token }` | admin cookie (optional fallback) |
| POST | `/api/owner/logout` | — | — | clears cookies |
| POST | `/api/ai/analyse` | session, 10/h/IP | as create | `{ draft }` (not saved) |
| GET | `/api/businesses/:slug` | — | — | allowlisted public business, visible items only |
| POST | `/api/enquiries` | —, 3/h/IP | `{ businessSlug, customerName, customerEmail?, customerPhone?, message, productName?, website(honeypot) }` | `{ ok, message }` |

Errors are JSON: `{ error, message }`, with status codes 400 (validation), 401 (no session), 403 (not your
business), 404, 422 (publish blocked), 429 (rate limit) and 500.

---

## 6. Security

```mermaid
flowchart LR
  R[Request with cookie] --> V{64-hex secret?}
  V -- no --> A{Admin cookie valid?}
  A -- no --> X401[401]
  V -- yes --> H[SHA-256 hash]
  H --> L[Load business :id]
  A -- yes --> L
  L --> M{hash == owner_session_hash<br/>or admin?}
  M -- no --> X403[403]
  M -- yes --> OK[Handler]
```

| Concern | Control |
|---|---|
| Owner identity | Server-generated 32-byte random secret; `HttpOnly`, `SameSite=Strict`, `Secure` (prod), 30 days. Only the SHA-256 hash is stored, and comparisons are constant-time. |
| Authorisation | `requireOwner` and `requireBusinessOwnership` on every business route; enquiry updates are scoped by `business_id`. Changing an ID in the URL cannot reach another owner's data. |
| CSRF | `SameSite=Strict` cookies; JSON-only state-changing endpoints. |
| Data exposure | The public endpoint builds an explicit allowlist. `owner_input`, `ai_draft`, session hashes and enquiries are never public. |
| Abuse / cost | Rate limits on enquiries (3/h), creation (10/h) and analysis (10/h); enquiry honeypot; Zod validation and length limits on every input. |
| Secrets | Environment variables only; `.env` and deploy scripts are git-ignored. |
| Resilience | Async errors go to a JSON error handler. The server starts listening before the DB connects, then retries. |
| Admin fallback | Optional `OWNER_ADMIN_TOKEN`, entered only at `/owner/admin` and never required for normal use. |

---

## 7. Roadmap (not built)

These are **planned** and do not exist in the code today.

| Item | Notes |
|---|---|
| Own custom domain | Owner searches for a domain via GoDaddy and sees real availability and price, buys it in the owner's name, and Bizdwaar connects it to the storefront. Fees would be disclosed; no partnership or commission is assumed. |
| Premium custom website | Paid design, extra pages and galleries, hosting and maintenance. |
| Owner accounts | Email or phone sign-in to manage storefronts across devices; claim existing browser-session storefronts. |
| Owner photo uploads | Replace the category-based illustrative imagery. |
| Per-owner notifications | Email or WhatsApp to each owner instead of one fixed `ENQUIRY_TO`, via a transactional email provider. |
| Shared rate-limit store | Redis or a DB-backed limiter for multi-instance deployments. |
