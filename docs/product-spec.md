# Bizdwaar — Product Spec

## Product promise

Bizdwaar helps micro-business owners turn everyday business information into an owner-approved digital storefront and a reliable customer enquiry channel. Claude organises the information; the owner decides what is true and what gets published.

## Target audience

Micro-businesses: home-based sellers, makers, boutiques, local service providers. Primary user is a home-based seller whose products and business information are spread across WhatsApp, Instagram, paper notes or word of mouth.

## What Bizdwaar is — and is not

**Is:**
- A practical launch assistant for small business owners who may not have a website or the technical confidence to create one.

**Is not:**
- A generic chatbot, a full ecommerce platform or an autonomous business operator.
- It does not decide business facts, set prices, make product safety claims, buy domains or publish content without owner approval.

## Six-stage owner journey

| Stage | Owner action | Bizdwaar response |
|---|---|---|
| 1. Describe | Enter business name, location and natural description | Simple onboarding form captures original input |
| 2. Organise | Ask Bizdwaar to structure the details | Claude drafts a profile and product catalogue |
| 3. Clarify | Review draft and see unanswered questions | Missing price, jar size, ingredients or shelf-life remain blank; Claude asks for them |
| 4. Approve | Edit and confirm what is accurate | Draft and owner-approved facts kept distinct |
| 5. Publish | Preview and explicitly publish the page | Public mobile-friendly storefront created at shareable URL |
| 6. Enquire | Customer submits a product enquiry | Enquiry stored; owner receives email at domain mailbox |

## AI trust rule

Claude must never invent price, weight, volume, size, ingredients, allergens, shelf life, certification, stock, discount, delivery promise, quality claim or business credential. Unknown values stay null and become a direct question to the owner.

## Five screens

1. Landing + onboarding
2. Owner review (AI draft vs owner-confirmed)
3. Preview + publish
4. Public storefront
5. Enquiry result

## P0 scope (mandatory for judged MVP)

See GitHub issues GH-01 through GH-09.

## Out of scope

Payments, checkout, inventory, order tracking, customer accounts, WhatsApp Business API, automated social posting, multi-vendor marketplace, subscription billing, advanced analytics, complex multi-agent orchestration, automatic domain purchase.
