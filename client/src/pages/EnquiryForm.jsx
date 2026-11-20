import { useState, useEffect } from 'react'
import { LogoMark } from '../components/Brand'
import { navigate } from '../lib/navigate'
import '../styles/App.css'
import '../styles/Storefront.css'

export default function EnquiryForm({ businessSlug }) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    message: '',
    productName: new URLSearchParams(window.location.search).get('item') || '',
    website: '' // honeypot
  })
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [businessName, setBusinessName] = useState('')

  // Show the business name in the header (public, owner-approved data only)
  useEffect(() => {
    fetch(`/api/businesses/${encodeURIComponent(businessSlug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.ok) return
        setBusinessName(d.business.name)
        const names = (d.business.catalogue || []).map(i => i.name).filter(Boolean)
        setProducts(names)
        // Drop a pre-selected item that isn't on this storefront
        setForm(f => (f.productName && !names.includes(f.productName) ? { ...f, productName: '' } : f))
      })
      .catch(() => {})
  }, [businessSlug])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // The owner needs a way to reply (the server checks this too)
    if (!form.customerEmail.trim() && !form.customerPhone.trim()) {
      setError('Please share an email address or phone number so the owner can reply.')
      document.getElementById('customerEmail')?.focus()
      return
    }
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

  const name = businessName || 'this business'
  const back = (
    <button type="button" className="btn btn--text" onClick={() => navigate(`/s/${businessSlug}`)}>
      ← Back to {businessName || 'business page'}
    </button>
  )

  if (success) {
    return (
      <div className="enquiry enquiry--done">
        <div className="enquiry-done">
          <div className="enquiry-done__mark" aria-hidden="true">✓</div>
          <h1 className="h-page">Enquiry received</h1>
          <p className="lede">{successMessage}</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate(`/s/${businessSlug}`)}>
            Back to {businessName || 'business page'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="enquiry">
      <aside className="enquiry__side">
        {back}
        <p className="eyebrow eyebrow--mango">Send an enquiry</p>
        <h1 className="enquiry__title">Message {name}</h1>
        <p>Ask about products, prices, custom orders or delivery. Your message is delivered to the owner's Bizdwaar inbox.</p>
        <ul className="enquiry__points">
          <li>Add an email or phone number so they can reply.</li>
          <li>Be specific — quantities and dates help the owner answer quickly.</li>
        </ul>
        <p className="enquiry__powered"><LogoMark size={18} /> Powered by Bizdwaar</p>
      </aside>

      <main className="enquiry__main">
        <form onSubmit={handleSubmit} className="enquiry__form">
          <div className="field">
            <label htmlFor="customerName">Your name <span className="req">*</span></label>
            <input
              id="customerName"
              value={form.customerName}
              onChange={e => update('customerName', e.target.value)}
              placeholder="Your full name"
              maxLength={200}
              required
            />
          </div>

          <fieldset className="contact-group">
            <legend>
              How can they reply? <span className="req">*</span>
              <span className="optional">email or phone — at least one</span>
            </legend>
            <div className="field-pair">
              <div className="field">
                <label htmlFor="customerEmail">Email</label>
                <input
                  id="customerEmail"
                  type="email"
                  autoComplete="email"
                  value={form.customerEmail}
                  onChange={e => update('customerEmail', e.target.value)}
                  placeholder="you@example.com"
                  aria-describedby="contact-help"
                />
              </div>
              <div className="field">
                <label htmlFor="customerPhone">Phone / WhatsApp</label>
                <input
                  id="customerPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.customerPhone}
                  onChange={e => update('customerPhone', e.target.value)}
                  placeholder="+91 98765 43210"
                  maxLength={25}
                  aria-describedby="contact-help"
                />
              </div>
            </div>
            <p id="contact-help" className="field__help">Shared only with {name}, never shown publicly.</p>
          </fieldset>

          {products.length > 0 && (
            <div className="field">
              <label htmlFor="productName">Interested in</label>
              <select
                id="productName"
                value={form.productName}
                onChange={e => update('productName', e.target.value)}
              >
                <option value="">General enquiry</option>
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="message">Your message <span className="req">*</span></label>
            <textarea
              id="message"
              value={form.message}
              onChange={e => update('message', e.target.value)}
              placeholder="Hi! I'd like to know more about…"
              rows={6}
              minLength={10}
              maxLength={2000}
              required
            />
            <p className="field__help">At least 10 characters.</p>
          </div>

          {/* Honeypot — hidden from normal users */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={e => update('website', e.target.value)}
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {error && <p className="alert alert--error" role="alert">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn--primary btn--lg btn--block">
            {loading ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      </main>
    </div>
  )
}
