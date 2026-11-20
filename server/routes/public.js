import { Router } from 'express'
import Business, { publicSnapshot } from '../models/Business.js'
import { normalisePrice } from '../../shared/price.js'

const router = Router()

/**
 * GET /api/businesses/:slug
 * Public storefront — returns only the published snapshot of owner-approved fields.
 * Draft businesses return 404. Saved-but-unpublished edits are never exposed.
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

    const { profile, catalogue } = publicSnapshot(business)

    // Allowlist — only expose owner-approved public fields
    const publicData = {
      slug: business.slug,
      name: profile.businessName || business.name,
      description: profile.description || null,
      category: profile.category || business.category,
      location: profile.location || business.location,
      contactEmail: profile.contactEmail || null,
      contactPhone: profile.contactPhone || null,
      currency: 'INR',
      catalogue: catalogue
        .filter(item => item.publicVisible === true)
        .map(item => ({
          name: item.name,
          description: item.description,
          // Number in INR (or legacy text kept as written); null = price on request
          price: normalisePrice(item.price),
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
