/**
 * GH-09 live smoke test against deployed URL
 * Usage: node server/scripts/testLive.js [base-url]
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

const BASE = process.argv[2] || 'https://t3xjlpgdqh.c36.airoapp.ai'
console.log(`Testing against: ${BASE}\n`)

let passed = 0, failed = 0
function check(label, cond) {
  if (cond) { console.log(`  PASS: ${label}`); passed++ }
  else       { console.log(`  FAIL: ${label}`); failed++ }
}

let ownerCookie = ''
let bizId = '', slug = ''

// 1. Health
console.log('1. Health check')
const health = await fetch(`${BASE}/api/health`)
check('health 200', health.status === 200)
const hj = await health.json()
check('status ok', hj.status === 'ok')

// 2. Owner login
console.log('\n2. Owner login')
const login = await fetch(`${BASE}/api/owner/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: process.env.OWNER_ADMIN_TOKEN })
})
check('login 200', login.status === 200)
const rawCookie = login.headers.get('set-cookie') || ''
// Extract just the ownerToken=value part for use in subsequent requests
const cookieMatch = rawCookie.match(/ownerToken=[^;]+/)
ownerCookie = cookieMatch ? cookieMatch[0] : ''
check('cookie set', ownerCookie.includes('ownerToken'))

// 3. Create business
console.log('\n3. Create business + Claude analysis')
const create = await fetch(`${BASE}/api/owner/businesses`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
  body: JSON.stringify({
    businessName: "Sara's Studio Live Test",
    businessType: 'Handmade candles',
    location: 'Pune',
    description: 'I make soy wax candles with essential oils. Rose, lavender and lemongrass. Sizes 100g and 200g. Prices from ₹180.',
    productsRaw: 'Rose 100g ₹180, Lavender 200g ₹320'
  })
})
check('create 201', create.status === 201)
const cj = await create.json()
check('businessId returned', !!cj.businessId)
check('slug returned', !!cj.slug)
bizId = cj.businessId
slug = cj.slug
console.log(`  ID: ${bizId}, slug: ${slug}`)

// 4. Fetch draft
console.log('\n4. Fetch draft for review')
const draft = await fetch(`${BASE}/api/owner/businesses/${bizId}`, {
  headers: { Cookie: ownerCookie }
})
check('get draft 200', draft.status === 200)
const dj = await draft.json()
check('aiDraft present', !!dj.business?.aiDraft)

// 5. Approve
console.log('\n5. Approve profile + catalogue')
const approve = await fetch(`${BASE}/api/owner/businesses/${bizId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
  body: JSON.stringify({
    approvedProfile: {
      businessName: "Sara's Studio",
      description: 'Handmade soy wax candles. Rose, lavender and lemongrass scents.',
      category: 'Handmade & Craft',
      location: 'Pune',
      contactEmail: 'sara@example.com',
      contactPhone: '9876543210'
    },
    approvedCatalogue: [
      { name: 'Rose Candle 100g', description: 'Rose essential oil', price: '₹180', unitOrSize: '100g', attributes: [], publicVisible: true }
    ]
  })
})
check('approve 200', approve.status === 200)

// 6. Publish
console.log('\n6. Publish')
const pub = await fetch(`${BASE}/api/owner/businesses/${bizId}/publish`, {
  method: 'POST',
  headers: { Cookie: ownerCookie }
})
check('publish 200', pub.status === 200)
const pj = await pub.json()
check('publishedAt set', !!pj.publishedAt)

// 7. Public storefront
console.log('\n7. Public storefront')
const store = await fetch(`${BASE}/api/businesses/${slug}`)
check('storefront 200', store.status === 200)
const sj = await store.json()
check('name visible', !!sj.business?.name)
check('catalogue visible', (sj.business?.catalogue?.length || 0) >= 1)
check('ownerInput NOT leaked', !sj.business?.ownerInput)
check('aiDraft NOT leaked', !sj.business?.aiDraft)

// 8. Enquiry
console.log('\n8. Customer enquiry + SMTP')
const enq = await fetch(`${BASE}/api/enquiries`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessSlug: slug,
    customerName: 'Priya Sharma',
    customerEmail: 'priya@example.com',
    customerPhone: '9123456789',
    message: 'Hi, I would like 2 rose candles. Do you deliver to Mumbai?'
  })
})
check('enquiry 200', enq.status === 200)
const ej = await enq.json()
check('enquiry ok', ej.ok === true)
if (ej.message?.includes('sent')) {
  console.log('  ✅ SMTP delivery confirmed — check sakshi.m@bizdwaar.in')
} else {
  console.log('  ⚠️  Enquiry saved, SMTP status:', ej.message)
}

// 9. Cleanup
console.log('\n9. Cleanup test data')
const del = await fetch(`${BASE}/api/owner/businesses/${bizId}`, {
  method: 'DELETE',
  headers: { Cookie: ownerCookie }
})
// DELETE not implemented — that's fine for hackathon, just note it
console.log('  (cleanup skipped — no DELETE endpoint, test data left in DB)')

console.log(`\n--- Live Smoke Test: ${passed} passed, ${failed} failed ---`)
process.exit(failed > 0 ? 1 : 0)
