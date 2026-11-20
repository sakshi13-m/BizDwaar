// The single fictional demo persona used across Bizdwaar:
// Sara's Studio — an independent handmade-products studio in Jaipur.
// All details are fictional sample data, clearly labelled as such in the UI.

export const DEMO_ONBOARDING = {
  businessName: "Sara's Studio",
  businessType: 'Handmade crafts and home décor',
  location: 'Jaipur, Rajasthan',
  description:
    'I run a small studio from home where I make hand-poured candles, paint terracotta planters ' +
    'and block-print cotton dupattas. I sell to friends, at weekend craft markets and through ' +
    'word of mouth, and customers often order them as gifts. Everything I make is 100% eco-friendly.',
  productsRaw:
    'Hand-poured jar candle — 200g, ₹350\n' +
    'Painted terracotta planter — 6 inch, ₹450\n' +
    'Block-print cotton dupatta'
}

// "After" state shown on the homepage example storefront (owner-confirmed, fictional)
export const DEMO_STOREFRONT = {
  slug: 'saras-studio',
  name: "Sara's Studio",
  category: 'Handmade candles, décor & textiles',
  location: 'Jaipur, Rajasthan',
  description:
    'Hand-poured candles, painted terracotta and block-printed cotton, made in a small home studio ' +
    'in Jaipur. Popular as gifts and for festive décor.',
  contactEmail: 'hello@sarasstudio.example',
  contactPhone: null,
  catalogue: [
    { name: 'Hand-poured Jar Candle', description: 'Candle poured by hand into a reusable glass jar.', price: '₹350', unitOrSize: '200g jar', attributes: ['Handmade', 'Gift favourite'], availability: 'available' },
    { name: 'Painted Terracotta Planter', description: 'Terracotta planter, hand-painted in the studio.', price: '₹450', unitOrSize: '6 inch', attributes: ['Hand-painted'], availability: 'made_to_order' },
    { name: 'Block-print Cotton Dupatta', description: 'Cotton dupatta printed by hand with wooden blocks.', price: '₹890', unitOrSize: '2.25 m', attributes: ['Hand block-printed', 'Cotton'], availability: 'available' }
  ]
}
