/**
 * GH-09 smoke test — full end-to-end flow against local server + MySQL
 * Tests: health → owner login → create business → Claude analyse → review → publish → public storefront → enquiry
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

import http from 'http'
import { connectDB } from '../db.js'
import Business from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'

// --- minimal express server for testing ---
import express from 'express'
import cookieParser from 'cookie-parser'
import ownerRouter from '../routes/owner.js'
import publicRouter from '../routes/public.js'
import enquiryRouter from '../routes/enquiry.js'

const app = express()
app.use(express.json())
app.use(cookieParser())
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))
app.use('/api/owner', ownerRouter)
app.use('/api/businesses', publicRouter)
app.use('/api/enquiries', enquiryRouter)

let passed = 0, failed = 0
function check(label, cond) {
  if (cond) { console.log(`  PASS: ${label}`); passed++ }
  else       { console.log(`  FAIL: ${label}`); failed++ }
}

// --- connect DB and start server ---
await connectDB()
const server = http.createServer(app)
await new Promise(r => server.listen(0, '127.0.0.1', r))
const PORT = server.address().port
const BASE = `http://127.0.0.1:${PORT}`
console.log(`Test server on port ${PORT}`)

// Cookie jar
let ownerCookie = ''

// 1. Health
console.log('\n1. Health check')
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
ownerCookie = login.headers.get('set-cookie') || ''
check('cookie set', ownerCookie.includes('ownerToken'))

// 3. Create business (triggers Claude analysis)
console.log('\n3. Create business + Claude analysis')
const create = await fetch(`${BASE}/api/owner/businesses`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
  body: JSON.stringify({
    businessName: 'Meera Candles GH09',
    businessType: 'Handmade candles',
    location: 'Pune',
    description: 'I make soy wax candles with essential oils. Rose, lavender and lemongrass scents. Sold in 100g and 200g sizes. Prices start at ₹180.',
    productsRaw: 'Rose 100g ₹180, Lavender 200g ₹320, Lemongrass 100g ₹180'
  })
})
check('create 201', create.status === 201)
const cj = await create.json()
check('businessId returned', !!cj.businessId)
check('slug returned', !!cj.slug)
const bizId = cj.businessId
const slug = cj.slug
console.log(`  Business ID: ${bizId}, Slug: ${slug}`)

// 4. Owner review — fetch draft
console.log('\n4. Owner review — fetch draft')
const draft = await fetch(`${BASE}/api/owner/businesses/${bizId}`, {
  headers: { Cookie: ownerCookie }
})
check('get draft 200', draft.status === 200)
const dj = await draft.json()
check('aiDraft present', !!dj.business?.aiDraft)
check('ownerInput present', !!dj.business?.ownerInput)

// 5. Approve profile
console.log('\n5. Approve profile + catalogue')
const approve = await fetch(`${BASE}/api/owner/businesses/${bizId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Cookie: ownerCookie },
  body: JSON.stringify({
    approvedProfile: {
      businessName: 'Meera Candles',
      description: 'Handmade soy wax candles with essential oils. Rose, lavender and lemongrass scents.',
      category: 'Handmade & Craft',
      location: 'Pune',
      contactEmail: 'meera@example.com',
      contactPhone: '9876543210'
    },
    approvedCatalogue: [
      { name: 'Rose Candle 100g', description: 'Soy wax with rose essential oil', price: '₹180', unitOrSize: '100g', attributes: [], publicVisible: true },
      { name: 'Lavender Candle 200g', description: 'Soy wax with lavender essential oil', price: '₹320', unitOrSize: '200g', attributes: [], publicVisible: true }
    ]
  })
})
check('approve 200', approve.status === 200)
const aj = await approve.json()
check('approvedProfile saved', !!aj.business?.approvedProfile?.businessName)
check('catalogue saved', (aj.business?.approvedCatalogue?.length || 0) >= 1)

// 6. Publish
console.log('\n6. Publish')
const pub = await fetch(`${BASE}/api/owner/businesses/${bizId}/publish`, {
  method: 'POST',
  headers: { Cookie: ownerCookie }
})
check('publish 200', pub.status === 200)
const pj = await pub.json()
check('slug returned', !!pj.slug)
check('publishedAt set', !!pj.publishedAt)

// 7. Public storefront
console.log('\n7. Public storefront')
const storefront = await fetch(`${BASE}/api/businesses/${slug}`)
check('storefront 200', storefront.status === 200)
const sj = await storefront.json()
check('business name visible', !!sj.business?.name)
check('catalogue visible', (sj.business?.catalogue?.length || 0) >= 1)
check('no ownerInput leaked', !sj.business?.ownerInput)
check('no aiDraft leaked', !sj.business?.aiDraft)

// 8. Enquiry
console.log('\n8. Customer enquiry')
const enq = await fetch(`${BASE}/api/enquiries`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessSlug: slug,
    customerName: 'Priya Sharma',
    customerEmail: 'priya@example.com',
    customerPhone: '9123456789',
    message: 'Hi, I would like to order 2 rose candles. Do you deliver to Mumbai?'
  })
})
check('enquiry 200', enq.status === 200)
const ej = await enq.json()
check('enquiry ok', ej.ok === true)

// Cleanup
console.log('\nCleaning up...')
const biz = await Business.findOne({ slug })
if (biz) {
  await Enquiry.deleteMany({ businessId: biz._id || biz.id })
  const db = (await import('../db.js')).getPool()
  await db.execute('DELETE FROM businesses WHERE id = ?', [biz.id])
}
server.close()

console.log(`\n--- GH-09 Smoke Test: ${passed} passed, ${failed} failed ---`)
process.exit(failed > 0 ? 1 : 0)
