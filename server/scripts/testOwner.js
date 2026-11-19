/**
 * GH-05 acceptance test — owner auth, create, edit, publish
 * Run the server separately, then: node server/scripts/testOwner.js
 */
import 'dotenv/config'
import { connectDB } from '../db.js'
import Business from '../models/Business.js'

const BASE = 'http://localhost:3000'
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

await connectDB()

let passed = 0; let failed = 0
function check(label, cond) {
  if (cond) { console.log('  PASS:', label); passed++ }
  else       { console.log('  FAIL:', label); failed++ }
}

// --- 1. Health ---
console.log('\n1. Health check')
const h = await req('GET', '/api/health')
check('status 200', h.status === 200)
check('ok field', h.json.status === 'ok')

// --- 2. Bad login ---
console.log('\n2. Bad login')
const badLogin = await req('POST', '/api/owner/login', { token: 'wrong-token' })
check('rejected with 401', badLogin.status === 401)

// --- 3. Good login ---
console.log('\n3. Good login')
const goodLogin = await req('POST', '/api/owner/login', { token: TOKEN })
check('status 200', goodLogin.status === 200)
check('ok:true', goodLogin.json.ok === true)
const ownerCookie = goodLogin.setCookie?.split(';')[0]
check('cookie issued', !!ownerCookie)

// --- 4. Owner route without cookie → 401 ---
console.log('\n4. No-auth rejection')
const noAuth = await req('GET', '/api/owner/businesses/000000000000000000000000')
check('rejected with 401', noAuth.status === 401)

// --- 5. Create business ---
console.log('\n5. Create business')
const create = await req('POST', '/api/owner/businesses', {
  businessName: 'Test Pickle Shop',
  businessType: 'Home food',
  location: 'Indore',
  description: 'We make traditional Indori pickles at home.',
  productsRaw: 'Mango Pickle'
}, ownerCookie)
check('status 201', create.status === 201)
check('businessId returned', !!create.json.businessId)
const bizId = create.json.businessId

// --- 6. Load business (owner view) ---
console.log('\n6. Load owner view')
const load = await req('GET', `/api/owner/businesses/${bizId}`, null, ownerCookie)
check('status 200', load.status === 200)
check('aiDraft present', !!load.json.business?.aiDraft)
check('status is draft', load.json.business?.status === 'draft')

// --- 7. Update approved fields ---
console.log('\n7. Update approved fields')
const update = await req('PUT', `/api/owner/businesses/${bizId}`, {
  approvedProfile: {
    businessName: 'Test Pickle Shop',
    description: 'Traditional Indori pickles made at home with family recipes.',
    location: 'Indore, MP'
  },
  approvedCatalogue: [{
    name: 'Mango Pickle',
    description: 'Classic raw mango pickle',
    price: '₹120',
    unitOrSize: '250g jar',
    attributes: [],
    publicVisible: true
  }]
}, ownerCookie)
check('status 200', update.status === 200)
check('approvedProfile saved', update.json.business?.approvedProfile?.businessName === 'Test Pickle Shop')

// --- 8. Publish ---
console.log('\n8. Publish')
const pub = await req('POST', `/api/owner/businesses/${bizId}/publish`, null, ownerCookie)
check('status 200', pub.status === 200)
check('slug returned', !!pub.json.slug)
check('publishedAt set', !!pub.json.publishedAt)

// --- 9. Verify published in DB ---
console.log('\n9. DB verification')
const biz = await Business.findById(bizId)
check('status=published in DB', biz?.status === 'published')
check('approvedProfile.description set', !!biz?.approvedProfile?.description)

// --- Cleanup ---
await Business.deleteOne({ _id: bizId })
console.log('\nCleaned up test record.')

console.log(`\n--- GH-05 Results: ${passed} passed, ${failed} failed ---`)
process.exit(failed > 0 ? 1 : 0)
