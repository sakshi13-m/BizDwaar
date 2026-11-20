// Category-based ILLUSTRATIVE imagery.
// Storefront items have no uploaded photos, so we show a mood image chosen from the
// business category / item name. These are always labelled "Illustrative image" in the UI
// and must never be presented as the owner's actual product.

const SETS = {
  candles: [
    '/images/candle-jar-glass.jpg',
    '/images/candle-jar-dark.jpg',
    '/images/candle-tealight.jpg',
    '/images/candle-diya.jpg'
  ],
  food: ['/images/cat-food.jpg', '/images/food-sweets-box.jpg'],
  crafts: ['/images/cat-crafts.jpg', '/images/maker-hand-dipped.jpg'],
  fashion: ['/images/cat-fashion.jpg']
}

const HEROES = {
  candles: '/images/hero-candle-stall.jpg',
  food: '/images/food-sweets-box.jpg',
  crafts: '/images/cat-crafts.jpg',
  fashion: '/images/cat-fashion.jpg'
}

const RULES = [
  ['candles', /candle|diya|wax|lamp|decor|incense|agarbatti|fragrance|aroma/i],
  ['food', /food|sweet|mithai|pickle|achar|snack|namkeen|bake|cake|cookie|tiffin|kitchen|spice|masala|jalebi|ladoo|chutney|papad|catering|tea|chai/i],
  ['fashion', /fashion|cloth|saree|sari|dupatta|kurta|textile|apparel|boutique|tailor|stitch|fabric|dress|scarf|lifestyle|bag/i],
  ['crafts', /craft|pottery|clay|terracotta|handmade|art|jewel|bead|paint|wood|bamboo|basket|gift|toy/i]
]

export function detectTheme(...texts) {
  const haystack = texts.filter(Boolean).join(' ')
  for (const [theme, re] of RULES) if (re.test(haystack)) return theme
  return null
}

export function heroImageFor(category, name) {
  const theme = detectTheme(category, name)
  return theme ? HEROES[theme] : '/images/maker-hand-dipped.jpg'
}

export function itemImageFor(item, businessCategory, index = 0) {
  const theme = detectTheme(item?.name, item?.description, businessCategory)
  const set = SETS[theme] || SETS.crafts
  return set[index % set.length]
}
