import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import Business from '../models/Business.js'
import { OwnerSession } from '../models/Owner.js'

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
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
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

// The admin fallback can manage every storefront, so a short or guessable token is refused
// outright: the fallback stays disabled until OWNER_ADMIN_TOKEN is at least this long.
export const MIN_ADMIN_TOKEN_LENGTH = 32

// 'unset' | 'weak' | 'ok' — logged at startup, never the value itself
export function adminTokenStatus() {
  const token = process.env.OWNER_ADMIN_TOKEN
  if (!token) return 'unset'
  return token.length >= MIN_ADMIN_TOKEN_LENGTH ? 'ok' : 'weak'
}

export function isAdminRequest(req) {
  if (adminTokenStatus() !== 'ok') return false
  const cookieToken = req.cookies?.ownerToken
  return safeEqual(cookieToken, process.env.OWNER_ADMIN_TOKEN)
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
  issueSessionCookie(res)
  return res.status(201).json({ ok: true, created: true })
}

// Set a brand-new session secret cookie; returns its hash (the raw secret never leaves the cookie)
export function issueSessionCookie(res) {
  const secret = randomBytes(32).toString('hex')
  res.cookie(OWNER_SESSION_COOKIE, secret, sessionCookieOptions())
  return hashSessionSecret(secret)
}

export function currentSessionHash(req) {
  const secret = readSessionSecret(req)
  return secret ? hashSessionSecret(secret) : null
}

/**
 * Reads the caller's identity without rejecting anyone:
 * req.ownerSessionHash (browser session), req.ownerId (logged-in account, if any), req.isAdmin.
 */
export async function loadOwner(req, res, next) {
  try {
    req.ownerSessionHash = currentSessionHash(req)
    req.ownerId = await OwnerSession.ownerIdFor(req.ownerSessionHash)
    req.isAdmin = isAdminRequest(req)
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Requires a browser session (anonymous or logged in) or the admin cookie.
 */
export function requireOwner(req, res, next) {
  loadOwner(req, res, (err) => {
    if (err) return next(err)
    if (!req.ownerSessionHash && !req.isAdmin) {
      return res.status(401).json({
        error: 'unauthorised',
        message: 'Owner session required. Please reload the page to start a new session.'
      })
    }
    next()
  })
}

/** Admin-only routes (the admin fallback cookie). */
export function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'forbidden', message: 'Administrator access required.' })
  }
  req.isAdmin = true
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

    // Owned by the logged-in account, or (not yet claimed by any account) created in this browser
    const ownsByAccount = Boolean(req.ownerId) && Boolean(business.ownerId) &&
      safeEqual(req.ownerId, business.ownerId)
    const ownsByBrowser = !business.ownerId &&
      Boolean(req.ownerSessionHash) && Boolean(business.ownerSessionHash) &&
      safeEqual(req.ownerSessionHash, business.ownerSessionHash)

    if (!ownsByAccount && !ownsByBrowser && !req.isAdmin) {
      return res.status(403).json({
        error: 'forbidden',
        message: business.ownerId
          ? 'Log in with the email address that manages this business page.'
          : 'This business page can only be managed from the browser it was created in, ' +
            'or after logging in from that browser.'
      })
    }

    req.business = business
    next()
  } catch (err) {
    next(err)
  }
}
