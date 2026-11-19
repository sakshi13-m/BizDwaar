/**
 * GH-06 acceptance test — public storefront allowlist boundary
 * Verifies draft data is NOT exposed, only approved fields are public.
 */
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '../../.env') })

import express from 'express'
import { connectDB } from '../db.js'
import publicRouter from '../routes/public.js'
import Business from '../models/Business.js'

// Boot test server
const app = express()
app.use(express.json())
app.use('/api/businesses', publicRouter)
await connectDB()
const server = app.listen(3002, '127.0.0.1')

const BASE = 'http://127.0.0.1:3002'

let passed = 0; let failed = 0
function check(label, cond) {
  if (cond) { console.log('  PASS:', label); passed++ }
  else       { console.log('  FAIL:', label); failed++ }
}

// --- 1. Create a draft business (not published) ---
console.log('\n1. Draft business (not published)')
const draft = await Business.create({
  name: 'Draft Shop',
  slug: 'gh06-draft-shop',
  status: 'draft',
  ownerInput: { description: 'Secret draft description — must not be public.' },
  aiDraft: { businessSummary: 'AI summary — must not be public.' },
  approvedProfile: { businessName: 'Draft Shop', description: 'Owner approved desc' }
})
const draftRes = await fetch(`${BASE}/api/businesses/${draft.slug}`)
check('draft returns 404', draftRes.status === 404)

// --- 2. Publish the business ---
console.log('\n2. Published business')
draft.status = 'published'
draft.publishedAt = new Date()
await draft.save()
const pubRes = await fetch(`${BASE}/api/businesses/${draft.slug}`)
const pubData = await pubRes.json()
check('published returns 200', pubRes.status === 200)
check('ok: true', pubData.ok === true)
check('slug returned', pubData.business?.slug === draft.slug)
check('approvedProfile.description returned', pubData.business?.description === 'Owner approved desc')

// --- 3. Verify NO draft leakage ---
console.log('\n3. Draft data not exposed')
const raw = JSON.stringify(pubData)
check('ownerInput not in response', !raw.includes('Secret draft description'))
check('aiDraft not in response', !raw.includes('AI summary'))
check('_id not in response', !pubData.business._id)
check('createdAt not in response', !pubData.business.createdAt)

// --- 4. Catalogue visibility ---
console.log('\n4. Catalogue visibility filter')
draft.approvedCatalogue = [
  { name: 'Public Item', description: 'Visible', price: '₹100', publicVisible: true },
  { name: 'Hidden Item', description: 'Not visible', price: '₹200', publicVisible: false }
]
await draft.save()
const catRes = await fetch(`${BASE}/api/businesses/${draft.slug}`)
const catData = await catRes.json()
check('public item present', catData.business?.catalogue?.some(i => i.name === 'Public Item'))
check('hidden item NOT present', !catData.business?.catalogue?.some(i => i.name === 'Hidden Item'))
check('catalogue length = 1', catData.business?.catalogue?.length === 1)

// --- 5. Empty catalogue (no approved items) ---
console.log('\n5. Business with no catalogue')
const noCat = await Business.create({
  name: 'No Catalogue Shop',
  slug: 'gh06-no-cat',
  status: 'published',
  publishedAt: new Date(),
  approvedProfile: { businessName: 'No Catalogue Shop', description: 'Just a profile.' },
  approvedCatalogue: []
})
const noCatRes = await fetch(`${BASE}/api/businesses/${noCat.slug}`)
const noCatData = await noCatRes.json()
check('returns 200', noCatRes.status === 200)
check('catalogue is empty array', Array.isArray(noCatData.business?.catalogue) && noCatData.business.catalogue.length === 0)

// Cleanup
await Business.deleteMany({ slug: { $in: [draft.slug, noCat.slug] } })
console.log('\nCleaned up.')

server.close()
console.log(`\n--- GH-06 Results: ${passed} passed, ${failed} failed ---`)
process.exit(failed > 0 ? 1 : 0)
