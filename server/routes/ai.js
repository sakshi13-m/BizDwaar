import { Router } from 'express'
import { z } from 'zod'
import { analyseBusinessInput } from '../services/claudeService.js'

const router = Router()

const AnalyseInputSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessType: z.string().max(200).optional(),
  location:     z.string().max(200).optional(),
  description:  z.string().min(10).max(2000),
  productsRaw:  z.string().max(2000).optional()
})

router.post('/analyse', async (req, res) => {
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
