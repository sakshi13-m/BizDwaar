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
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getBusiness(businessId).then(res => {
      if (res.ok) {
        setBusiness(res.business)
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
            publicVisible: false   // default OFF — owner must opt in
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

  async function handlePreviewPublish() {
    // Save first, then show preview
    setError('')
    setSaving(true)
    const saveRes = await updateBusiness(businessId, approved)
    setSaving(false)
    if (!saveRes.ok) {
      setError(saveRes.message || 'Save failed before preview.')
      return
    }
    setSaved(true)
    setShowPreview(true)
  }

  async function handleConfirmPublish() {
    setPublishing(true)
    setError('')
    const pubRes = await publishBusiness(businessId)
    setPublishing(false)
    if (pubRes.ok) {
      setShowPreview(false)
      onPublished(business.slug)
    } else {
      setError(pubRes.message || 'Publish failed. Please fill in required fields.')
      setShowPreview(false)
    }
  }

  if (loading) return <div className="page"><p className="hint">Loading your business draft…</p></div>
  if (!business) return <div className="page"><p className="error">Business not found.</p></div>

  const draft = business.aiDraft
  const missingQuestions = draft?.missingQuestions || []
  const unsupportedClaims = draft?.unsupportedClaims || []
  const visibleCount = approved.approvedCatalogue.filter(i => i.publicVisible).length
  const hasNoVisible = approved.approvedCatalogue.length > 0 && visibleCount === 0

  // Preview renders a mini storefront view
  const PreviewOverlay = showPreview && (
    <div className="preview-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPreview(false) }}>
      <div className="preview-container">
        <div className="preview-toolbar">
          <span>Preview — this is what customers will see</span>
          <button
            onClick={() => setShowPreview(false)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>

        <div className="preview-body">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e0dc' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0e7490', marginBottom: '0.4rem' }}>
              {approved.approvedProfile.businessName || business.name}
            </h2>
            {approved.approvedProfile.category && (
              <p style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#78716c', fontWeight: 600 }}>
                {approved.approvedProfile.category}
              </p>
            )}
            {approved.approvedProfile.location && (
              <p style={{ fontSize: '0.9rem', color: '#374151', marginTop: '0.25rem' }}>
                📍 {approved.approvedProfile.location}
              </p>
            )}
          </div>

          {approved.approvedProfile.description && (
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#374151', marginBottom: '1.5rem' }}>
              {approved.approvedProfile.description}
            </p>
          )}

          {approved.approvedCatalogue.filter(i => i.publicVisible).length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Our offerings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {approved.approvedCatalogue.filter(i => i.publicVisible).map((item, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e2e0dc', borderRadius: 8, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{item.name || 'Product'}</div>
                    {item.description && <p style={{ fontSize: '0.8rem', color: '#78716c', marginBottom: '0.4rem', lineHeight: 1.4 }}>{item.description}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                      {item.price && <span style={{ fontWeight: 700, color: '#0e7490', fontSize: '0.95rem' }}>{item.price}</span>}
                      {item.unitOrSize && <span style={{ fontSize: '0.8rem', color: '#78716c' }}>{item.unitOrSize}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approved.approvedCatalogue.filter(i => i.publicVisible).length === 0 && approved.approvedCatalogue.length > 0 && (
            <div className="warning-box">No products are selected for display. Only your profile will appear on the storefront.</div>
          )}

          <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '1.25rem', textAlign: 'center', marginTop: '1.5rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Get in touch</h3>
            {approved.approvedProfile.contactEmail && (
              <p style={{ fontSize: '0.9rem', color: '#0e7490' }}>{approved.approvedProfile.contactEmail}</p>
            )}
            {approved.approvedProfile.contactPhone && (
              <p style={{ fontSize: '0.9rem', color: '#0e7490' }}>{approved.approvedProfile.contactPhone}</p>
            )}
            <div style={{ display: 'inline-block', marginTop: '0.75rem', background: '#0e7490', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600 }}>
              Send enquiry
            </div>
          </div>
        </div>

        <div className="preview-actions">
          <button className="btn-secondary" onClick={() => setShowPreview(false)}>
            ← Back to editing
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirmPublish}
            disabled={publishing}
          >
            {publishing ? 'Publishing…' : 'Confirm and publish →'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {PreviewOverlay}
      <div className="page">
        <div className="card wide">
          <div className="review-header">
            <h2>Review your business</h2>
            <p className="hint">
              Bizdwaar has organised your information below.
              Edit anything that needs correcting — only what you confirm here will be published.
            </p>
          </div>

          {/* Unsupported claims warning */}
          {unsupportedClaims.length > 0 && (
            <div className="unsupported-claims" style={{ marginBottom: '1rem' }}>
              <strong>Check these claims:</strong> The following may need verification before publishing.
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
                {unsupportedClaims.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

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
              <p className="hint">Tick "Show on my storefront" for each item you want customers to see.</p>

              {hasNoVisible && (
                <div className="warning-box">
                  No products selected for display. Your storefront will show your business profile only.
                </div>
              )}

              {approved.approvedCatalogue.map((item, i) => (
                <div key={i} className="catalogue-card">
                  <div className="catalogue-card-header">
                    <span className="catalogue-card-title">Item {i + 1}</span>
                    <label className="visible-toggle">
                      <input
                        type="checkbox"
                        checked={item.publicVisible || false}
                        onChange={e => updateCatalogueItem(i, 'publicVisible', e.target.checked)}
                      />
                      Show on my storefront
                    </label>
                  </div>

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
            <button onClick={handlePreviewPublish} disabled={publishing || saving} className="btn-primary">
              {saving ? 'Saving…' : 'Preview & publish →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
