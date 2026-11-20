// Owner API helpers — all calls go to same-origin /api routes

export async function login(token) {
  const res = await fetch('/api/owner/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include'
  })
  return res.json()
}

export async function logout() {
  const res = await fetch('/api/owner/logout', {
    method: 'POST',
    credentials: 'include'
  })
  return res.json()
}

export async function createBusiness(data) {
  const res = await fetch('/api/owner/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  return res.json()
}

export async function getBusiness(id) {
  const res = await fetch(`/api/owner/businesses/${id}`, {
    credentials: 'include'
  })
  return res.json()
}

export async function updateBusiness(id, data) {
  const res = await fetch(`/api/owner/businesses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  })
  return res.json()
}

export async function publishBusiness(id) {
  const res = await fetch(`/api/owner/businesses/${id}/publish`, {
    method: 'POST',
    credentials: 'include'
  })
  return res.json()
}

export async function getEnquiries(businessId) {
  const res = await fetch(`/api/owner/businesses/${businessId}/enquiries`, {
    credentials: 'include'
  })
  return res.json()
}
