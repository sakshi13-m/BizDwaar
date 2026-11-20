// Owner email login (one-time codes), logout, cross-device ownership and the admin list.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createFakePool } from './helpers/fakePool.js'

const fakeClaude = http.createServer((req, res) => {
  req.resume()
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      id: 'msg', type: 'message', role: 'assistant', model: 'test', stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        businessSummary: 'Candles from a home studio.', suggestedCategory: null,
        catalogueDrafts: [{ name: 'Jar candle', description: null, price: 350, unitOrSize: '200g' }],
        missingQuestions: [], unsupportedClaims: []
      }) }],
      usage: { input_tokens: 1, output_tokens: 1 }
    }))
  })
})

const ADMIN = 'z'.repeat(40)
const sent = []            // captured emails
let failEmail = false
let server, base, pool
let ip = 1

before(async () => {
  await new Promise(r => fakeClaude.listen(0, '127.0.0.1', r))
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: 'test', ANTHROPIC_BASE_URL: `http://127.0.0.1:${fakeClaude.address().port}`,
    ENQUIRY_TO: 'fallback@example.com', OWNER_ADMIN_TOKEN: ADMIN, TRUST_PROXY_HOPS: '1', NODE_ENV: 'test'
  })
  const { setPoolForTests } = await import('../db.js')
  pool = createFakePool()
  setPoolForTests(pool)
  const { setEmailTransportForTests } = await import('../services/emailService.js')
  setEmailTransportForTests(async (msg) => {
    if (failEmail) throw new Error('provider down')
    sent.push(msg)
  })
  const { createApp } = await import('../app.js')
  server = createApp({ serveClient: false }).listen(0, '127.0.0.1')
  await new Promise(r => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})

after(() => { server?.close(); fakeClaude.close() })

async function call(method, path, { body, cookie, from } = {}) {
  const headers = { 'x-forwarded-for': from || `10.1.0.${ip++ % 250}` }
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  const set = res.headers.getSetCookie().find(c => c.startsWith('bdOwnerSession='))
  return { status: res.status, json, text, cookie: set && !/Expires=Thu, 01 Jan 1970/.test(set) ? set.split(';')[0] : null }
}

async function newBrowser() {
  return (await call('POST', '/api/owner/session')).cookie
}

const lastCodeFor = (email) => {
  const msg = [...sent].reverse().find(m => m.to === email)
  return msg?.subject.match(/^(\d{6}) is your Bizdwaar login code/)?.[1]
}

async function login(cookie, email) {
  const r1 = await call('POST', '/api/owner/login/code', { cookie, body: { email } })
  assert.equal(r1.status, 200, r1.text)
  const r2 = await call('POST', '/api/owner/login/verify', { cookie, body: { email, code: lastCodeFor(email) } })
  assert.equal(r2.status, 200, r2.text)
  assert.ok(r2.cookie, 'a fresh session cookie is issued on login')
  assert.notEqual(r2.cookie, cookie, 'session is rotated on login')
  return r2
}

const NEW_BIZ = { businessName: "Sara's Studio", description: 'I make hand-poured candles at home in Jaipur.' }

let laptop, laptopLoggedIn, bizId

test('request code: validates the email and never returns the code', async () => {
  laptop = await newBrowser()
  const bad = await call('POST', '/api/owner/login/code', { cookie: laptop, body: { email: 'not-an-email' } })
  assert.equal(bad.status, 400)

  const ok = await call('POST', '/api/owner/login/code', { cookie: laptop, body: { email: '  Sara@Example.com ' } })
  assert.equal(ok.status, 200)
  assert.equal(sent.at(-1).to, 'sara@example.com', 'email is normalised')
  const code = lastCodeFor('sara@example.com')
  assert.match(code, /^\d{6}$/)
  assert.ok(!ok.text.includes(code), 'code is only in the email')
  assert.ok(!JSON.stringify(pool.tables.login_codes).includes(`"${code}"`), 'code stored only as a hash')
})

test('wrong code is rejected; five wrong attempts lock the code', async () => {
  const email = 'locked@example.com'
  const c = await newBrowser()
  await call('POST', '/api/owner/login/code', { cookie: c, body: { email } })
  const real = lastCodeFor(email)
  const wrong = real === '000000' ? '111111' : '000000'
  for (let i = 0; i < 5; i++) {
    const r = await call('POST', '/api/owner/login/verify', { cookie: c, body: { email, code: wrong } })
    assert.equal(r.status, 400)
  }
  const locked = await call('POST', '/api/owner/login/verify', { cookie: c, body: { email, code: real } })
  assert.equal(locked.status, 429, 'even the right code is refused after 5 failures')
})

test('expired codes and reused codes are rejected; a new code cancels the old one', async () => {
  const email = 'expiry@example.com'
  const c = await newBrowser()
  await call('POST', '/api/owner/login/code', { cookie: c, body: { email } })
  const first = lastCodeFor(email)
  await call('POST', '/api/owner/login/code', { cookie: c, body: { email } })
  const second = lastCodeFor(email)
  if (first !== second) {
    const old = await call('POST', '/api/owner/login/verify', { cookie: c, body: { email, code: first } })
    assert.equal(old.status, 400, 'older code no longer works')
  }
  // Expire the active code
  for (const row of pool.tables.login_codes) if (row.email === email) row.expires_at = new Date(Date.now() - 1000)
  const exp = await call('POST', '/api/owner/login/verify', { cookie: c, body: { email, code: second } })
  assert.equal(exp.status, 400)
  assert.equal(exp.json.error, 'code_expired')
})

test('per-email limit: at most 3 codes per 15 minutes', async () => {
  const email = 'spam@example.com'
  for (let i = 0; i < 3; i++) {
    assert.equal((await call('POST', '/api/owner/login/code', { body: { email } })).status, 200)
  }
  assert.equal((await call('POST', '/api/owner/login/code', { body: { email } })).status, 429)
})

test('if the email cannot be sent, the owner is told honestly', async () => {
  failEmail = true
  try {
    const r = await call('POST', '/api/owner/login/code', { body: { email: 'down@example.com' } })
    assert.equal(r.status, 503)
    assert.match(r.json.message, /couldn't send/)
  } finally {
    failEmail = false
  }
})

test('logging in claims pages created in this browser', async () => {
  const created = await call('POST', '/api/owner/businesses', { cookie: laptop, body: NEW_BIZ })
  assert.equal(created.status, 201)
  bizId = created.json.businessId

  const r = await login(laptop, 'sara@example.com')
  laptopLoggedIn = r.cookie
  assert.equal(r.json.claimed, 1)

  const me = await call('GET', '/api/owner/me', { cookie: laptopLoggedIn })
  assert.deepEqual([me.json.loggedIn, me.json.email], [true, 'sara@example.com'])
  assert.equal((await call('GET', `/api/owner/businesses/${bizId}`, { cookie: laptopLoggedIn })).status, 200)

  // The pre-login cookie is retired
  assert.equal((await call('GET', `/api/owner/businesses/${bizId}`, { cookie: laptop })).status, 403)
})

test('the same owner can manage the page from another device after logging in', async () => {
  const phone = await newBrowser()
  assert.equal((await call('GET', `/api/owner/businesses/${bizId}`, { cookie: phone })).status, 403)
  const r = await login(phone, 'sara@example.com')
  const list = await call('GET', '/api/owner/businesses', { cookie: r.cookie })
  assert.deepEqual(list.json.businesses.map(b => b.id), [bizId])
  assert.ok(!('ownerId' in list.json.businesses[0]), 'account id not exposed')
  assert.equal((await call('GET', `/api/owner/businesses/${bizId}`, { cookie: r.cookie })).status, 200)
})

test('a different account cannot see or manage the page', async () => {
  const other = await newBrowser()
  const r = await login(other, 'someone@example.com')
  assert.equal((await call('GET', `/api/owner/businesses/${bizId}`, { cookie: r.cookie })).status, 403)
  const list = await call('GET', '/api/owner/businesses', { cookie: r.cookie })
  assert.deepEqual(list.json.businesses, [])
})

test('pages created while logged in belong to the account', async () => {
  const r = await call('POST', '/api/owner/businesses', { cookie: laptopLoggedIn, body: { ...NEW_BIZ, businessName: 'Sara Two' } })
  assert.equal(r.status, 201)
  const row = pool.tables.businesses.find(b => b.id === r.json.businessId)
  assert.ok(row.owner_id, 'owner_id set at creation')
})

test('enquiry notifications go to the owner email', async () => {
  const pub = await call('PUT', `/api/owner/businesses/${bizId}`, { cookie: laptopLoggedIn, body: {
    approvedProfile: { businessName: "Sara's Studio", description: 'Candles.' }, approvedCatalogue: []
  } })
  assert.equal(pub.status, 200)
  assert.equal((await call('POST', `/api/owner/businesses/${bizId}/publish`, { cookie: laptopLoggedIn })).status, 200)
  const slug = pool.tables.businesses.find(b => b.id === bizId).slug
  const before = sent.length
  const e = await call('POST', '/api/enquiries', { body: { businessSlug: slug, customerName: 'Asha', message: 'Do you ship to Pune?' } })
  assert.equal(e.status, 200)
  assert.match(e.json.message, /sent/)
  assert.equal(sent.length, before + 1)
  assert.equal(sent.at(-1).to, 'sara@example.com')
})

test('logout ends the session on that device only', async () => {
  const out = await call('POST', '/api/owner/logout', { cookie: laptopLoggedIn })
  assert.equal(out.status, 200)
  const me = await call('GET', '/api/owner/me', { cookie: laptopLoggedIn })
  assert.equal(me.json.loggedIn, false, 'old cookie no longer logged in')
  assert.equal((await call('GET', `/api/owner/businesses/${bizId}`, { cookie: laptopLoggedIn })).status, 403)
})

test('admin list: only with the admin token; shows every page with owner email and enquiry counts', async () => {
  const anon = await newBrowser()
  assert.equal((await call('GET', '/api/owner/admin/businesses', { cookie: anon })).status, 403)

  const login = await fetch(`${base}/api/owner/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.2.0.1' },
    body: JSON.stringify({ token: ADMIN })
  })
  const adminCookie = login.headers.getSetCookie().find(c => c.startsWith('ownerToken=')).split(';')[0]
  const r = await call('GET', '/api/owner/admin/businesses', { cookie: adminCookie })
  assert.equal(r.status, 200)
  const sara = r.json.businesses.find(b => b.id === bizId)
  assert.equal(sara.ownerEmail, 'sara@example.com')
  assert.deepEqual(sara.enquiries, { total: 1, new: 1 })
  assert.ok(r.json.businesses.length >= 2)
  assert.ok(!r.text.includes('owner_session_hash') && !r.text.includes('ownerSessionHash'))
})

test('/me reports whether email login is available', async () => {
  const r = await call('GET', '/api/owner/me')
  assert.equal(r.json.emailLogin, true)
  assert.equal(r.json.loggedIn, false)
})
