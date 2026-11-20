// Local preview server: the real app + built client, backed by the in-memory database
// and a canned Claude response. No MySQL, no Anthropic credits, nothing persisted.
//   npm run build && node server/test/helpers/localServer.js [port]
// Seeds a published "Sara's Studio" storefront at /s/saras-studio for visual checks.
import http from 'node:http'
import { createFakePool } from './fakePool.js'

const port = Number(process.argv[2] || 3100)

const CANNED = {
  businessSummary: 'A small home studio in Jaipur making hand-poured candles, painted terracotta planters and block-printed cotton dupattas, often bought as gifts.',
  suggestedCategory: 'Handmade crafts',
  catalogueDrafts: [
    { name: 'Hand-poured Jar Candle', description: 'Candle poured by hand into a glass jar.', price: 350, unitOrSize: '200g', attributes: [], missingFields: [] },
    { name: 'Painted Terracotta Planter', description: 'Terracotta planter, hand-painted in the studio.', price: 450, unitOrSize: '6 inch', attributes: [], missingFields: [] },
    { name: 'Block-print Cotton Dupatta', description: 'Cotton dupatta printed by hand with wooden blocks.', price: null, unitOrSize: null, attributes: [], missingFields: ['price', 'unitOrSize'] }
  ],
  missingQuestions: [
    { field: 'catalogueDrafts[2].price', question: 'What is the price of the block-print cotton dupatta?' },
    { field: 'catalogueDrafts[2].unitOrSize', question: 'What size is the dupatta?' },
    { field: 'contactPhone', question: 'What phone or WhatsApp number can customers use to reach you?' }
  ],
  unsupportedClaims: ['Everything I make is 100% eco-friendly.']
}

const fakeClaude = http.createServer((req, res) => {
  req.resume()
  req.on('end', () => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      id: 'msg_local', type: 'message', role: 'assistant', model: 'local', stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(CANNED) }], usage: { input_tokens: 0, output_tokens: 0 }
    }))
  })
})
await new Promise(r => fakeClaude.listen(0, '127.0.0.1', r))

Object.assign(process.env, {
  ANTHROPIC_API_KEY: 'local',
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${fakeClaude.address().port}`,
  ENQUIRY_TO: '',
  OWNER_ADMIN_TOKEN: ''
})

const { setPoolForTests } = await import('../../db.js')
setPoolForTests(createFakePool())
const { createApp } = await import('../../app.js')
const app = createApp()
await new Promise(r => app.listen(port, '127.0.0.1', r))
const base = `http://127.0.0.1:${port}`

// Seed: create, approve and publish Sara's Studio through the real API
const s = await fetch(`${base}/api/owner/session`, { method: 'POST' })
const cookie = s.headers.getSetCookie()[0].split(';')[0]
const json = { 'content-type': 'application/json', cookie }
const created = await (await fetch(`${base}/api/owner/businesses`, {
  method: 'POST', headers: json,
  body: JSON.stringify({ businessName: "Sara's Studio", businessType: 'Handmade crafts', location: 'Jaipur, Rajasthan', description: 'I make hand-poured candles, terracotta planters and block-print dupattas at home.' })
})).json()
await fetch(`${base}/api/owner/businesses/${created.businessId}`, {
  method: 'PUT', headers: json,
  body: JSON.stringify({
    approvedProfile: { businessName: "Sara's Studio", description: CANNED.businessSummary, category: 'Handmade candles, décor & textiles', location: 'Jaipur, Rajasthan', contactEmail: 'hello@sarasstudio.example', contactPhone: null },
    approvedCatalogue: [
      { ...CANNED.catalogueDrafts[0], publicVisible: true, availability: 'available' },
      { ...CANNED.catalogueDrafts[1], price: 1299, publicVisible: true, availability: 'made_to_order' },
      { ...CANNED.catalogueDrafts[2], price: null, publicVisible: true, availability: null },
      { name: 'Gift hamper', description: 'Candle and planter set.', price: 1250.5, unitOrSize: null, attributes: [], publicVisible: true, availability: 'available' }
    ]
  })
})
await fetch(`${base}/api/owner/businesses/${created.businessId}/publish`, { method: 'POST', headers: json })
await fetch(`${base}/api/enquiries`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ businessSlug: created.slug, customerName: 'Asha', customerEmail: 'asha@example.com', message: 'Can I order 10 jar candles as wedding favours?', productName: 'Hand-poured Jar Candle' })
})

console.log(`Local preview: ${base}  ·  storefront ${base}/s/${created.slug}`)
console.log(`Owner cookie for this seeded storefront (local only): ${cookie}`)
