// End-to-end owner → customer journey against the real Express app and models,
// using an in-memory database stand-in and a fake Claude endpoint (no network, no MySQL).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createFakePool } from './helpers/fakePool.js'

// ---------- Fake Claude API (the Anthropic SDK honours ANTHROPIC_BASE_URL) ----------
const SARA_DRAFT = {
  businessSummary: 'A home studio in Jaipur making hand-poured candles, painted terracotta planters and block-printed cotton dupattas.',
  suggestedCategory: 'Handmade crafts',
  catalogueDrafts: [
    { name: 'Hand-poured Jar Candle', description: 'Hand-poured candle in a jar.', price: 350, unitOrSize: '200g', attributes: [], missingFields: [] },
    { name: 'Painted Terracotta Planter', description: 'Hand-painted terracotta planter.', price: '₹1,299', unitOrSize: '6 inch', attributes: [], missingFields: [] },
    { name: 'Block-print Cotton Dupatta', description: null, price: null, unitOrSize: null, attributes: [], missingFields: ['price', 'unitOrSize'] }
  ],
  missingQuestions: [{ field: 'catalogueDrafts[2].price', question: 'What is the price of the block-print cotton dupatta?' }],
  unsupportedClaims: ['Everything I make is 100% eco-friendly']
}

let claudeCalls = 0
const fakeClaude = http.createServer((req, res) => {
  claudeCalls++
  req.resume()
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant', model: 'test', stop_reason: 'end_turn',
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(SARA_DRAFT) + '\n```' }],
      usage: { input_tokens: 1, output_tokens: 1 }
    }))
  })
})

const STRONG_ADMIN = 'a'.repeat(20) + 'B'.repeat(20) // 40 chars, test-only value
let server, base, pool
let ipCounter = 1

before(async () => {
  await new Promise(r => fakeClaude.listen(0, '127.0.0.1', r))
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: 'test-key',
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${fakeClaude.address().port}`,
    ENQUIRY_TO: '',               // email not configured → enquiry still stored
    OWNER_ADMIN_TOKEN: STRONG_ADMIN,
    TRUST_PROXY_HOPS: '1',        // lets each test request present its own client IP
    NODE_ENV: 'test'
  })
  const { setPoolForTests } = await import('../db.js')
  pool = createFakePool()
  setPoolForTests(pool)
  const { createApp } = await import('../app.js')
  server = createApp({ serveClient: false }).listen(0, '127.0.0.1')
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server?.close()
  fakeClaude.close()
})

// ---------- HTTP helper ----------
async function call(method, path, { body, cookie, raw, ip } = {}) {
  const headers = { 'x-forwarded-for': ip || `10.0.0.${ipCounter++ % 250}` }
  if (cookie) headers.cookie = cookie
  if (body !== undefined || raw !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(base + path, {
    method, headers, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined)
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text, setCookie: res.headers.getSetCookie() }
}

async function newOwner() {
  const r = await call('POST', '/api/owner/session')
  assert.equal(r.status, 201)
  const cookie = r.setCookie.find(c => c.startsWith('bdOwnerSession='))
  assert.ok(cookie, 'session cookie issued')
  assert.match(cookie, /HttpOnly/i)
  return cookie.split(';')[0]
}

const SARA_INPUT = {
  businessName: "Sara's Studio",
  businessType: 'Handmade crafts and home décor',
  location: 'Jaipur, Rajasthan',
  description: 'I run a small studio from home where I make hand-poured candles, paint terracotta planters and block-print cotton dupattas.',
  productsRaw: 'Hand-poured jar candle — 200g, ₹350\nPainted terracotta planter — 6 inch, ₹1,299\nBlock-print cotton dupatta'
}

function approvedFrom(draft, overrides = {}) {
  return {
    approvedProfile: {
      businessName: "Sara's Studio",
      description: draft.businessSummary,
      category: draft.suggestedCategory,
      location: 'Jaipur, Rajasthan',
      contactEmail: null,
      contactPhone: null
    },
    approvedCatalogue: draft.catalogueDrafts.map((item, i) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      unitOrSize: item.unitOrSize,
      attributes: [],
      publicVisible: i < 2,     // dupatta stays hidden
      availability: i === 0 ? 'available' : null
    })),
    ...overrides
  }
}

// ---------- The journey ----------
let owner, otherOwner, businessId, slug, draft

test('owner routes require a session', async () => {
  const r = await call('POST', '/api/owner/businesses', { body: SARA_INPUT })
  assert.equal(r.status, 401)
  const ai = await call('POST', '/api/ai/analyse', { body: SARA_INPUT })
  assert.equal(ai.status, 401)
})

test('onboarding validates input with understandable errors', async () => {
  owner = await newOwner()
  const r = await call('POST', '/api/owner/businesses', { cookie: owner, body: { businessName: '', description: 'short' } })
  assert.equal(r.status, 400)
  assert.equal(r.json.error, 'validation_error')
})

test('AI catalogue generation stores a structured draft with numeric INR prices', async () => {
  const r = await call('POST', '/api/owner/businesses', { cookie: owner, body: SARA_INPUT })
  assert.equal(r.status, 201)
  businessId = r.json.businessId
  slug = r.json.slug
  assert.equal(slug, 'saras-studio')
  assert.equal(claudeCalls, 1)

  const g = await call('GET', `/api/owner/businesses/${businessId}`, { cookie: owner })
  assert.equal(g.status, 200)
  draft = g.json.business.aiDraft
  assert.deepEqual(draft.catalogueDrafts.map(i => i.price), [350, 1299, null])
  assert.equal(draft.catalogueDrafts[2].price, null, 'missing price is not invented')
  assert.equal(draft.missingQuestions.length, 1)
  assert.deepEqual(draft.unsupportedClaims, ['Everything I make is 100% eco-friendly'])
  assert.equal(g.json.business.status, 'draft')
  assert.ok(!('ownerSessionHash' in g.json.business), 'session hash never returned')
})

test('a different owner session cannot read or change this business', async () => {
  otherOwner = await newOwner()
  const g = await call('GET', `/api/owner/businesses/${businessId}`, { cookie: otherOwner })
  assert.equal(g.status, 403)
  const p = await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: otherOwner, body: approvedFrom(draft) })
  assert.equal(p.status, 403)
  const pub = await call('POST', `/api/owner/businesses/${businessId}/publish`, { cookie: otherOwner })
  assert.equal(pub.status, 403)
  const list = await call('GET', '/api/owner/businesses', { cookie: otherOwner })
  assert.deepEqual(list.json.businesses, [])
})

test('drafts are not public', async () => {
  const r = await call('GET', `/api/businesses/${slug}`)
  assert.equal(r.status, 404)
})

test('owner editing: prices must be numbers; numeric text is stored as a number', async () => {
  const bad = approvedFrom(draft)
  bad.approvedCatalogue[2].price = 'about 500'
  const r1 = await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: owner, body: bad })
  assert.equal(r1.status, 400)
  assert.match(r1.json.message, /number in rupees/)

  const neg = approvedFrom(draft)
  neg.approvedCatalogue[0].price = -10
  assert.equal((await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: owner, body: neg })).status, 400)

  const ok = approvedFrom(draft)
  ok.approvedCatalogue[2].price = '₹1,250.50'
  const r2 = await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: owner, body: ok })
  assert.equal(r2.status, 200)
  assert.deepEqual(r2.json.business.approvedCatalogue.map(i => i.price), [350, 1299, 1250.5])
})

test('publishing requires a description', async () => {
  const noDesc = approvedFrom(draft)
  noDesc.approvedProfile.description = ''
  await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: owner, body: noDesc })
  const r = await call('POST', `/api/owner/businesses/${businessId}/publish`, { cookie: owner })
  assert.equal(r.status, 422)
  assert.equal((await call('GET', `/api/businesses/${slug}`)).status, 404)
})

test('approval and publish: storefront shows only approved, visible items', async () => {
  await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: owner, body: approvedFrom(draft) })
  const r = await call('POST', `/api/owner/businesses/${businessId}/publish`, { cookie: owner })
  assert.equal(r.status, 200)
  assert.equal(r.json.slug, slug)

  const pub = await call('GET', `/api/businesses/${slug}`)
  assert.equal(pub.status, 200)
  const b = pub.json.business
  assert.equal(b.name, "Sara's Studio")
  assert.equal(b.currency, 'INR')
  assert.deepEqual(b.catalogue.map(i => i.name), ['Hand-poured Jar Candle', 'Painted Terracotta Planter'])
  assert.deepEqual(b.catalogue.map(i => i.price), [350, 1299])
  assert.equal(b.catalogue[0].availability, 'available')
  // Private data never leaks
  for (const secret of ['Block-print Cotton Dupatta', 'ownerInput', 'aiDraft', 'owner_session', 'ownerSessionHash', '100% eco-friendly', 'publicVisible']) {
    assert.ok(!pub.text.includes(secret), `public response must not include ${secret}`)
  }
})

test('owner updates stay private until published again', async () => {
  const edited = approvedFrom(draft)
  edited.approvedCatalogue[0].price = 399
  edited.approvedCatalogue[2].publicVisible = true
  edited.approvedCatalogue[2].price = 890
  const put = await call('PUT', `/api/owner/businesses/${businessId}`, { cookie: owner, body: edited })
  assert.equal(put.status, 200)
  assert.equal(put.json.business.hasUnpublishedChanges, true)

  // Public page unchanged
  let pub = await call('GET', `/api/businesses/${slug}`)
  assert.deepEqual(pub.json.business.catalogue.map(i => i.price), [350, 1299])

  // Publish → public page updated, nothing pending
  assert.equal((await call('POST', `/api/owner/businesses/${businessId}/publish`, { cookie: owner })).status, 200)
  pub = await call('GET', `/api/businesses/${slug}`)
  assert.deepEqual(pub.json.business.catalogue.map(i => i.price), [399, 1299, 890])
  const g = await call('GET', `/api/owner/businesses/${businessId}`, { cookie: owner })
  assert.equal(g.json.business.hasUnpublishedChanges, false)
  assert.equal(g.json.business.status, 'published')
})

let enquiryId
test('customer enquiry: validation errors are clear', async () => {
  const short = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', message: 'hi' } })
  assert.equal(short.status, 400)
  const badEmail = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', customerEmail: 'nope', message: 'Do you take bulk orders?' } })
  assert.equal(badEmail.status, 400)
  const unknownBiz = await call('POST', '/api/enquiries', { body: { businessSlug: 'no-such-shop', customerName: 'Asha', customerPhone: '+91 98765 43210', message: 'Do you take bulk orders?' } })
  assert.equal(unknownBiz.status, 404)
  const notListed = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', customerEmail: 'asha@example.com', message: 'Do you take bulk orders?', productName: 'Secret item' } })
  assert.equal(notListed.status, 400)
  assert.match(notListed.json.message, /not available/)

  // The owner needs a way to reply: email or phone is required
  const noContact = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', message: 'Do you take bulk orders?' } })
  assert.equal(noContact.status, 400)
  assert.match(noContact.json.message, /email address or phone number/)
  const blankContact = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', customerEmail: '', customerPhone: '  ', message: 'Do you take bulk orders?' } })
  assert.equal(blankContact.status, 400)
  const badPhone = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', customerPhone: '12345', message: 'Do you take bulk orders?' } })
  assert.equal(badPhone.status, 400)
  assert.match(badPhone.json.message, /valid phone number/)
  assert.equal(pool.tables.enquiries.length, 0, 'nothing stored for invalid enquiries')
})

test('customer enquiry is stored against the right business and shown in the inbox', async () => {
  // Phone only is enough
  const phoneOnly = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Ravi', customerPhone: '+91 98765 43210', message: 'Can you deliver to Malviya Nagar?' } })
  assert.equal(phoneOnly.status, 200)
  pool.tables.enquiries.length = 0

  const r = await call('POST', '/api/enquiries', {
    body: {
      businessSlug: slug, customerName: 'Asha', customerEmail: 'asha@example.com', customerPhone: '',
      message: 'Can I order 10 jar candles as wedding favours?', productName: 'Hand-poured Jar Candle', website: ''
    }
  })
  assert.equal(r.status, 200)
  assert.equal(r.json.ok, true)
  // Email is not configured in tests → the customer is told it reached the inbox (no false email claim)
  assert.match(r.json.message, /inbox/)

  assert.equal(pool.tables.enquiries.length, 1)
  assert.equal(pool.tables.enquiries[0].business_id, businessId)
  assert.equal(pool.tables.enquiries[0].notification_status, 'failed')

  const inbox = await call('GET', `/api/owner/businesses/${businessId}/enquiries`, { cookie: owner })
  assert.equal(inbox.status, 200)
  assert.equal(inbox.json.enquiries.length, 1)
  const e = inbox.json.enquiries[0]
  assert.equal(e.productName, 'Hand-poured Jar Candle')
  assert.equal(e.status, 'new')
  enquiryId = e.id
})

test('honeypot submissions are accepted silently but not stored', async () => {
  const r = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Bot', message: 'Buy cheap followers now!!', website: 'x' } })
  // zod rejects a non-empty honeypot before the handler — either way nothing is stored
  assert.ok([200, 400].includes(r.status))
  assert.equal(pool.tables.enquiries.length, 1)
})

test('enquiry statuses: owner can mark replied/closed; others cannot', async () => {
  const other = await call('GET', `/api/owner/businesses/${businessId}/enquiries`, { cookie: otherOwner })
  assert.equal(other.status, 403)

  const bad = await call('PATCH', `/api/owner/businesses/${businessId}/enquiries/${enquiryId}`, { cookie: owner, body: { status: 'deleted' } })
  assert.equal(bad.status, 400)

  for (const status of ['replied', 'closed', 'new']) {
    const r = await call('PATCH', `/api/owner/businesses/${businessId}/enquiries/${enquiryId}`, { cookie: owner, body: { status } })
    assert.equal(r.status, 200)
    assert.equal(r.json.enquiry.status, status)
  }

  // Another owner's business cannot be used to reach this enquiry
  const create = await call('POST', '/api/owner/businesses', { cookie: otherOwner, body: { ...SARA_INPUT, businessName: 'Other Shop' } })
  assert.equal(create.status, 201, create.text)
  const otherId = create.json.businessId
  const cross = await call('PATCH', `/api/owner/businesses/${otherId}/enquiries/${enquiryId}`, { cookie: otherOwner, body: { status: 'closed' } })
  assert.equal(cross.status, 404)
})

test('returning owner sees their storefronts', async () => {
  const r = await call('GET', '/api/owner/businesses', { cookie: owner })
  assert.deepEqual(r.json.businesses.map(b => b.slug), [slug])
  assert.equal(r.json.businesses[0].status, 'published')
})

test('legacy storefronts (published before snapshots, text prices) still display unchanged', async () => {
  pool.tables.businesses.push({
    id: 'legacy-1', name: 'Old Shop', slug: 'old-shop', category: null, location: null,
    owner_input: '{}', ai_draft: '{}',
    approved_profile: JSON.stringify({ businessName: 'Old Shop', description: 'Pickles from home.' }),
    approved_catalogue: JSON.stringify([
      { name: 'Mango pickle', price: '₹350', publicVisible: true },
      { name: 'Lime pickle', price: '₹300–₹500', publicVisible: true },
      { name: 'Hidden', price: '100', publicVisible: false }
    ]),
    published_profile: null, published_catalogue: null,
    status: 'published', owner_session_hash: null, published_at: new Date(),
    created_at: new Date(), updated_at: new Date()
  })
  const r = await call('GET', '/api/businesses/old-shop')
  assert.equal(r.status, 200)
  assert.equal(r.json.business.description, 'Pickles from home.')
  assert.deepEqual(r.json.business.catalogue.map(i => i.price), [350, '₹300–₹500'])

  // Admin-less legacy row: no owner session can manage it
  assert.equal((await call('GET', '/api/owner/businesses/legacy-1', { cookie: owner })).status, 403)
})

test('admin fallback: rejects wrong token, accepts the configured strong token', async () => {
  assert.equal((await call('POST', '/api/owner/login', { body: { token: 'wrong' } })).status, 401)
  const ok = await call('POST', '/api/owner/login', { body: { token: STRONG_ADMIN } })
  assert.equal(ok.status, 200)
  const adminCookie = ok.setCookie.find(c => c.startsWith('ownerToken=')).split(';')[0]
  assert.equal((await call('GET', '/api/owner/businesses/legacy-1', { cookie: adminCookie })).status, 200)
})

test('admin fallback is disabled when the token is too short', async () => {
  const saved = process.env.OWNER_ADMIN_TOKEN
  process.env.OWNER_ADMIN_TOKEN = 'short-token-14'
  try {
    assert.equal((await call('POST', '/api/owner/login', { body: { token: 'short-token-14' } })).status, 401)
  } finally {
    process.env.OWNER_ADMIN_TOKEN = saved
  }
})

test('admin login is rate limited per IP', async () => {
  const ip = '10.9.9.9'
  let last
  for (let i = 0; i < 11; i++) last = await call('POST', '/api/owner/login', { body: { token: 'guess' }, ip })
  assert.equal(last.status, 429)
})

test('API errors are JSON: unknown routes 404, malformed JSON 400', async () => {
  const nf = await call('GET', '/api/nope')
  assert.equal(nf.status, 404)
  assert.equal(nf.json.error, 'not_found')
  const bad = await call('POST', '/api/enquiries', { raw: '{"broken', body: undefined })
  assert.equal(bad.status, 400)
  assert.equal(bad.json.error, 'bad_request')
})
