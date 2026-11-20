// Shared price helpers — used by the React client and the Express server.
//
// Bizdwaar targets Indian micro-businesses, so every price is in Indian Rupees (INR).
// Prices are stored as plain numbers (e.g. 1299 or 250.5). Formatting such as "₹1,299"
// happens only at display time and is never stored as the price.
//
// Older records may hold a price as text (e.g. "₹350" or "Rs. 450/-"). normalisePrice()
// reads those as INR numbers. Text that isn't a single plain amount (e.g. "₹300–₹500")
// is kept exactly as the owner wrote it — we never guess a number or convert currencies.

export const PRICE_ON_REQUEST = 'Price on request'
export const MAX_PRICE = 10_000_000 // ₹1 crore — guards against typos and abuse

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0
})
const inrDecimal = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
})

// 250 → "₹250", 1299 → "₹1,299", 250.5 → "₹250.50"
export function formatINR(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return ''
  const rounded = Math.round(amount * 100) / 100
  return (Number.isInteger(rounded) ? inrWhole : inrDecimal).format(rounded)
}

// Leading/trailing INR markers people commonly type: ₹, Rs, Rs., INR, "rupees", "/-"
const CURRENCY_PREFIX = /^(?:₹|rs\.?|inr|rupees?)\s*/i
const CURRENCY_SUFFIX = /\s*(?:\/-|rs\.?|inr|rupees?|only)\s*$/i
const PLAIN_AMOUNT = /^\d+(?:\.\d{1,2})?$/
const GROUPED_AMOUNT = /^\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?$/ // 1,299 · 1,25,000 · 12,500.50

/**
 * Parse owner/AI input into a numeric INR amount.
 * Returns a number, or null when the value is empty/missing, or undefined when the
 * text is not a single plain amount (callers decide whether to reject or keep it).
 */
export function parsePriceInput(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 && value <= MAX_PRICE ? Math.round(value * 100) / 100 : undefined
  }
  if (typeof value !== 'string') return undefined

  let text = value.trim()
  if (text === '') return null
  // Strip currency words repeatedly so "Rs. 450/- only" works
  for (let i = 0; i < 3; i++) {
    text = text.replace(CURRENCY_PREFIX, '').replace(CURRENCY_SUFFIX, '').trim()
  }
  if (GROUPED_AMOUNT.test(text)) text = text.replace(/,/g, '')
  if (!PLAIN_AMOUNT.test(text)) return undefined

  const amount = Math.round(Number(text) * 100) / 100
  return amount <= MAX_PRICE ? amount : undefined
}

/**
 * Normalise a stored/incoming price for persistence.
 * number → number · empty → null · parseable text → number · other text → trimmed text (legacy)
 */
export function normalisePrice(value) {
  const parsed = parsePriceInput(value)
  if (parsed !== undefined) return parsed
  return typeof value === 'string' ? value.trim().slice(0, 100) : null
}

/**
 * Display text for a price, or null when there is no price (show PRICE_ON_REQUEST).
 * Legacy free-text prices are shown exactly as written.
 */
export function formatPrice(value) {
  const normalised = normalisePrice(value)
  if (normalised === null) return null
  if (typeof normalised === 'number') return formatINR(normalised)
  return normalised
}
