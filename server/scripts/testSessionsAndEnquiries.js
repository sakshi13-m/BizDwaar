/**
 * Integration test: anonymous owner sessions, ownership checks, catalogue
 * availability, enquiry product-of-interest and enquiry status.
 *
 * Needs DB_* env vars (use a dev database if possible). Does NOT call Claude.
 * Creates its own rows and deletes only those rows at the end.
 * Note: the enquiry rate limiter allows 3 submissions per IP per hour; this test uses 3.
 *
 *   node server/scripts/testSessionsAndEnquiries.js
 */
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

import express from 'express'
import cookieParser from 'cookie-parser'
import { connectDB, getPool } from '../db.js'
import ownerRouter from '../routes/owner.js'
import publicRouter from '../routes/public.js'
import enquiryRouter from '../routes/enquiry.js'
import Business from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'
import { hashSessionSecret, OWNER_SESSION_COOKIE } from '../middleware/ownerAuth.js'

const app = express()
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use('/api/owner', ownerRouter)
app.use('/api/businesses', publicRouter)
app.use('/api/enquiries', enquiryRouter)
app.use('/api', (err, req, res, next) => res.status(500).json({ error: 'server_error', message: err.message }))

await connectDB()
const server = app.listen(3002, '127.0.0.1')
const BASE = 'http://127.0.0.1:3002'

async function req(method, p, body, cookie) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  const text = await res.text()
  let json = {}
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text, setCookie: res.headers.get('set-cookie') || '' }
}

let passed = 0, failed = 0
function check(label, cond) {
  if (cond) { console.log('  PASS:', label); passed++ } else { console.log('  FAIL:', label); failed++ }
}

const created = []
const stamp = Date.now()

try {
  console.log('\n1. Session issuance')
  const s1 = await req('POST', '/api/owner/session')
  check('new session → 201', s1.status === 201)
  check('cookie is HttpOnly', /HttpOnly/i.test(s1.setCookie))
  check('cookie is SameSite=Strict', /SameSite=Strict/i.test(s1.setCookie))
  const secretA = (s1.setCookie.match(new RegExp(`${OWNER_SESSION_COOKIE}=([a-f0-9]{64})`)) || [])[1]
  check('cookie holds a 64-hex secret', !!secretA)
  check('secret not in response body', !s1.text.includes(secretA))
  const cookieA = `${OWNER_SESSION_COOKIE}=${secretA}`

  const s1b = await req('POST', '/api/owner/session', null, cookieA)
  check('existing session reused → 200, created:false', s1b.status === 200 && s1b.json.created === false)

  const s2 = await req('POST', '/api/owner/session')
  const secretB = (s2.setCookie.match(new RegExp(`${OWNER_SESSION_COOKIE}=([a-f0-9]{64})`)) || [])[1]
  const cookieB = `${OWNER_SESSION_COOKIE}=${secretB}`
  check('second visitor gets a different secret', secretB && secretB !== secretA)

  console.log('\n2. Ownership')
  const bizA = await Business.create({
    name: `Test Studio ${stamp}`, slug: `test-studio-${stamp}`,
    ownerInput: { description: 'Test business for automated checks.' },
    aiDraft: {}, ownerSessionHash: hashSessionSecret(secretA)
  })
  const bizA2 = await Business.create({
    name: `Test Studio Two ${stamp}`, slug: `test-studio-two-${stamp}`,
    ownerInput: { description: 'Second test business.' },
    aiDraft: {}, ownerSessionHash: hashSessionSecret(secretA)
  })
  created.push(bizA.id, bizA2.id)

  const listA = await req('GET', '/api/owner/businesses', null, cookieA)
  check('owner A lists own businesses', listA.json.businesses?.some(b => b.id === bizA.id))
  const listB = await req('GET', '/api/owner/businesses', null, cookieB)
  check('owner B does not see A\'s businesses', !listB.json.businesses?.some(b => b.id === bizA.id))

  check('no cookie → 401', (await req('GET', `/api/owner/businesses/${bizA.id}`)).status === 401)
  check('other session GET → 403', (await req('GET', `/api/owner/businesses/${bizA.id}`, null, cookieB)).status === 403)
  check('other session PUT → 403', (await req('PUT', `/api/owner/businesses/${bizA.id}`, { approvedProfile: { description: 'hijack' } }, cookieB)).status === 403)
  check('other session publish → 403', (await req('POST', `/api/owner/businesses/${bizA.id}/publish`, null, cookieB)).status === 403)
  check('other session enquiries → 403', (await req('GET', `/api/owner/businesses/${bizA.id}/enquiries`, null, cookieB)).status === 403)

  const getA = await req('GET', `/api/owner/businesses/${bizA.id}`, null, cookieA)
  check('owner GET → 200', getA.status === 200)
  check('owner response has no session hash', !getA.text.includes('ownerSessionHash') && !getA.text.includes(hashSessionSecret(secretA)))

  console.log('\n3. Catalogue availability')
  const catalogue = [
    { name: 'Hand-painted Mug', description: 'Test item', price: '₹450', unitOrSize: '350ml', attributes: [], publicVisible: true, availability: 'made_to_order' },
    { name: 'Hidden Item', description: null, price: null, unitOrSize: null, attributes: [], publicVisible: false, availability: null }
  ]
  const bad = await req('PUT', `/api/owner/businesses/${bizA.id}`, { approvedCatalogue: [{ ...catalogue[0], availability: 'always' }] }, cookieA)
  check('invalid availability → 400', bad.status === 400)
  const put = await req('PUT', `/api/owner/businesses/${bizA.id}`, {
    approvedProfile: { businessName: `Test Studio ${stamp}`, description: 'Handmade test products.', contactEmail: null, contactPhone: null },
    approvedCatalogue: catalogue
  }, cookieA)
  check('PUT with availability → 200', put.status === 200)
  check('availability persisted', put.json.business?.approvedCatalogue?.[0]?.availability === 'made_to_order')
  check('empty contact email accepted as null', put.status === 200)

  const pub = await req('POST', `/api/owner/businesses/${bizA.id}/publish`, null, cookieA)
  check('publish → 200', pub.status === 200)

  const pubView = await req('GET', `/api/businesses/test-studio-${stamp}`)
  check('public storefront → 200', pubView.status === 200)
  check('public shows availability', pubView.json.business?.catalogue?.[0]?.availability === 'made_to_order')
  check('public hides non-visible item', !pubView.text.includes('Hidden Item'))
  check('public has no session hash', !pubView.text.includes('ownerSessionHash') && !pubView.text.includes(hashSessionSecret(secretA)))

  console.log('\n4. Enquiries: product of interest')
  const e1 = await req('POST', '/api/enquiries', {
    businessSlug: `test-studio-${stamp}`, customerName: 'Test Customer', customerEmail: 'customer@example.com',
    message: 'Can you make four of these?', productName: 'Hand-painted Mug'
  })
  check('enquiry with visible product → 200', e1.status === 200 && e1.json.ok)
  const e2 = await req('POST', '/api/enquiries', {
    businessSlug: `test-studio-${stamp}`, customerName: 'Test Customer', message: 'Asking about a hidden item', productName: 'Hidden Item'
  })
  check('enquiry naming a hidden product → 400', e2.status === 400)
  const e3 = await req('POST', '/api/enquiries', {
    businessSlug: `test-studio-${stamp}`, customerName: 'Test Customer', message: 'General question about orders.'
  })
  check('general enquiry → 200', e3.status === 200)

  const inbox = await req('GET', `/api/owner/businesses/${bizA.id}/enquiries`, null, cookieA)
  const withProduct = inbox.json.enquiries?.find(e => e.productName === 'Hand-painted Mug')
  check('inbox shows product of interest', !!withProduct)
  check('new enquiries start as "new"', withProduct?.status === 'new')

  console.log('\n5. Enquiry status')
  const okPatch = await req('PATCH', `/api/owner/businesses/${bizA.id}/enquiries/${withProduct.id}`, { status: 'replied' }, cookieA)
  check('owner marks replied → 200', okPatch.status === 200 && okPatch.json.enquiry?.status === 'replied')
  check('invalid status → 400', (await req('PATCH', `/api/owner/businesses/${bizA.id}/enquiries/${withProduct.id}`, { status: 'deleted' }, cookieA)).status === 400)
  check('other session PATCH → 403', (await req('PATCH', `/api/owner/businesses/${bizA.id}/enquiries/${withProduct.id}`, { status: 'closed' }, cookieB)).status === 403)

  // Enquiry belonging to a different business must not be reachable through bizA's route
  const foreign = await Enquiry.create({ businessId: bizA2.id, customerName: 'Other', message: 'For the second business.' })
  const cross = await req('PATCH', `/api/owner/businesses/${bizA.id}/enquiries/${foreign.id}`, { status: 'closed' }, cookieA)
  check('enquiry from another business via this route → 404', cross.status === 404)
  const unchanged = await Enquiry.findById(foreign.id)
  check('foreign enquiry status unchanged', unchanged.status === 'new')
} catch (err) {
  console.error('Test error:', err)
  failed++
} finally {
  // Remove only rows this test created
  const db = getPool()
  for (const id of created) {
    await db.execute('DELETE FROM enquiries WHERE business_id = ?', [id])
    await db.execute('DELETE FROM businesses WHERE id = ?', [id])
  }
  server.close()
  console.log(`\n${passed} passed, ${failed} failed`)
  await db.end()
  process.exit(failed ? 1 : 0)
}
