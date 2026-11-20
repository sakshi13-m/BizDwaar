import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { analyseBusinessInput } from '../services/claudeService.js'
import { requireOwner } from '../middleware/ownerAuth.js'

const router = Router()

// Each call costs Anthropic credits: require an owner session (or admin) and cap per IP
const analyseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'rate_limit_exceeded', message: 'Too many analysis requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
})

const AnalyseInputSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessType: z.string().max(200).optional(),
  location:     z.string().max(200).optional(),
  description:  z.string().min(10).max(2000),
  productsRaw:  z.string().max(2000).optional()
})

router.post('/analyse', requireOwner, analyseLimiter, async (req, res) => {
  // Validate request body
  const result = AnalyseInputSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid input',
      details: result.error.flatten().fieldErrors
    })
  }

  try {
    const draft = await analyseBusinessInput(result.data)
    return res.json({ ok: true, draft })
  } catch (err) {
    console.error('Claude analysis error:', err.message)
    return res.status(502).json({
      error: 'analysis_failed',
      message: 'Could not analyse business information. Please try again.'
    })
  }
})

export default router
