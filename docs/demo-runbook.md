# Bizdwaar — Demo Runbook

## Before you start: log in on the demo browser (recommended)

**Login is optional for creating a business page** — any visitor can create and publish one without registering;
it is then owned by their browser session. For the demo, log in once beforehand anyway:

1. On the browser you will present with, open `https://bizdwaar.in/owner` and publish (or open) Sara's Studio.
2. Click **Log in**, enter your email, then the 6-digit code from `login@bizdwaar.in` (check spam once and mark
   it "Not spam").

Why:

- **Claims Sara's Studio for your account.** Logging in attaches the pages created in that browser to your email,
  so Sara's Studio and its **inbox** stay reachable even if the browser's cookies are cleared, and you can open
  them from a second device if the presenting machine fails.
- **Enquiry emails reach you.** Enquiries to account-owned pages are also emailed to the login address.
- **Pages you create live during the demo** belong to your account straight away.

After logging in, the workspace header shows your email and **Log out**. Don't log out mid-demo — logging back in
needs a fresh code.

## Three-minute run sheet

| Time | What to show | Talk track |
|---|---|---|
| 0:00–0:20 | Homepage: hero, *Before / After* band, the Describe → Update flow chart | Sara makes beautiful things, but her business lives in scattered chats and word of mouth. Bizdwaar gives it a digital home — free — and stays with her after launch. |
| 0:20–0:50 | **Create your business page** → **Fill in a sample business** → **Organise with Bizdwaar** | No registration needed to start. Sara describes her studio in everyday words; Claude organises it. (Because you're logged in, "Welcome back" lists your pages above the form.) |
| 0:50–1:30 | Review screen | "In your words → Organised by Bizdwaar". Prices come through in rupees. The dupatta price was left blank, not guessed — click **Answer**, type 890, and the field shows "Customers will see ₹890". "100% eco-friendly" was flagged and kept out until Sara reviews it (tick it to enable publishing). Items start hidden; switch them on and set availability. |
| 1:30–1:55 | **Preview & publish** | The preview is the real page. Publish → shareable link. (A second Sara's Studio gets its own link, e.g. `/s/saras-studio-…`; the homepage example `/s/saras-studio` is the one you prepared.) |
| 1:55–2:25 | Open that link in the customer window → **Ask about this** on a product → send an enquiry | Confirmed prices (₹), sizes and availability only. Blank prices say "Price on request". The enquiry carries the product of interest. |
| 2:25–2:50 | Back in the owner workspace → **View enquiries** → **Mark as replied**; then **Edit business page**, change a price, **Save changes** | The enquiry is in the private inbox. The status now shows "Live · changes not published yet" and the public page is unchanged — nothing goes live until Sara approves it. **Preview & update live** publishes the change. |
| 2:50–3:00 | Close | Free business page today. Owners can find their own domain on GoDaddy from the homepage (connecting it is planned) and request a custom website from the team. AI drafts, the owner decides. |

Optional, if time allows: on a phone, **Log in** with the same email → Sara's Studio and its inbox appear there
too — managed from any device.

## Demo business — Sara's Studio (fictional)

Everything below is fictional sample data and is labelled as such in the product. Don't improvise extra
factual claims on screen.

- **Business name:** Sara's Studio
- **Type:** Handmade crafts and home décor
- **Location:** Jaipur, Rajasthan
- **Description:** "I run a small studio from home where I make hand-poured candles, paint terracotta planters
  and block-print cotton dupattas. I sell to friends, at weekend craft markets and through word of mouth, and
  customers often order them as gifts. Everything I make is 100% eco-friendly."
- **Products:**
  - Hand-poured jar candle — 200g, ₹350
  - Painted terracotta planter — 6 inch, ₹450
  - Block-print cotton dupatta *(price and size deliberately omitted → Claude asks)*
- **Intentional gaps to demonstrate:** dupatta price and size, contact details, availability.
- **Intentional claim to demonstrate:** "100% eco-friendly" → flagged as unsupported.

The **"Fill in a sample business"** button on the onboarding screen loads exactly these facts.

## Pre-demo checklist

- [ ] `https://bizdwaar.in/api/health` returns 200 and the homepage loads with images (hard refresh after a deploy)
- [ ] **The example link works:** `https://bizdwaar.in/s/saras-studio` shows a published Sara's Studio. If a
      published link ends in a number (`saras-studio-…`), an older draft holds the plain address — sort that out
      before the demo (the administrator view at `/owner/admin` lists every page)
- [ ] Logged in on the demo browser (see above); the header shows your email
- [ ] Send one test enquiry to Sara's Studio so the inbox isn't empty
- [ ] A second browser or incognito window ready for the customer view (not logged in)
- [ ] Each "Organise" run calls Claude; creation is limited to 10 per hour per network and a daily cap applies
      (`AI_DAILY_LIMIT`) — rehearse sparingly
- [ ] Afterwards, demo pages stay in the database. Note their slugs if you want them removed.

## Backup plans

- **Claude is slow or unavailable, or the daily cap is reached:** the page is still created and the review
  screen says the AI organiser couldn't run — fill in the details by hand, or skip creation and walk through the
  prepared Sara's Studio with **Edit business page** instead.
- **Email codes don't arrive:** you don't need to log in again if you stay on the logged-in demo browser.
  Without login, create and publish a page anonymously — everything except cross-device access works.
- **No internet / no MySQL — local fallback:** `npm run build && node server/test/helpers/localServer.js` runs the
  full app at http://127.0.0.1:3100 with an in-memory database and a canned Claude response, seeded with a
  published Sara's Studio. Nothing is saved. Login codes are printed in that terminal instead of being emailed,
  and the local admin token is printed at startup.
