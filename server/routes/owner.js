import { Router } from 'express'
import { z } from 'zod'
import { requireOwner } from '../middleware/ownerAuth.js'
import Business from '../models/Business.js'
import { analyseBusinessInput } from '../services/claudeService.js'

const router = Router()

// --- Slug helper ---
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// -------------------------------------------------------
// POST /api/owner/login
// Verifies OWNER_ADMIN_TOKEN; sets signed HttpOnly cookie
// -------------------------------------------------------
const LoginSchema = z.object({ token: z.string().min(1) })

router.post('/login', (req, res) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Token required.' })
  }

  if (result.data.token !== process.env.OWNER_ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorised', message: 'Invalid token.' })
  }

  res.cookie('ownerToken', process.env.OWNER_ADMIN_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  })

  return res.json({ ok: true, message: 'Owner session started.' })
})

// -------------------------------------------------------
// POST /api/owner/logout
// -------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('ownerToken')
  return res.json({ ok: true, message: 'Logged out.' })
})

// -------------------------------------------------------
// POST /api/businesses  (owner only)
// Create a new draft business + run Claude analysis
// -------------------------------------------------------
const CreateBusinessSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessType: z.string().max(200).optional(),
  location:     z.string().max(200).optional(),
  description:  z.string().min(10).max(2000),
  productsRaw:  z.string().max(2000).optional()
})

router.post('/businesses', requireOwner, async (req, res) => {
  const result = CreateBusinessSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid input.',
      details: result.error.flatten().fieldErrors
    })
  }

  const { businessName, businessType, location, description, productsRaw } = result.data

  // Generate a unique slug
  let slug = toSlug(businessName)
  const existing = await Business.findOne({ slug })
  if (existing) slug = `${slug}-${Date.now()}`

  // Run Claude analysis — if it fails, preserve owner input and proceed as draft
  let aiDraft = {}
  try {
    const draft = await analyseBusinessInput(result.data)
    aiDraft = {
      businessSummary:   draft.businessSummary,
      suggestedCategory: draft.suggestedCategory,
      catalogueDrafts:   draft.catalogueDrafts,
      missingQuestions:  draft.missingQuestions,
      analysedAt:        new Date()
    }
  } catch (err) {
    console.error('Claude analysis failed during business creation:', err.message)
    // Preserve owner input — do not block creation
    aiDraft = { missingQuestions: [], catalogueDrafts: [], analysedAt: null }
  }

  const business = await Business.create({
    name:     businessName,
    slug,
    category: businessType || null,
    location: location || null,
    ownerInput: { description, rawProductFacts: productsRaw || null },
    aiDraft
  })

  return res.status(201).json({ ok: true, businessId: business._id, slug: business.slug })
})

// -------------------------------------------------------
// GET /api/owner/businesses/:id  (owner only)
// Load full draft + approved data for editing
// -------------------------------------------------------
router.get('/businesses/:id', requireOwner, async (req, res) => {
  const business = await Business.findById(req.params.id).lean()
  if (!business) {
    return res.status(404).json({ error: 'not_found', message: 'Business not found.' })
  }
  return res.json({ ok: true, business })
})

// -------------------------------------------------------
// PUT /api/owner/businesses/:id  (owner only)
// Save owner-edited approved fields
// -------------------------------------------------------
const UpdateBusinessSchema = z.object({
  approvedProfile: z.object({
    businessName:  z.string().max(200).optional(),
    description:   z.string().max(2000).optional(),
    category:      z.string().max(200).optional(),
    location:      z.string().max(200).optional(),
    contactEmail:  z.string().email().optional().nullable(),
    contactPhone:  z.string().max(50).optional().nullable()
  }).optional(),
  approvedCatalogue: z.array(z.object({
    name:          z.string().max(200).nullable(),
    description:   z.string().max(1000).nullable(),
    price:         z.string().max(100).nullable(),
    unitOrSize:    z.string().max(100).nullable(),
    attributes:    z.array(z.string()).default([]),
    publicVisible: z.boolean().default(true)
  })).optional()
})

router.put('/businesses/:id', requireOwner, async (req, res) => {
  const result = UpdateBusinessSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid update data.',
      details: result.error.flatten().fieldErrors
    })
  }

  const update = {}
  if (result.data.approvedProfile)   update.approvedProfile   = result.data.approvedProfile
  if (result.data.approvedCatalogue) update.approvedCatalogue = result.data.approvedCatalogue

  const business = await Business.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true }
  )
  if (!business) {
    return res.status(404).json({ error: 'not_found', message: 'Business not found.' })
  }

  return res.json({ ok: true, business })
})

// -------------------------------------------------------
// POST /api/owner/businesses/:id/publish  (owner only)
// Validate required fields then publish
// -------------------------------------------------------
router.post('/businesses/:id/publish', requireOwner, async (req, res) => {
  const business = await Business.findById(req.params.id)
  if (!business) {
    return res.status(404).json({ error: 'not_found', message: 'Business not found.' })
  }

  // Require at least a name and description in approvedProfile
  const profile = business.approvedProfile
  if (!profile?.businessName && !business.name) {
    return res.status(422).json({
      error: 'publish_blocked',
      message: 'Business name is required before publishing.'
    })
  }
  if (!profile?.description) {
    return res.status(422).json({
      error: 'publish_blocked',
      message: 'Business description is required before publishing.'
    })
  }

  business.status      = 'published'
  business.publishedAt = new Date()
  await business.save()

  return res.json({ ok: true, slug: business.slug, publishedAt: business.publishedAt })
})

export default router
