import { useState } from 'react'
import '../styles/App.css'

export default function EnquiryForm({ businessSlug }) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    message: '',
    website: '' // honeypot
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, businessSlug })
    })

    const data = await res.json()
    setLoading(false)

    if (data.ok) {
      setSuccess(true)
    } else {
      setError(data.message || 'Something went wrong. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="page-center">
        <div className="card">
          <h2>✅ Enquiry sent!</h2>
          <p className="hint">The business owner will get back to you soon.</p>
          <a href={`/b/${businessSlug}`} className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>
            ← Back to storefront
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card wide">
        <h2>Send an enquiry</h2>
        <p className="hint">The business owner will receive your message via email.</p>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="customerName">Your name *</label>
          <input
            id="customerName"
            value={form.customerName}
            onChange={e => update('customerName', e.target.value)}
            placeholder="Your full name"
            required
          />

          <label htmlFor="customerEmail">Your email</label>
          <input
            id="customerEmail"
            type="email"
            value={form.customerEmail}
            onChange={e => update('customerEmail', e.target.value)}
            placeholder="your@email.com (optional)"
          />

          <label htmlFor="customerPhone">Your phone</label>
          <input
            id="customerPhone"
            value={form.customerPhone}
            onChange={e => update('customerPhone', e.target.value)}
            placeholder="+91 98765 43210 (optional)"
          />

          <label htmlFor="message">Your message *</label>
          <textarea
            id="message"
            value={form.message}
            onChange={e => update('message', e.target.value)}
            placeholder="What would you like to know or order?"
            rows={6}
            required
          />

          {/* Honeypot — hidden from normal users */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={e => update('website', e.target.value)}
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            tabIndex={-1}
            autoComplete="off"
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      </div>
    </div>
  )
}
