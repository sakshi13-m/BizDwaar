import { useState } from 'react'
import '../styles/App.css'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

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
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessSlug })
      })

      let data
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      setLoading(false)

      if (!res.ok || !data.ok) {
        setError(data.message || 'Something went wrong. Please try again.')
        return
      }

      setSuccessMessage(data.message || 'Your enquiry has been received.')
      setSuccess(true)
    } catch {
      setLoading(false)
      setError('Network error — please check your connection and try again.')
    }
  }

  if (success) {
    return (
      <div className="page-center">
        <div className="card">
          <h2 style={{ marginBottom: '0.75rem' }}>Enquiry received</h2>
          <p className="hint">{successMessage}</p>
          <button
            className="btn-secondary"
            style={{ marginTop: '1rem' }}
            onClick={() => navigate(`/s/${businessSlug}`)}
          >
            ← Back to storefront
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card wide">
        <h2>Send an enquiry</h2>
        <p className="hint">Fill in your details and the owner will get back to you.</p>
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

        <button
          className="btn-secondary"
          style={{ marginTop: '1rem' }}
          onClick={() => navigate(`/s/${businessSlug}`)}
        >
          ← Back to storefront
        </button>
      </div>
    </div>
  )
}
