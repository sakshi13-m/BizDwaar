# Bizdwaar — Demo Runbook

## Three-minute run sheet

| Time | What to show | Talk track |
|---|---|---|
| 0:00–0:20 | Homepage: hero and *Before / After* band | Sara makes beautiful things, but her business lives in scattered chats and word of mouth. Bizdwaar gives it a digital home — free. |
| 0:20–0:50 | **Create your business page** → **Fill in a sample business** → **Organise with Bizdwaar** | No sign-up. Sara describes her studio in everyday words; Claude organises it. |
| 0:50–1:30 | Review screen | "In your words → Organised by Bizdwaar". Prices come through in rupees. The dupatta price was left blank, not guessed — click **Answer**, type 890, and the field shows "Customers will see ₹890". "100% eco-friendly" was flagged and kept out until Sara reviews it. Items start hidden; switch them on and set availability. |
| 1:30–1:55 | **Preview & publish** | The preview is the real page. Publish → shareable link. |
| 1:55–2:25 | Open the business page as a customer → **Ask about this** on a product → send an enquiry | Confirmed prices (₹), sizes and availability only. Blank prices say "Price on request". The enquiry carries the product of interest. |
| 2:25–2:50 | Owner workspace → **View enquiries** → **Mark as replied**; then **Edit business page**, change a price, **Save changes** | The status shows "Live · changes not published yet" and the public page is unchanged — nothing goes live until Sara approves it. **Preview & update live** publishes the change. |
| (optional) | **Log in** with email → enter the code → the page is now manageable from any phone. | Codes arrive from login@bizdwaar.in within seconds; rehearse once on the venue network. |
| 2:50–3:00 | Close | Free to start. Own domain and premium website setup are planned upgrades. AI drafts, the owner decides. |

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
- [ ] **The example link works:** `https://bizdwaar.in/s/saras-studio` must show a published Sara's Studio.
      The homepage mentions this address, so publish Sara's Studio once from the browser you will present with
      (that browser then owns it and can show its inbox). If the published link ends in a number
      (`saras-studio-…`), an older draft already holds the plain address — sort that out before the demo.
- [ ] Send one test enquiry to it so the inbox isn't empty
- [ ] For the live "create" part, either use a second browser profile (fresh owner session) or show the
      already-published page and walk through **Edit business page** instead
- [ ] A second browser or incognito window ready for the customer view
- [ ] Log in to the demo browser with your email first, so Sara's Studio belongs to your account and enquiry
      emails reach you (check spam once and mark "Not spam"). The inbox stays the source of truth
- [ ] Each "Organise" run calls Claude and creation is limited to 10 per hour per network — rehearse sparingly
      on the venue network
- [ ] Afterwards, demo pages stay in the database. Note their slugs if you want them removed.

## Local fallback (no internet / no MySQL)

`npm run build && node server/test/helpers/localServer.js` runs the full app at http://127.0.0.1:3100 with an
in-memory database and a canned Claude response, seeded with a published Sara's Studio. Nothing is saved.
