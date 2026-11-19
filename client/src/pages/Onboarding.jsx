import { useState } from 'react'
import { createBusiness } from '../api/owner'

export default function Onboarding({ onCreated }) {
  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    location: '',
    description: '',
    productsRaw: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await createBusiness(form)
    setLoading(false)
    if (res.ok) {
      onCreated(res.businessId)
    } else {
      setError(res.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="page">
      <div className="card wide">
        <h2>Tell us about your business</h2>
        <p className="hint">Describe your business in plain language — Bizdwaar will organise the details for you.</p>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="businessName">Business name *</label>
          <input
            id="businessName"
            value={form.businessName}
            onChange={e => update('businessName', e.target.value)}
            placeholder="e.g. Priya's Pickles"
            required
          />

          <label htmlFor="businessType">Type of business</label>
          <input
            id="businessType"
            value={form.businessType}
            onChange={e => update('businessType', e.target.value)}
            placeholder="e.g. Home food, Clothing, Jewellery"
          />

          <label htmlFor="location">Location</label>
          <input
            id="location"
            value={form.location}
            onChange={e => update('location', e.target.value)}
            placeholder="e.g. Indore, Madhya Pradesh"
          />

          <label htmlFor="description">Describe your business *</label>
          <textarea
            id="description"
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="Tell us what you sell, who you sell to, and anything else customers should know."
            rows={5}
            required
          />

          <label htmlFor="productsRaw">Your products or services</label>
          <textarea
            id="productsRaw"
            value={form.productsRaw}
            onChange={e => update('productsRaw', e.target.value)}
            placeholder="List your products or services, one per line or separated by commas."
            rows={3}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Organising your information…' : 'Organise with Bizdwaar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
