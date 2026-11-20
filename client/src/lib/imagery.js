// ILLUSTRATIVE imagery.
// Items have no uploaded photos. The hero shows a mood image chosen from the business
// category; a product shows a photo only when its own name clearly matches one. These are always labelled "Illustrative image" in the UI
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

// Product photos: only when the item's OWN name/description clearly matches what a stock
// photo shows. The business category is deliberately ignored here — otherwise every item
// of a candle studio would get a candle photo. No match → null, and the card shows a
// branded tile instead of a misleading picture.
const ITEM_RULES = [
  [/tea\s?-?lights?/i, '/images/candle-tealight.jpg'],
  [/\bdiyas?\b/i, '/images/candle-diya.jpg'],
  [/\bjar\b.*\bcandles?\b|\bcandles?\b.*\bjar\b/i, '/images/candle-jar-glass.jpg'],
  [/\bcandles?\b/i, '/images/candle-jar-dark.jpg'],
  [/terracotta|pottery|\bclay\b|earthen|\bmatka\b|\bkulhads?\b/i, '/images/cat-crafts.jpg'],
  [/dupatta|\bscarf\b|\bscarves\b|\bstoles?\b|chunni|odhni|\bshawls?\b/i, '/images/cat-fashion.jpg'],
  [/jalebi/i, '/images/cat-food.jpg'],
  [/mithai|\bsweets\b|\bsweet box|ladoo|laddu|barfi|burfi|\bpeda\b|kaju katli|halwa/i, '/images/food-sweets-box.jpg']
]

export function itemImageFor(item) {
  const text = [item?.name, item?.description].filter(Boolean).join(' ')
  if (!text) return null
  for (const [re, src] of ITEM_RULES) if (re.test(text)) return src
  return null
}

// Brand colour for a product tile when there is no matching photo
const TILE_TONES = ['teal', 'coral', 'indigo', 'mango']
export function tileToneFor(index = 0) {
  return TILE_TONES[index % TILE_TONES.length]
}
