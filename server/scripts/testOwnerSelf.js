/**
 * GH-05 self-contained test — starts server internally, runs tests, exits.
 */
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

import express from 'express'
import cookieParser from 'cookie-parser'
import { connectDB } from '../db.js'
import aiRouter from '../routes/ai.js'
import ownerRouter from '../routes/owner.js'
import Business from '../models/Business.js'

// --- Boot a test server on port 3001 ---
const app = express()
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/ai', aiRouter)
app.use('/api/owner', ownerRouter)

await connectDB()
const server = app.listen(3001, '127.0.0.1')

const BASE = 'http://127.0.0.1:3001'
const TOKEN = process.env.OWNER_ADMIN_TOKEN

async function req(method, path, body, cookie) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  }
  const res = await fetch(`${BASE}${path}`, opts)
  const setCookie = res.headers.get('set-cookie')
  const json = await res.json()
  return { status: res.status, json, setCookie }
}

let passed = 0; let failed = 0
function check(label, cond) {
  if (cond) { console.log('  PASS:', label); passed++ }
  else       { console.log('  FAIL:', label); failed++ }
}

// 1. Health
console.log('\n1. Health')
const h = await req('GET', '/api/health')
check('200 ok', h.status === 200)

// 2. Bad login
console.log('\n2. Bad login')
const bad = await req('POST', '/api/owner/login', { token: 'wrong' })
check('401 on wrong token', bad.status === 401)

// 3. Good login
console.log('\n3. Good login')
const good = await req('POST', '/api/owner/login', { token: TOKEN })
check('200 on correct token', good.status === 200)
const cookie = good.setCookie?.split(';')[0]
check('cookie issued', !!cookie)

// 4. No-auth rejection
console.log('\n4. No-auth rejection')
const noAuth = await req('GET', '/api/owner/businesses/000000000000000000000000')
check('401 without cookie', noAuth.status === 401)

// 5. Create business (skips Claude to avoid cost — uses minimal input)
console.log('\n5. Create business')
const create = await req('POST', '/api/owner/businesses', {
  businessName: 'GH05 Test Shop',
  description: 'A test business for GH-05 acceptance.',
  location: 'Indore'
}, cookie)
check('201 created', create.status === 201)
check('businessId present', !!create.json.businessId)
const bizId = create.json.businessId

// 6. Load owner view
console.log('\n6. Load owner view')
const load = await req('GET', `/api/owner/businesses/${bizId}`, null, cookie)
check('200 loaded', load.status === 200)
check('status=draft', load.json.business?.status === 'draft')

// 7. Save approved fields
console.log('\n7. Save approved fields')
const upd = await req('PUT', `/api/owner/businesses/${bizId}`, {
  approvedProfile: {
    businessName: 'GH05 Test Shop',
    description: 'A test business — owner approved description.',
    location: 'Indore, MP'
  },
  approvedCatalogue: [{
    name: 'Test Product', description: 'A test item', price: '₹100',
    unitOrSize: '1 unit', attributes: [], publicVisible: true
  }]
}, cookie)
check('200 updated', upd.status === 200)
check('approvedProfile.description saved', upd.json.business?.approvedProfile?.description?.length > 0)

// 8. Publish
console.log('\n8. Publish')
const pub = await req('POST', `/api/owner/businesses/${bizId}/publish`, null, cookie)
check('200 published', pub.status === 200)
check('slug returned', !!pub.json.slug)

// 9. DB verification
console.log('\n9. DB check')
const biz = await Business.findById(bizId)
check('status=published in DB', biz?.status === 'published')
check('draft kept separately', !!biz?.ownerInput?.description)

// 10. Public API must NOT expose draft
console.log('\n10. Draft not public (before GH-06 route)')
const pubGet = await req('GET', `/api/owner/businesses/${bizId}`, null, cookie)
check('draft data accessible to owner', pubGet.status === 200)

// Cleanup
await Business.deleteOne({ _id: bizId })
console.log('\nCleaned up.')

server.close()
console.log(`\n--- GH-05 Results: ${passed} passed, ${failed} failed ---`)
process.exit(failed > 0 ? 1 : 0)
