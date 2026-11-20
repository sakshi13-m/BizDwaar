// The single fictional demo persona used across Bizdwaar:
// a home-based candle maker in Pune. All details are fictional sample data.

export const DEMO_ONBOARDING = {
  businessName: "Puja's Candle Studio",
  businessType: 'Handmade candles',
  location: 'Pune, Maharashtra',
  description:
    'I make soy wax candles at home in small batches and sell them to friends, neighbours and ' +
    'through word of mouth. Every candle is poured by hand. My customers mostly buy them as gifts ' +
    'for Diwali, housewarmings and birthdays. People say they are the best candles in Pune.',
  productsRaw:
    'Lavender Calm — 200g jar, ₹280\n' +
    'Citrus Burst — 180g tin, ₹260\n' +
    'Sandalwood & Rose — 220g jar'
}

// "After" state shown on the homepage example storefront (owner-confirmed, fictional)
export const DEMO_STOREFRONT = {
  slug: 'pujas-candle-studio',
  name: "Puja's Candle Studio",
  category: 'Handmade candles',
  location: 'Pune, Maharashtra',
  description:
    'Soy wax candles poured by hand in small batches in Pune. Popular as gifts for Diwali, ' +
    'housewarmings and birthdays.',
  contactEmail: 'hello@pujascandles.example',
  contactPhone: null,
  catalogue: [
    { name: 'Lavender Calm', description: 'Soy wax candle in a glass jar.', price: '₹280', unitOrSize: '200g jar', attributes: ['Soy wax', 'Hand-poured'] },
    { name: 'Citrus Burst', description: 'Soy wax candle in a reusable tin.', price: '₹260', unitOrSize: '180g tin', attributes: ['Soy wax'] },
    { name: 'Sandalwood & Rose', description: 'Soy wax candle in a glass jar.', price: '₹320', unitOrSize: '220g jar', attributes: ['Soy wax', 'Gift favourite'] }
  ]
}
