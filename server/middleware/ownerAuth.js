/**
 * Owner authentication middleware.
 * Verifies the signed HttpOnly cookie set at login.
 */
export function requireOwner(req, res, next) {
  const token = req.cookies?.ownerToken
  if (!token || token !== process.env.OWNER_ADMIN_TOKEN) {
    return res.status(401).json({
      error: 'unauthorised',
      message: 'Owner session required.'
    })
  }
  next()
}
