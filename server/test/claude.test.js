import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.ANTHROPIC_API_KEY ||= 'test-key'
const { parseClaudeResponse } = await import('../services/claudeService.js')

const item = (price) => ({ name: 'Jar candle', description: null, price, unitOrSize: null, attributes: [], missingFields: [] })
const response = (items) => JSON.stringify({
  businessSummary: 'Candles from a home studio.', suggestedCategory: null,
  catalogueDrafts: items, missingQuestions: [], unsupportedClaims: []
})

test('parses JSON wrapped in code fences', () => {
  const out = parseClaudeResponse('```json\n' + response([item(350)]) + '\n```')
  assert.equal(out.catalogueDrafts[0].price, 350)
})

test('converts text prices to INR numbers and nulls anything ambiguous', () => {
  const out = parseClaudeResponse(response([item('₹1,299'), item('Rs 450'), item('300-500'), item(null), item(undefined)]))
  assert.deepEqual(out.catalogueDrafts.map(i => i.price), [1299, 450, null, null, null])
})

test('rejects non-JSON and schema violations', () => {
  assert.throws(() => parseClaudeResponse('Sure! Here is your catalogue'), /not valid JSON/)
  assert.throws(() => parseClaudeResponse(JSON.stringify({ catalogueDrafts: 'nope' })))
  assert.throws(() => parseClaudeResponse(''), /empty/)
})
