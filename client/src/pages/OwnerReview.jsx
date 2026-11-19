import { useState, useEffect } from 'react'
import { getBusiness, updateBusiness, publishBusiness } from '../api/owner'

export default function OwnerReview({ businessId, onPublished }) {
  const [business, setBusiness] = useState(null)
  const [approved, setApproved] = useState({ approvedProfile: {}, approvedCatalogue: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getBusiness(businessId).then(res => {
      if (res.ok) {
        setBusiness(res.business)
        // Pre-fill approved fields from AI draft suggestions
        const draft = res.business.aiDraft
        setApproved({
          approvedProfile: {
            businessName:  res.business.name || '',
            description:   draft?.businessSummary || '',
            category:      draft?.suggestedCategory || '',
            location:      res.business.location || '',
            contactEmail:  '',
            contactPhone:  ''
          },
          approvedCatalogue: (draft?.catalogueDrafts || []).map(item => ({
            name:          item.name || '',
            description:   item.description || '',
            price:         item.price || '',
            unitOrSize:    item.unitOrSize || '',
            attributes:    item.attributes || [],
            publicVisible: true
          }))
        })
      }
      setLoading(false)
    })
  }, [businessId])

  function updateProfile(field, value) {
    setApproved(a => ({ ...a, approvedProfile: { ...a.approvedProfile, [field]: value } }))
    setSaved(false)
  }

  function updateCatalogueItem(index, field, value) {
    setApproved(a => {
      const cat = [...a.approvedCatalogue]
      cat[index] = { ...cat[index], [field]: value }
      return { ...a, approvedCatalogue: cat }
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await updateBusiness(businessId, approved)
    setSaving(false)
    if (res.ok) {
      setSaved(true)
    } else {
      setError(res.message || 'Save failed. Please try again.')
    }
  }

  async function handlePublish() {
    setError('')
    // Save first
    setSaving(true)
    const saveRes = await updateBusiness(businessId, approved)
    setSaving(false)
    if (!saveRes.ok) {
      setError(saveRes.message || 'Save failed before publishing.')
      return
    }
    setPublishing(true)
    const pubRes = await publishBusiness(businessId)
    setPublishing(false)
    if (pubRes.ok) {
      onPublished(business.slug)
    } else {
      setError(pubRes.message || 'Publish failed. Please fill in required fields.')
    }
  }

  if (loading) return <div className="page"><p className="hint">Loading your business draft…</p></div>
  if (!business) return <div className="page"><p className="error">Business not found.</p></div>

  const draft = business.aiDraft
  const missingQuestions = draft?.missingQuestions || []

  return (
    <div className="page">
      <div className="card wide">
        <div className="review-header">
          <h2>Review your business</h2>
          <p className="hint">
            Bizdwaar has organised your information below.
            Edit anything that needs correcting — only what you confirm here will be published.
          </p>
        </div>

        {/* Business profile */}
        <section className="review-section">
          <h3>Business profile</h3>

          <label>Business name</label>
          <input
            value={approved.approvedProfile.businessName || ''}
            onChange={e => updateProfile('businessName', e.target.value)}
          />

          <label>
            Description
            <span className="draft-badge">AI draft — please review</span>
          </label>
          <textarea
            value={approved.approvedProfile.description || ''}
            onChange={e => updateProfile('description', e.target.value)}
            rows={4}
          />

          <label>Category</label>
          <input
            value={approved.approvedProfile.category || ''}
            onChange={e => updateProfile('category', e.target.value)}
          />

          <label>Location</label>
          <input
            value={approved.approvedProfile.location || ''}
            onChange={e => updateProfile('location', e.target.value)}
          />

          <label>Contact email (optional)</label>
          <input
            type="email"
            value={approved.approvedProfile.contactEmail || ''}
            onChange={e => updateProfile('contactEmail', e.target.value)}
            placeholder="customers@example.com"
          />

          <label>Contact phone (optional)</label>
          <input
            value={approved.approvedProfile.contactPhone || ''}
            onChange={e => updateProfile('contactPhone', e.target.value)}
            placeholder="+91 98765 43210"
          />
        </section>

        {/* Catalogue */}
        {approved.approvedCatalogue.length > 0 && (
          <section className="review-section">
            <h3>Products / services</h3>
            {approved.approvedCatalogue.map((item, i) => (
              <div key={i} className="catalogue-card">
                <label>Name</label>
                <input
                  value={item.name || ''}
                  onChange={e => updateCatalogueItem(i, 'name', e.target.value)}
                />

                <label>
                  Description
                  <span className="draft-badge">AI draft — please review</span>
                </label>
                <textarea
                  value={item.description || ''}
                  onChange={e => updateCatalogueItem(i, 'description', e.target.value)}
                  rows={3}
                />

                <label>
                  Price
                  {!item.price && <span className="needs-input">Needs your input</span>}
                </label>
                <input
                  value={item.price || ''}
                  onChange={e => updateCatalogueItem(i, 'price', e.target.value)}
                  placeholder="e.g. ₹120 per jar"
                />

                <label>
                  Size / unit
                  {!item.unitOrSize && <span className="needs-input">Needs your input</span>}
                </label>
                <input
                  value={item.unitOrSize || ''}
                  onChange={e => updateCatalogueItem(i, 'unitOrSize', e.target.value)}
                  placeholder="e.g. 250g jar"
                />
              </div>
            ))}
          </section>
        )}

        {/* Missing questions */}
        {missingQuestions.length > 0 && (
          <section className="review-section missing-section">
            <h3>Questions for you</h3>
            <p className="hint">These facts were missing from your description. You can fill them in above.</p>
            <ul className="missing-list">
              {missingQuestions.map((q, i) => (
                <li key={i}><strong>{q.field}:</strong> {q.question}</li>
              ))}
            </ul>
          </section>
        )}

        {error && <p className="error">{error}</p>}
        {saved && <p className="success">Saved.</p>}

        <div className="review-actions">
          <button onClick={handleSave} disabled={saving} className="btn-secondary">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button onClick={handlePublish} disabled={publishing || saving} className="btn-primary">
            {publishing ? 'Publishing…' : 'Preview & publish →'}
          </button>
        </div>
      </div>
    </div>
  )
}
