/**
 * GH-04 acceptance test — five personas, no invented facts.
 * Usage: node server/scripts/testClaude.js
 */
import 'dotenv/config'
import { analyseBusinessInput } from '../services/claudeService.js'

const personas = [
  {
    label: 'Pickle seller (missing price, size, ingredients, shelf life)',
    input: {
      businessName: "Priya's Pickles",
      businessType: 'Home food',
      location: 'Indore, Madhya Pradesh',
      description: 'I make traditional Indori pickles at home using my grandmother\'s recipes.',
      productsRaw: 'Mango Pickle, Mixed Vegetable Pickle'
    },
    mustBeNull: ['price', 'unitOrSize']
  },
  {
    label: 'Boutique (missing fabric, size, return policy)',
    input: {
      businessName: 'Meera Boutique',
      businessType: 'Clothing',
      location: 'Pune',
      description: 'We sell handcrafted kurtas and dupattas.',
      productsRaw: 'Cotton Kurta, Silk Dupatta'
    },
    mustBeNull: ['price', 'unitOrSize']
  },
  {
    label: 'Handmade jewellery (missing material, dimensions)',
    input: {
      businessName: 'Anika Jewels',
      businessType: 'Jewellery',
      location: 'Jaipur',
      description: 'Handmade earrings and necklaces.',
      productsRaw: 'Jhumka Earrings, Layered Necklace'
    },
    mustBeNull: ['price', 'unitOrSize']
  },
  {
    label: 'Home bakery (missing allergens, weight, lead time)',
    input: {
      businessName: "Riya's Bakes",
      businessType: 'Home bakery',
      location: 'Mumbai',
      description: 'Custom cakes and cookies baked at home for birthdays and events.',
      productsRaw: 'Custom Cake, Assorted Cookies'
    },
    mustBeNull: ['price', 'unitOrSize']
  },
  {
    label: 'Tailoring (missing rates, turnaround)',
    input: {
      businessName: 'Sharma Tailors',
      businessType: 'Tailoring',
      location: 'Delhi',
      description: 'Stitching and alterations for all types of clothing.',
      productsRaw: 'Blouse Stitching, Trouser Alteration'
    },
    mustBeNull: ['price', 'unitOrSize']
  }
]

let passed = 0
let failed = 0

for (const persona of personas) {
  process.stdout.write(`\nTesting: ${persona.label} ... `)
  try {
    const result = await analyseBusinessInput(persona.input)

    // Check no invented facts in catalogue
    let inventedFacts = false
    for (const item of result.catalogueDrafts) {
      for (const field of persona.mustBeNull) {
        if (item[field] !== null && item[field] !== undefined && item[field] !== '') {
          console.log(`FAIL — invented ${field}: "${item[field]}"`)
          inventedFacts = true
        }
      }
    }

    // Check missing questions were generated
    const hasMissingQuestions = result.missingQuestions.length > 0

    if (!inventedFacts && hasMissingQuestions) {
      console.log('PASS')
      console.log('  Summary:', result.businessSummary?.slice(0, 80))
      console.log('  Missing questions:', result.missingQuestions.map(q => q.field).join(', '))
      passed++
    } else if (!hasMissingQuestions) {
      console.log('FAIL — no missing questions generated')
      failed++
    } else {
      failed++
    }
  } catch (err) {
    console.log('FAIL —', err.message)
    failed++
  }
}

console.log(`\n--- GH-04 Results: ${passed} passed, ${failed} failed ---`)
if (failed > 0) process.exit(1)
