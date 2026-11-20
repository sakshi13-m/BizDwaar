import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import Business from '../models/Business.js'

/**
 * Anonymous owner sessions.
 *
 * - The server issues a random 32-byte secret in an HttpOnly cookie.
 * - Only the SHA-256 hash of that secret is stored (businesses.owner_session_hash).
 * - The raw secret is never returned in a response body or stored in the DB.
 *
 * The legacy OWNER_ADMIN_TOKEN cookie is still honoured as an optional admin
 * fallback (can access any business), but is never required for new owners.
 */

export const OWNER_SESSION_COOKIE = 'bdOwnerSession'
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SECRET_PATTERN = /^[a-f0-9]{64}$/

export function hashSessionSecret(secret) {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  // Compare fixed-length digests so lengths never leak and timingSafeEqual never throws
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

function readSessionSecret(req) {
  const secret = req.cookies?.[OWNER_SESSION_COOKIE]
  return typeof secret === 'string' && SECRET_PATTERN.test(secret) ? secret : null
}

export function isAdminRequest(req) {
  const adminToken = process.env.OWNER_ADMIN_TOKEN
  const cookieToken = req.cookies?.ownerToken
  return Boolean(adminToken) && safeEqual(cookieToken, adminToken)
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS
  }
}

/**
 * POST /api/owner/session handler.
 * Idempotent: reuses an existing valid session cookie, otherwise issues a new one.
 */
export function startOwnerSession(req, res) {
  if (readSessionSecret(req)) {
    return res.json({ ok: true, created: false })
  }
  const secret = randomBytes(32).toString('hex')
  res.cookie(OWNER_SESSION_COOKIE, secret, sessionCookieOptions())
  return res.status(201).json({ ok: true, created: true })
}

/**
 * Requires either an anonymous owner session or the admin cookie.
 * Sets req.ownerSessionHash (may be null for admin-only) and req.isAdmin.
 */
export function requireOwner(req, res, next) {
  const secret = readSessionSecret(req)
  req.ownerSessionHash = secret ? hashSessionSecret(secret) : null
  req.isAdmin = isAdminRequest(req)

  if (!req.ownerSessionHash && !req.isAdmin) {
    return res.status(401).json({
      error: 'unauthorised',
      message: 'Owner session required. Please reload the page to start a new session.'
    })
  }
  next()
}

/**
 * For /businesses/:id routes. Must run after requireOwner.
 * Loads the business and checks it belongs to the caller's session.
 * Sets req.business on success.
 */
export async function requireBusinessOwnership(req, res, next) {
  try {
    const business = await Business.findById(req.params.id)
    if (!business) {
      return res.status(404).json({ error: 'not_found', message: 'Business not found.' })
    }

    const owns = Boolean(req.ownerSessionHash) &&
      Boolean(business.ownerSessionHash) &&
      safeEqual(req.ownerSessionHash, business.ownerSessionHash)

    if (!owns && !req.isAdmin) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'This storefront can only be managed from the browser it was created in. ' +
          'In this hackathon version, storefronts are managed from the original browser session.'
      })
    }

    req.business = business
    next()
  } catch (err) {
    next(err)
  }
}
