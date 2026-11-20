# Bizdwaar — Product Spec

## Positioning

**An AI-powered digital business companion for India's micro-businesses.**

> *Your business doesn't stand still. Your digital presence shouldn't either.*

Bizdwaar helps micro-business owners turn everyday business information into an owner-approved business page
and a reliable customer enquiry channel — and keep it current as the business changes. Claude organises the
information; the owner decides what is true and what gets published.

## Target audience

Indian micro-businesses: home-based sellers, makers, home kitchens, boutiques and local service providers. The
primary user is a home-based seller whose products and business information are spread across WhatsApp,
Instagram, paper notes or word of mouth, and who may not be technically confident.

## What Bizdwaar is — and is not

**Is:**
- A practical companion that gets a small business online and keeps it up to date, for owners who may not have
  a website or the confidence to create one.

**Is not:**
- A generic chatbot, a full e-commerce platform or an autonomous business operator.
- It does not decide business facts, set prices, make product safety claims, buy domains or publish content
  without owner approval.

## Owner journey

| Stage | Owner action | Bizdwaar response |
|---|---|---|
| 1. Describe | Enter business name, type, location and a natural description | Simple onboarding form captures the original input |
| 2. Organise | Ask Bizdwaar to structure the details | Claude drafts a profile and catalogue; prices as INR numbers; missing facts become questions; unverifiable claims are flagged |
| 3. Approve | Edit, answer questions, review claims, choose visible items | AI draft and owner-approved facts kept separate; items start hidden |
| 4. Publish | Preview the real page and explicitly publish | Mobile-friendly business page at a shareable URL (`/s/:slug`) |
| 5. Connect | Customer browses and sends an enquiry, optionally about a product | Enquiry stored against the business |
| 6. Manage | Owner reads enquiries and marks them replied / closed; logs in with an email code to manage from any device | Private inbox with status filters; email notification to the owner once the email provider is configured |
| 7. Update | Owner edits products and prices | Edits stay private ("changes not published yet") until the owner publishes again |

## AI trust rule

Claude must never invent price, weight, volume, size, ingredients, allergens, shelf life, certification, stock,
discount, delivery promise, quality claim or business credential. Unknown values stay null and become a direct
question to the owner. Prices the owner did state are returned as plain rupee amounts; ranges or vague prices
become null and are asked about.

## Currency

All prices are Indian Rupees, stored as numbers and displayed with `en-IN` formatting (₹1,299; ₹250.50). A
missing price is shown as "Price on request". No currency conversion is ever applied.

## Screens

1. Landing page — who it helps, the problem, how it works, what's free, how customers connect
2. Onboarding (Describe)
3. Owner review (AI draft vs owner-confirmed; Draft / Live state)
4. Preview + publish
5. Public business page
6. Customer enquiry form and confirmation
7. Owner inbox

## Business model

- **Free:** a Bizdwaar-hosted business page with everything above.
- **Paid upgrade — own domain:** the homepage links to GoDaddy domain search; the owner buys and owns the domain.
  Connecting it to the Bizdwaar page is planned.
- **Premium service — custom website:** owners enquire by email (sakshi.m@bizdwaar.in) from the homepage; the
  team builds the site as a manual service.

## P0 scope (mandatory for judged MVP)

See GitHub issues GH-01 through GH-09, plus the final refinement pass (INR prices, draft/live separation,
security hardening, tests).

## Out of scope

Payments, checkout, inventory, order tracking, customer accounts, WhatsApp Business API, automated social posting,
multi-vendor marketplace, subscription billing, advanced analytics, complex multi-agent orchestration, automatic
domain purchase.
