import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import {
  requireOwner,
  requireBusinessOwnership,
  startOwnerSession,
  isAdminRequest,
  OWNER_SESSION_COOKIE
} from '../middleware/ownerAuth.js'
import Business, { toOwnerView } from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'
import { analyseBusinessInput } from '../services/claudeService.js'

const router = Router()

// Forward async errors to Express's error handler instead of crashing the process
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Business creation calls Claude and is now open to anonymous visitors — cap it per IP
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many storefronts created from this network. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
})

// --- Slug helper ---
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'storefront'
}

// -------------------------------------------------------
// POST /api/owner/session
// Start (or reuse) an anonymous owner session. Secret lives only in an HttpOnly cookie.
// -------------------------------------------------------
router.post('/session', startOwnerSession)

// -------------------------------------------------------
// POST /api/owner/login  (optional admin fallback)
// Verifies OWNER_ADMIN_TOKEN; sets HttpOnly cookie
// -------------------------------------------------------
const LoginSchema = z.object({ token: z.string().min(1) })

router.post('/login', (req, res) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Token required.' })
  }

  // Reuse the constant-time comparison from the middleware
  if (!isAdminRequest({ cookies: { ownerToken: result.data.token } })) {
    return res.status(401).json({ error: 'unauthorised', message: 'Invalid token.' })
  }

  res.cookie('ownerToken', process.env.OWNER_ADMIN_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  })

  return res.json({ ok: true, message: 'Admin session started.' })
})

// -------------------------------------------------------
// POST /api/owner/logout
// Clears the admin cookie and the anonymous owner session
// -------------------------------------------------------
router.post('/logout', (req, res) => {
  res.clearCookie('ownerToken')
  res.clearCookie(OWNER_SESSION_COOKIE, { path: '/' })
  return res.json({ ok: true, message: 'Logged out.' })
})

// -------------------------------------------------------
// GET /api/owner/businesses  (session owner)
// List the caller's own storefronts (for returning owners)
// -------------------------------------------------------
router.get('/businesses', requireOwner, wrap(async (req, res) => {
  const businesses = await Business.findByOwnerSessionHash(req.ownerSessionHash)
  return res.json({ ok: true, businesses })
}))

// -------------------------------------------------------
// POST /api/owner/businesses  (session owner)
// Create a new draft business + run Claude analysis
// -------------------------------------------------------
const CreateBusinessSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessType: z.string().max(200).optional(),
  location:     z.string().max(200).optional(),
  description:  z.string().min(10).max(2000),
  productsRaw:  z.string().max(2000).optional()
})

router.post('/businesses', requireOwner, createLimiter, wrap(async (req, res) => {
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
      unsupportedClaims: draft.unsupportedClaims || [],
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
    aiDraft,
    // Admin-only requests without an anonymous session leave this NULL (admin-managed)
    ownerSessionHash: req.ownerSessionHash
  })

  return res.status(201).json({ ok: true, businessId: business._id, slug: business.slug })
}))

// -------------------------------------------------------
// GET /api/owner/businesses/:id  (owner of this business)
// Load full draft + approved data for editing
// -------------------------------------------------------
router.get('/businesses/:id', requireOwner, requireBusinessOwnership, (req, res) => {
  return res.json({ ok: true, business: toOwnerView(req.business) })
})

// -------------------------------------------------------
// PUT /api/owner/businesses/:id  (owner of this business)
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
    publicVisible: z.boolean().default(false)
  })).optional()
})

router.put('/businesses/:id', requireOwner, requireBusinessOwnership, wrap(async (req, res) => {
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
    req.business.id,
    { $set: update },
    { new: true }
  )
  if (!business) {
    return res.status(404).json({ error: 'not_found', message: 'Business not found.' })
  }

  return res.json({ ok: true, business: toOwnerView(business) })
}))

// -------------------------------------------------------
// POST /api/owner/businesses/:id/publish  (owner of this business)
// Validate required fields then publish
// -------------------------------------------------------
router.post('/businesses/:id/publish', requireOwner, requireBusinessOwnership, wrap(async (req, res) => {
  const business = req.business

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
  const saved = await Business._save(business)

  return res.json({ ok: true, slug: saved.slug, publishedAt: saved.publishedAt })
}))

// -------------------------------------------------------
// GET /api/owner/businesses/:id/enquiries  (owner of this business)
// -------------------------------------------------------
router.get('/businesses/:id/enquiries', requireOwner, requireBusinessOwnership, wrap(async (req, res) => {
  const enquiries = await Enquiry.findByBusinessId(req.business.id)
  return res.json({ ok: true, enquiries })
}))

export default router
