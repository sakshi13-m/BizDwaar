// Owner API helpers — all calls go to same-origin /api routes.
// The owner session secret lives only in an HttpOnly cookie set by the server;
// it is never read, stored or sent by this code — the browser attaches it
// automatically because every call uses credentials: 'include'.

async function parse(res) {
  try {
    return await res.json()
  } catch {
    return { ok: false, message: `Unexpected server response (${res.status}).` }
  }
}

// Start a new anonymous owner session, or reuse the existing one
export async function startSession() {
  const res = await fetch('/api/owner/session', {
    method: 'POST',
    credentials: 'include'
  })
  return parse(res)
}

// Storefronts created from this browser session
export async function listMyBusinesses() {
  const res = await fetch('/api/owner/businesses', {
    credentials: 'include'
  })
  return parse(res)
}

// Optional admin fallback (not part of the normal owner journey)
export async function login(token) {
  const res = await fetch('/api/owner/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include'
  })
  return parse(res)
}

export async function logout() {
  const res = await fetch('/api/owner/logout', {
    method: 'POST',
    credentials: 'include'
  })
  return parse(res)
}

export async function createBusiness(data) {
  const res = await fetch('/api/owner/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  return parse(res)
}

export async function getBusiness(id) {
  const res = await fetch(`/api/owner/businesses/${encodeURIComponent(id)}`, {
    credentials: 'include'
  })
  return parse(res)
}

export async function updateBusiness(id, data) {
  const res = await fetch(`/api/owner/businesses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  return parse(res)
}

export async function publishBusiness(id) {
  const res = await fetch(`/api/owner/businesses/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    credentials: 'include'
  })
  return parse(res)
}

export async function updateEnquiryStatus(businessId, enquiryId, status) {
  const res = await fetch(
    `/api/owner/businesses/${encodeURIComponent(businessId)}/enquiries/${encodeURIComponent(enquiryId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include'
    }
  )
  return parse(res)
}

export async function getEnquiries(businessId) {
  const res = await fetch(`/api/owner/businesses/${encodeURIComponent(businessId)}/enquiries`, {
    credentials: 'include'
  })
  return parse(res)
}
