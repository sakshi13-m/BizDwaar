import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-5'

// --- Zod schema for Claude's structured output ---

const CatalogueItemSchema = z.object({
  name:          z.string().nullable(),
  description:   z.string().nullable(),
  price:         z.string().nullable(),
  unitOrSize:    z.string().nullable(),
  attributes:    z.array(z.string()).default([]),
  missingFields: z.array(z.string()).default([])
})

const MissingQuestionSchema = z.object({
  field:    z.string(),
  question: z.string()
})

export const ClaudeOutputSchema = z.object({
  businessSummary:   z.string().nullable(),
  suggestedCategory: z.string().nullable(),
  catalogueDrafts:   z.array(CatalogueItemSchema).default([]),
  missingQuestions:  z.array(MissingQuestionSchema).default([]),
  unsupportedClaims: z.array(z.string()).default([])
})

// --- Prompt ---

function buildPrompt(input) {
  return `You are a business information organiser for Bizdwaar. Your only job is to structure the owner-provided facts below into a JSON response.

STRICT RULES — read carefully before responding:
1. Use ONLY facts the owner explicitly provided. Do not infer, assume or invent anything.
2. Never fill in price, weight, volume, size, ingredients, allergens, shelf life, certifications, stock levels, discounts, delivery promises, quality claims or business credentials. If absent, set the field to null.
3. For every null/missing field that a customer would need to know, add an entry to missingQuestions with a clear, direct question for the owner.
4. Do not fabricate product names or service names if none were supplied.
5. businessSummary should be a neutral one-to-two sentence description based only on what the owner said. Do not add marketing language or claims the owner did not make.
6. suggestedCategory: suggest one short category label (e.g. "Home Food", "Clothing", "Jewellery") only if it is obvious from the input — otherwise null.
7. unsupportedClaims: list any factual claims in the owner input that cannot be verified (e.g. "best in city", "100% organic") — do not include them in the summary.
8. Return ONLY valid JSON matching the schema. No prose, no markdown, no code fences.

OWNER-PROVIDED INPUT:
Business name: ${input.businessName || 'Not provided'}
Business type: ${input.businessType || 'Not provided'}
Location: ${input.location || 'Not provided'}
Description: ${input.description || 'Not provided'}
Products / services: ${input.productsRaw || 'Not provided'}

REQUIRED JSON SCHEMA:
{
  "businessSummary": string | null,
  "suggestedCategory": string | null,
  "catalogueDrafts": [
    {
      "name": string | null,
      "description": string | null,
      "price": string | null,
      "unitOrSize": string | null,
      "attributes": string[],
      "missingFields": string[]
    }
  ],
  "missingQuestions": [
    { "field": string, "question": string }
  ],
  "unsupportedClaims": string[]
}`
}

// --- Main export ---

export async function analyseBusinessInput(input) {
  const prompt = buildPrompt(input)

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = message.content[0]?.text
  if (!raw) throw new Error('Claude returned an empty response')

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Claude response was not valid JSON: ' + raw.slice(0, 200))
  }

  // Validate with Zod — throws if schema is violated
  const validated = ClaudeOutputSchema.parse(parsed)
  return validated
}
