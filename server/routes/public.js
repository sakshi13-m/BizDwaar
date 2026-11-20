import { Router } from 'express'
import Business from '../models/Business.js'

const router = Router()

/**
 * GET /api/businesses/:slug
 * Public storefront — returns only published, owner-approved fields.
 * Draft businesses return 404.
 */
router.get('/:slug', async (req, res, next) => {
  try {
  const business = await Business.findOne({
    slug: req.params.slug,
    status: 'published'
  })

  if (!business) {
    return res.status(404).json({
      error: 'not_found',
      message: 'Business not found or not yet published.'
    })
  }

  // Allowlist — only expose owner-approved public fields
  const publicData = {
    slug: business.slug,
    name: business.approvedProfile?.businessName || business.name,
    description: business.approvedProfile?.description || null,
    category: business.approvedProfile?.category || business.category,
    location: business.approvedProfile?.location || business.location,
    contactEmail: business.approvedProfile?.contactEmail || null,
    contactPhone: business.approvedProfile?.contactPhone || null,
    catalogue: (business.approvedCatalogue || [])
      .filter(item => item.publicVisible === true)
      .map(item => ({
        name: item.name,
        description: item.description,
        price: item.price,
        unitOrSize: item.unitOrSize,
        attributes: item.attributes || [],
        availability: item.availability || null
      })),
    publishedAt: business.publishedAt
  }

  return res.json({ ok: true, business: publicData })
  } catch (err) {
    next(err)
  }
})

export default router
