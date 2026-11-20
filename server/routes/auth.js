import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { randomBytes, randomInt, createHash, timingSafeEqual } from 'crypto'
import Owner, { OwnerSession, LoginCode, normaliseEmail } from '../models/Owner.js'
import Business from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'
import { sendLoginCodeEmail, emailConfigured } from '../services/emailService.js'
import {
  loadOwner,
  requireAdmin,
  issueSessionCookie,
  currentSessionHash,
  SESSION_MAX_AGE_MS,
  OWNER_SESSION_COOKIE
} from '../middleware/ownerAuth.js'

/**
 * Owner email login with one-time codes (mounted at /api/owner).
 *
 *   POST /login/code    { email }        → emails a 6-digit code (valid 10 minutes, single use)
 *   POST /login/verify  { email, code }  → logs in: new session cookie, claims this browser's pages
 *   GET  /me                             → { loggedIn, email }
 *   POST /logout                         → ends the login session and clears cookies
 *   GET  /admin/businesses               → admin overview of every page
 *
 * Only a salted SHA-256 of each code is stored. Codes allow 5 attempts. Requests are
 * rate limited per IP and per email address.
 */

const router = Router()
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const MAX_CODES_PER_EMAIL = 3          // within CODE_WINDOW_MS
const CODE_WINDOW_MS = 15 * 60 * 1000

const limiter = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  message: { error: 'rate_limit_exceeded', message },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
})
const codeRequestLimiter = limiter(10, 'Too many code requests from this network. Please wait a few minutes.')
const verifyLimiter = limiter(30, 'Too many login attempts. Please wait a few minutes.')

const EmailSchema = z.string().trim().toLowerCase().email().max(254)

function hashCode(code, salt) {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex')
}

function sameHash(a, b) {
  const ba = Buffer.from(String(a), 'hex')
  const bb = Buffer.from(String(b), 'hex')
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb)
}

// ---------------------------------------------------------------
router.post('/login/code', codeRequestLimiter, wrap(async (req, res) => {
  const parsed = z.object({ email: EmailSchema }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Please enter a valid email address.' })
  }
  const email = parsed.data.email

  const recent = await LoginCode.recent(email, 10)
  const inWindow = recent.filter(c => Date.now() - new Date(c.created_at).getTime() < CODE_WINDOW_MS)
  if (inWindow.length >= MAX_CODES_PER_EMAIL) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'We have already sent a few codes to this email. Please use the latest one or wait 15 minutes.'
    })
  }

  // Only one code is ever active per email: a new request cancels earlier unused codes
  for (const old of recent) if (!old.consumed_at) await LoginCode.consume(old.id)

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const salt = randomBytes(16).toString('hex')
  await LoginCode.create({ email, codeHash: hashCode(code, salt), salt, ttlMs: CODE_TTL_MS })

  const sent = await sendLoginCodeEmail(email, code)
  if (!sent.sent) {
    console.error('Login code email not sent:', sent.error)
    return res.status(503).json({
      error: 'email_unavailable',
      message: "We couldn't send the email right now. Please try again in a few minutes."
    })
  }

  return res.json({ ok: true, message: `We've sent a 6-digit code to ${email}. It's valid for 10 minutes.` })
}))

// ---------------------------------------------------------------
router.post('/login/verify', verifyLimiter, wrap(async (req, res) => {
  const parsed = z.object({
    email: EmailSchema,
    code: z.string().trim().regex(/^\d{6}$/, 'The code is 6 digits.')
  }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation_error', message: 'Enter your email and the 6-digit code.' })
  }
  const { email, code } = parsed.data

  // The single active (unused, unexpired) code for this email
  const latest = (await LoginCode.recent(email, 10))
    .find(c => !c.consumed_at && new Date(c.expires_at).getTime() > Date.now())
  const expired = !latest
  if (expired) {
    return res.status(400).json({ error: 'code_expired', message: 'That code has expired or was already used. Please request a new one.' })
  }
  if (Number(latest.attempts) >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'too_many_attempts', message: 'Too many wrong attempts. Please request a new code.' })
  }
  if (!sameHash(hashCode(code, latest.salt), latest.code_hash)) {
    await LoginCode.recordFailedAttempt(latest.id, Number(latest.attempts) + 1)
    return res.status(400).json({ error: 'code_incorrect', message: "That code isn't right. Please check the email and try again." })
  }
  await LoginCode.consume(latest.id)

  const owner = await Owner.findOrCreate(email)
  await Owner.touchLogin(owner.id)

  // Pages created in this browser before logging in now belong to the account
  const claimed = await Business.claimForOwner(currentSessionHash(req), owner.id)

  // Fresh session secret on login (no session fixation); the old one is retired
  await OwnerSession.remove(currentSessionHash(req))
  const newHash = issueSessionCookie(res)
  await OwnerSession.create(newHash, owner.id, SESSION_MAX_AGE_MS)

  return res.json({ ok: true, email: owner.email, claimed })
}))

// ---------------------------------------------------------------
router.get('/me', loadOwner, wrap(async (req, res) => {
  const owner = await Owner.findById(req.ownerId)
  // emailLogin=false hides the login buttons until an email provider is configured
  return res.json({ ok: true, loggedIn: Boolean(owner), email: owner?.email || null, isAdmin: req.isAdmin, emailLogin: emailConfigured() })
}))

// ---------------------------------------------------------------
router.post('/logout', wrap(async (req, res) => {
  await OwnerSession.remove(currentSessionHash(req))
  res.clearCookie('ownerToken', { path: '/' })
  res.clearCookie(OWNER_SESSION_COOKIE, { path: '/' })
  return res.json({ ok: true, message: 'Logged out.' })
}))

// ---------------------------------------------------------------
router.get('/admin/businesses', requireAdmin, wrap(async (req, res) => {
  const [businesses, emails, enquiries] = await Promise.all([
    Business.listAll(),
    Owner.emailMap(),
    Enquiry.statusCounts()
  ])
  return res.json({
    ok: true,
    businesses: businesses.map(({ ownerId, ...b }) => ({
      ...b,
      ownerEmail: ownerId ? emails.get(ownerId) || null : null,
      enquiries: enquiries.get(b.id) || { total: 0, new: 0 }
    }))
  })
}))

// TEMPORARY (remove after verifying TRUST_PROXY_HOPS): what the server sees for this request's address chain.
// Admin-only, nothing is logged or stored.
router.get('/admin/ipcheck', requireAdmin, (req, res) => {
  res.json({
    ok: true,
    trustProxy: req.app.get('trust proxy'),
    ip: req.ip,
    ips: req.ips,
    xForwardedFor: req.headers['x-forwarded-for'] || null,
    remoteAddress: req.socket.remoteAddress
  })
})

export { normaliseEmail }
export default router
