import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatINR, formatPrice, normalisePrice, parsePriceInput, PRICE_ON_REQUEST } from '../../shared/price.js'

test('formatINR: integers use Indian grouping with no decimals', () => {
  assert.equal(formatINR(250), '₹250')
  assert.equal(formatINR(1299), '₹1,299')
  assert.equal(formatINR(12500), '₹12,500')
  assert.equal(formatINR(125000), '₹1,25,000')
})

test('formatINR: decimals show two places', () => {
  assert.equal(formatINR(250.5), '₹250.50')
  assert.equal(formatINR(250.55), '₹250.55')
  assert.equal(formatINR(99.999), '₹100')
})

test('formatINR: zero is ₹0, non-numbers are empty', () => {
  assert.equal(formatINR(0), '₹0')
  assert.equal(formatINR(NaN), '')
  assert.equal(formatINR('250'), '')
})

test('formatPrice: missing prices return null (caller shows "Price on request")', () => {
  assert.equal(formatPrice(null), null)
  assert.equal(formatPrice(undefined), null)
  assert.equal(formatPrice(''), null)
  assert.equal(formatPrice('   '), null)
  assert.equal(PRICE_ON_REQUEST, 'Price on request')
})

test('formatPrice: legacy text prices are read as INR', () => {
  assert.equal(formatPrice('350'), '₹350')
  assert.equal(formatPrice('₹350'), '₹350')
  assert.equal(formatPrice('₹1,299'), '₹1,299')
  assert.equal(formatPrice('Rs. 450/-'), '₹450')
  assert.equal(formatPrice('INR 12,500'), '₹12,500')
  assert.equal(formatPrice('250.50'), '₹250.50')
})

test('formatPrice: text that is not a single amount is shown as written, never guessed', () => {
  assert.equal(formatPrice('₹300–₹500'), '₹300–₹500')
  assert.equal(formatPrice('depends on size'), 'depends on size')
})

test('parsePriceInput: accepts numbers and numeric text, rejects the rest', () => {
  assert.equal(parsePriceInput(1299), 1299)
  assert.equal(parsePriceInput('1,299'), 1299)
  assert.equal(parsePriceInput('1,25,000'), 125000)
  assert.equal(parsePriceInput(0), 0)
  assert.equal(parsePriceInput(''), null)
  assert.equal(parsePriceInput(null), null)
  assert.equal(parsePriceInput(-5), undefined)
  assert.equal(parsePriceInput(Infinity), undefined)
  assert.equal(parsePriceInput('12.345'), undefined)
  assert.equal(parsePriceInput('abc'), undefined)
  assert.equal(parsePriceInput('300-500'), undefined)
  assert.equal(parsePriceInput(1e9), undefined)
})

test('normalisePrice: never turns a price into a formatted string', () => {
  assert.equal(normalisePrice('₹1,299'), 1299)
  assert.equal(typeof normalisePrice(250.5), 'number')
  assert.equal(normalisePrice(null), null)
})
