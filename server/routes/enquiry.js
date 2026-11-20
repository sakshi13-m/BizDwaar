import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import Business, { publicSnapshot } from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'
import { sendEnquiryEmail } from '../services/emailService.js'

const router = Router()

// Rate limiter: 3 submissions per IP per hour
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many enquiries from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use req.ip which respects trust proxy setting
  keyGenerator: (req) => req.ip
})

const EnquirySchema = z.object({
  businessSlug: z.string().min(1).max(200),
  customerName:  z.string().min(1).max(200),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional().or(z.literal('')),
  message:       z.string().min(10).max(2000),
  // Optional: which visible catalogue item the customer is asking about
  productName:   z.string().max(200).optional().or(z.literal('')),
  // Honeypot — normal users never fill this
  website:       z.string().max(0).optional()
})

router.post('/', enquiryLimiter, (req, res, next) => {
  handleEnquiry(req, res).catch(next)
})

async function handleEnquiry(req, res) {
  // Validate
  const result = EnquirySchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid enquiry data.',
      details: result.error.flatten().fieldErrors
    })
  }

  const { businessSlug, customerName, customerEmail, customerPhone, message, productName, website } = result.data

  // Honeypot check — if 'website' field is filled, it's a bot
  if (website && website.length > 0) {
    console.warn('Honeypot triggered:', req.ip)
    // Return success to the bot (don't reveal honeypot exists)
    return res.json({ ok: true, message: 'Enquiry received.' })
  }

  // Find the business
  const business = await Business.findOne({ slug: businessSlug, status: 'published' })
  if (!business) {
    return res.status(404).json({
      error: 'not_found',
      message: 'Business not found or not published.'
    })
  }

  // Only accept a product name that matches one of this business's publicly visible items
  let matchedProduct = null
  if (productName) {
    const visibleNames = publicSnapshot(business).catalogue
      .filter(item => item.publicVisible === true && item.name)
      .map(item => item.name)
    matchedProduct = visibleNames.find(n => n === productName) || null
    if (!matchedProduct) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'That product is not available on this business page.'
      })
    }
  }

  // Persist enquiry
  const enquiry = await Enquiry.create({
    businessId: business._id,
    customerName,
    customerEmail: customerEmail || null,
    customerPhone: customerPhone || null,
    message,
    productName: matchedProduct,
    notificationStatus: 'pending'
  })

  // Attempt to send email
  const emailResult = await sendEnquiryEmail(enquiry, business)
  if (emailResult.sent) {
    enquiry.notificationStatus = 'sent'
    enquiry.notificationAttemptedAt = new Date()
    await enquiry.save()
    return res.json({
      ok: true,
      message: 'Your enquiry has been sent. The owner will contact you soon.'
    })
  } else {
    enquiry.notificationStatus = 'failed'
    enquiry.notificationAttemptedAt = new Date()
    await enquiry.save()
    // Enquiry is safely stored and visible in the owner's inbox even if email fails
    return res.json({
      ok: true,
      message: 'Your enquiry has been received. The owner will see it in their Bizdwaar inbox.'
    })
  }
}

export default router
