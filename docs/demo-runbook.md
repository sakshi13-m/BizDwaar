# Bizdwaar — Demo Runbook

## Three-minute run sheet

| Time | What to show | Talk track |
|---|---|---|
| 0:00–0:20 | Homepage: *Before / After* band | Sara makes beautiful things, but her business lives in scattered chats and word of mouth. Bizdwaar gives it a digital home. |
| 0:20–0:50 | **Create your storefront** → **Fill in a sample business** → **Organise with Bizdwaar** | No sign-up. Sara describes her studio in everyday words; Claude organises it. |
| 0:50–1:30 | Review screen | "In your words → Organised by Bizdwaar". The dupatta price was left blank, not guessed. Click **Answer** on a question and it jumps to the field. "100% eco-friendly" was flagged and kept out until Sara reviews it. Items start hidden; switch them on and set availability. |
| 1:30–1:55 | **Preview & publish** | The preview is the real page. Publish → shareable link. |
| 1:55–2:25 | Open the storefront as a customer → **Ask about this** on a product → send enquiry | Confirmed prices, sizes and availability only. The enquiry carries the product of interest. |
| 2:25–2:50 | Owner workspace → **View enquiries** → **Mark as replied**; **Edit storefront**, change a price, save, refresh the storefront | It's an ongoing workspace: enquiries are managed and updates go live straight away. |
| 2:50–3:00 | Close | Free to start. Own domain and premium website are planned upgrades. AI drafts, the owner decides. |

## Demo persona — Sara's Studio (fictional)

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

- [ ] Open https://bizdwaar.in in a fresh browser profile (a clean owner session, empty "Welcome back")
- [ ] A second browser or incognito window ready for the customer view
- [ ] Check `/api/health` is 200 and the homepage loads with images
- [ ] Remember the enquiry email depends on SMTP — show the **inbox** as the source of truth
- [ ] Afterwards, demo storefronts stay in the database. Note their slugs if you want them removed.
