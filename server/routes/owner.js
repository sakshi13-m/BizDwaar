import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import {
  requireOwner,
  requireBusinessOwnership,
  startOwnerSession,
  isAdminRequest
} from '../middleware/ownerAuth.js'
import Business, { toOwnerView } from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'
import { analyseBusinessInput } from '../services/claudeService.js'
import { parsePriceInput, MAX_PRICE } from '../../shared/price.js'

const router = Router()

// Forward async errors to Express's error handler instead of crashing the process
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Business creation calls Claude and is now open to anonymous visitors — cap it per IP
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many business pages created from this network. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
})

// Admin token login — throttle guessing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'rate_limit_exceeded', message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
})

const PriceInputSchema = z
  .union([z.number(), z.string().max(100), z.null()])
  .transform((value, ctx) => {
    const amount = parsePriceInput(value)
    if (amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Enter the price as a number in rupees, e.g. 1299 (up to ${MAX_PRICE}).`
      })
      return z.NEVER
    }
    return amount
  })

// Show the owner the specific reason (e.g. a price that isn't a number) when we have one
function firstCustomMessage(error) {
  return error.issues.find(i => i.code === z.ZodIssueCode.custom)?.message || null
}

// --- Slug helper ---
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')          // "Sara's Studio" → "saras-studio"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'business'
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

router.post('/login', loginLimiter, (req, res) => {
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

// POST /api/owner/logout lives in routes/auth.js (also ends the login session)

// -------------------------------------------------------
// GET /api/owner/businesses  (session owner)
// List the caller's own storefronts (for returning owners)
// -------------------------------------------------------
router.get('/businesses', requireOwner, wrap(async (req, res) => {
  const businesses = await Business.findForOwner({ ownerId: req.ownerId, sessionHash: req.ownerSessionHash })
  // Pages claimed by an account are only listed for that account
  const visible = businesses.filter(b => !b.ownerId || b.ownerId === req.ownerId)
  return res.json({ ok: true, businesses: visible.map(({ ownerId, ...b }) => b) })
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
    ownerSessionHash: req.ownerSessionHash,
    // Logged-in owners own the page through their account (any device)
    ownerId: req.ownerId || null
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
    // INR amount stored as a number. Numeric text ("1299", "₹1,299") is accepted and converted;
    // anything else is rejected rather than guessed. null = price on request.
    price:         PriceInputSchema,
    unitOrSize:    z.string().max(100).nullable(),
    attributes:    z.array(z.string().max(80)).max(20).default([]),
    publicVisible: z.boolean().default(false),
    // Owner-stated only; null = not stated (nothing shown publicly)
    availability:  z.enum(['available', 'made_to_order', 'out_of_stock']).nullable().default(null)
  })).max(100).optional()
})

router.put('/businesses/:id', requireOwner, requireBusinessOwnership, wrap(async (req, res) => {
  const result = UpdateBusinessSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: 'validation_error',
      message: firstCustomMessage(result.error) || 'Some details could not be saved. Please check the highlighted fields.',
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
// Validate required fields, then copy the saved (approved) copy into the public snapshot.
// This is the only route that changes what customers see.
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

  const saved = await Business.publish(business)

  return res.json({ ok: true, slug: saved.slug, publishedAt: saved.publishedAt })
}))

// -------------------------------------------------------
// GET /api/owner/businesses/:id/enquiries  (owner of this business)
// -------------------------------------------------------
router.get('/businesses/:id/enquiries', requireOwner, requireBusinessOwnership, wrap(async (req, res) => {
  const enquiries = await Enquiry.findByBusinessId(req.business.id)
  return res.json({ ok: true, enquiries })
}))

// -------------------------------------------------------
// PATCH /api/owner/businesses/:id/enquiries/:enquiryId  (owner of this business)
// Update enquiry status: new → replied → closed
// -------------------------------------------------------
const EnquiryStatusSchema = z.object({
  status: z.enum(['new', 'replied', 'closed'])
})

router.patch('/businesses/:id/enquiries/:enquiryId', requireOwner, requireBusinessOwnership, wrap(async (req, res) => {
  const result = EnquiryStatusSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Status must be new, replied or closed.' })
  }

  // Scoped to this business — an enquiry ID from another business returns 404
  const enquiry = await Enquiry.updateStatus(req.params.enquiryId, req.business.id, result.data.status)
  if (!enquiry) {
    return res.status(404).json({ error: 'not_found', message: 'Enquiry not found.' })
  }
  return res.json({ ok: true, enquiry })
}))

export default router
