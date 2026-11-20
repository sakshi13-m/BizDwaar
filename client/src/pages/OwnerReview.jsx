import { useState, useEffect } from 'react'
import { getBusiness, updateBusiness, publishBusiness } from '../api/owner'
import StorefrontView from '../components/StorefrontView'
import SmartImage from '../components/SmartImage'
import { itemImageFor } from '../lib/imagery'

// Turn empty strings into nulls so optional fields (e.g. contact email) pass server validation
function toPayload(approved) {
  const blank = v => (typeof v === 'string' && v.trim() === '' ? null : v)
  const p = approved.approvedProfile
  return {
    approvedProfile: {
      businessName: p.businessName || '',
      description:  p.description || '',
      category:     p.category || '',
      location:     p.location || '',
      contactEmail: blank(p.contactEmail),
      contactPhone: blank(p.contactPhone)
    },
    approvedCatalogue: approved.approvedCatalogue.map(item => ({
      name:          blank(item.name),
      description:   blank(item.description),
      price:         blank(item.price),
      unitOrSize:    blank(item.unitOrSize),
      attributes:    item.attributes || [],
      publicVisible: item.publicVisible === true
    }))
  }
}

export default function OwnerReview({ businessId, onPublished }) {
  const [business, setBusiness] = useState(null)
  const [approved, setApproved] = useState({ approvedProfile: {}, approvedCatalogue: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [checkedClaims, setCheckedClaims] = useState({})

  useEffect(() => {
    getBusiness(businessId).then(res => {
      if (res.ok) {
        setBusiness(res.business)
        const draft = res.business.aiDraft
        const savedProfile = res.business.approvedProfile
        // Returning owner: restore previously saved edits instead of the raw AI draft
        if (savedProfile && Object.keys(savedProfile).length > 0) {
          setApproved({
            approvedProfile: {
              businessName:  savedProfile.businessName || res.business.name || '',
              description:   savedProfile.description || '',
              category:      savedProfile.category || '',
              location:      savedProfile.location || '',
              contactEmail:  savedProfile.contactEmail || '',
              contactPhone:  savedProfile.contactPhone || ''
            },
            approvedCatalogue: (res.business.approvedCatalogue || []).map(item => ({
              name:          item.name || '',
              description:   item.description || '',
              price:         item.price || '',
              unitOrSize:    item.unitOrSize || '',
              attributes:    item.attributes || [],
              publicVisible: item.publicVisible === true
            }))
          })
          setLoading(false)
          return
        }
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
      } else {
        setLoadError(res.message || 'Business not found.')
      }
      setLoading(false)
    }).catch(() => {
      setLoadError('Network error — could not load your business.')
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
    try {
      const res = await updateBusiness(businessId, toPayload(approved))
      if (res.ok) setSaved(true)
      else setError(res.message || 'Save failed. Please try again.')
    } catch {
      setError('Network error — your changes were not saved.')
    }
    setSaving(false)
  }

  async function handlePreviewPublish() {
    // Save first, then show preview
    setError('')
    setSaving(true)
    try {
      const saveRes = await updateBusiness(businessId, toPayload(approved))
      setSaving(false)
      if (!saveRes.ok) {
        setError(saveRes.message || 'Save failed before preview.')
        return
      }
      setSaved(true)
      setShowPreview(true)
    } catch {
      setSaving(false)
      setError('Network error — could not save before preview.')
    }
  }

  async function handleConfirmPublish() {
    setPublishing(true)
    setError('')
    try {
      const pubRes = await publishBusiness(businessId)
      setPublishing(false)
      if (pubRes.ok) {
        setShowPreview(false)
        onPublished(pubRes.slug || business.slug, approved.approvedProfile.businessName || business.name)
      } else {
        setError(pubRes.message || 'Publish failed. Please fill in required fields.')
        setShowPreview(false)
      }
    } catch {
      setPublishing(false)
      setShowPreview(false)
      setError('Network error — your storefront was not published.')
    }
  }

  if (loading) {
    return (
      <div className="state-panel">
        <span className="spinner" aria-hidden="true" />
        <p>Loading your business draft…</p>
      </div>
    )
  }
  if (!business) {
    return (
      <div className="state-panel state-panel--error">
        <h2>We couldn't open this storefront</h2>
        <p>{loadError || 'Business not found.'}</p>
      </div>
    )
  }

  const draft = business.aiDraft || {}
  const profile = approved.approvedProfile
  const catalogue = approved.approvedCatalogue
  const missingQuestions = draft.missingQuestions || []
  const unsupportedClaims = draft.unsupportedClaims || []
  const visibleCount = catalogue.filter(i => i.publicVisible).length
  const hasNoVisible = catalogue.length > 0 && visibleCount === 0
  const claimsPending = unsupportedClaims.filter((_, i) => !checkedClaims[i]).length
  const aiFailed = !draft.analysedAt
  const isLive = business.status === 'published'
  const ownerWords = business.ownerInput?.description

  // Field provenance: AI suggestion vs owner-confirmed
  function provenance(value, aiValue) {
    if (!value) return null
    if (aiValue && value === aiValue) return <span className="badge badge--ai">AI suggestion · please check</span>
    return <span className="badge badge--owner">Confirmed by you</span>
  }

  const previewBusiness = {
    name:         profile.businessName || business.name,
    description:  profile.description,
    category:     profile.category,
    location:     profile.location,
    contactEmail: profile.contactEmail || null,
    contactPhone: profile.contactPhone || null,
    catalogue:    catalogue.filter(i => i.publicVisible)
  }

  return (
    <div className="review">
      {/* ---------- Preview overlay ---------- */}
      {showPreview && (
        <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Storefront preview">
          <div className="preview-frame browser">
            <div className="browser__bar">
              <span className="browser__dots"><i /><i /><i /></span>
              <span className="browser__url">bizdwaar.in/s/{business.slug}</span>
              <span className="badge badge--fiction">Preview</span>
            </div>
            <div className="browser__viewport browser__viewport--scroll">
              <StorefrontView business={previewBusiness} mode="preview" />
            </div>
          </div>
          <div className="preview-bar">
            <div className="preview-bar__text">
              <strong>This is exactly what customers will see.</strong>
              <span>
                {claimsPending > 0
                  ? `Review ${claimsPending} flagged claim${claimsPending > 1 ? 's' : ''} before publishing.`
                  : hasNoVisible
                    ? 'No products are selected — only your profile will show.'
                    : `${visibleCount} offering${visibleCount === 1 ? '' : 's'} will be visible.`}
              </span>
            </div>
            <div className="preview-bar__actions">
              <button type="button" className="btn btn--ghost-light" onClick={() => setShowPreview(false)}>← Back to editing</button>
              <button
                type="button"
                className="btn btn--mango"
                onClick={handleConfirmPublish}
                disabled={publishing || claimsPending > 0}
              >
                {publishing ? 'Publishing…' : isLive ? 'Update live storefront' : 'Publish storefront'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Header ---------- */}
      <header className="page-head">
        <div>
          <p className="eyebrow eyebrow--coral">Step 2 · Review</p>
          <h1 className="h-page">Here's your storefront draft</h1>
          <p className="lede">
            Bizdwaar organised what you shared. Check each detail, fill any gaps and choose what customers
            see — only what you confirm here is published.
          </p>
        </div>
        {isLive && <span className="status-pill status-pill--published">Live — saved changes update your storefront</span>}
      </header>

      {/* ---------- Transformation band ---------- */}
      <section className="transform-band">
        <div className="transform-band__col transform-band__col--words">
          <p className="eyebrow">In your words</p>
          <blockquote>{ownerWords || 'Your original description.'}</blockquote>
        </div>
        <div className="transform-band__arrow" aria-hidden="true">→</div>
        <div className="transform-band__col transform-band__col--ai">
          <p className="eyebrow eyebrow--mango">Organised by Bizdwaar</p>
          {aiFailed ? (
            <p className="transform-band__summary">
              We couldn't run the AI organiser this time, but your information is saved. You can fill in the
              details below yourself.
            </p>
          ) : (
            <p className="transform-band__summary">{draft.businessSummary || 'Summary ready for your review.'}</p>
          )}
          <div className="stat-row">
            <span className="stat"><strong>{(draft.catalogueDrafts || []).length}</strong> offerings found</span>
            <span className="stat stat--mango"><strong>{missingQuestions.length}</strong> questions for you</span>
            <span className="stat stat--coral"><strong>{unsupportedClaims.length}</strong> claims to check</span>
          </div>
        </div>
      </section>

      <div className="review__layout">
        <div className="review__main">
          {/* ---------- Profile ---------- */}
          <section className="panel">
            <div className="panel__head">
              <h2>Business profile</h2>
              <p>The first thing customers read.</p>
            </div>

            <div className="field">
              <label htmlFor="rv-name">Business name <span className="badge badge--owner">From you</span></label>
              <input id="rv-name" value={profile.businessName || ''} onChange={e => updateProfile('businessName', e.target.value)} maxLength={200} />
            </div>

            <div className="field">
              <label htmlFor="rv-desc">
                Description <span className="req">*</span> {provenance(profile.description, draft.businessSummary)}
              </label>
              <textarea
                id="rv-desc"
                className={!profile.description ? 'is-missing' : ''}
                value={profile.description || ''}
                onChange={e => updateProfile('description', e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="A short, honest description of your business. Required to publish."
              />
            </div>

            <div className="field-pair">
              <div className="field">
                <label htmlFor="rv-cat">Category {provenance(profile.category, draft.suggestedCategory)}</label>
                <input id="rv-cat" value={profile.category || ''} onChange={e => updateProfile('category', e.target.value)} maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor="rv-loc">Location</label>
                <input id="rv-loc" value={profile.location || ''} onChange={e => updateProfile('location', e.target.value)} maxLength={200} />
              </div>
            </div>

            <div className="field-pair">
              <div className="field">
                <label htmlFor="rv-email">Contact email <span className="optional">optional</span></label>
                <input id="rv-email" type="email" value={profile.contactEmail || ''} onChange={e => updateProfile('contactEmail', e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="field">
                <label htmlFor="rv-phone">Contact phone <span className="optional">optional</span></label>
                <input id="rv-phone" value={profile.contactPhone || ''} onChange={e => updateProfile('contactPhone', e.target.value)} placeholder="+91 98765 43210" maxLength={50} />
              </div>
            </div>
            <p className="field__help">Shown publicly only if you fill them in. Customers can always reach you through the enquiry form.</p>
          </section>

          {/* ---------- Catalogue ---------- */}
          <section className="panel">
            <div className="panel__head panel__head--split">
              <div>
                <h2>Products &amp; services</h2>
                <p>Turn on each item you want customers to see. Items start hidden until you approve them.</p>
              </div>
              {catalogue.length > 0 && (
                <span className="visible-count"><strong>{visibleCount}</strong> of {catalogue.length} visible</span>
              )}
            </div>

            {catalogue.length === 0 && (
              <div className="empty-inline">
                <p>No products were found in your description. Your storefront will show your business profile and enquiry form.</p>
              </div>
            )}

            {hasNoVisible && (
              <p className="alert alert--warn">No items are switched on yet — your storefront will show your profile only.</p>
            )}

            <div className="item-list">
              {catalogue.map((item, i) => (
                <article key={i} className={`item-card ${item.publicVisible ? 'is-visible' : ''}`}>
                  <div className="item-card__media">
                    <SmartImage
                      src={itemImageFor(item, profile.category, i)}
                      alt=""
                      className="item-card__img"
                      illustrative
                      initial={(item.name || 'I').charAt(0)}
                    />
                  </div>
                  <div className="item-card__fields">
                    <div className="item-card__top">
                      <span className="item-card__index">Item {i + 1}</span>
                      <label className="switch-field">
                        <input
                          type="checkbox"
                          checked={item.publicVisible || false}
                          onChange={e => updateCatalogueItem(i, 'publicVisible', e.target.checked)}
                        />
                        <span className="switch" aria-hidden="true" />
                        <span className="switch-field__text">{item.publicVisible ? 'Visible on storefront' : 'Hidden'}</span>
                      </label>
                    </div>

                    <div className="field">
                      <label htmlFor={`it-name-${i}`}>Name</label>
                      <input id={`it-name-${i}`} value={item.name || ''} onChange={e => updateCatalogueItem(i, 'name', e.target.value)} maxLength={200} />
                    </div>

                    <div className="field">
                      <label htmlFor={`it-desc-${i}`}>
                        Description <span className="badge badge--ai">AI draft · please check</span>
                      </label>
                      <textarea id={`it-desc-${i}`} value={item.description || ''} onChange={e => updateCatalogueItem(i, 'description', e.target.value)} rows={2} maxLength={1000} />
                    </div>

                    <div className="field-pair">
                      <div className="field">
                        <label htmlFor={`it-price-${i}`}>
                          Price {!item.price && <span className="badge badge--missing">Needs your input</span>}
                        </label>
                        <input
                          id={`it-price-${i}`}
                          className={!item.price ? 'is-missing' : ''}
                          value={item.price || ''}
                          onChange={e => updateCatalogueItem(i, 'price', e.target.value)}
                          placeholder="e.g. ₹280"
                          maxLength={100}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`it-size-${i}`}>
                          Size / unit {!item.unitOrSize && <span className="badge badge--missing">Needs your input</span>}
                        </label>
                        <input
                          id={`it-size-${i}`}
                          className={!item.unitOrSize ? 'is-missing' : ''}
                          value={item.unitOrSize || ''}
                          onChange={e => updateCatalogueItem(i, 'unitOrSize', e.target.value)}
                          placeholder="e.g. 200g jar"
                          maxLength={100}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {catalogue.length > 0 && (
              <p className="field__help">Images are illustrative mood photos chosen by category and are labelled as such on your storefront.</p>
            )}
          </section>
        </div>

        {/* ---------- Side column ---------- */}
        <aside className="review__aside">
          {missingQuestions.length > 0 && (
            <section className="note-card note-card--mango">
              <span className="badge badge--missing">Missing information</span>
              <h3>Bizdwaar needs a few answers</h3>
              <p>These weren't in your description, so we left them blank instead of guessing.</p>
              <ul className="question-list">
                {missingQuestions.map((q, i) => (
                  <li key={i}>
                    <span className="question-list__field">{q.field}</span>
                    {q.question}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unsupportedClaims.length > 0 && (
            <section className="note-card note-card--coral">
              <span className="badge badge--claim">Please confirm</span>
              <h3>Claims we kept out</h3>
              <p>
                These statements can't be verified, so they aren't in your public description.
                Add them back yourself only if you can stand behind them.
              </p>
              <ul className="claim-list">
                {unsupportedClaims.map((c, i) => (
                  <li key={i}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!checkedClaims[i]}
                        onChange={e => setCheckedClaims(s => ({ ...s, [i]: e.target.checked }))}
                      />
                      <span>
                        <q>{c}</q>
                        <small>I've reviewed this</small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="note-card note-card--teal">
            <h3>Before you publish</h3>
            <ul className="checklist">
              <li className={profile.businessName ? 'is-done' : ''}>Business name</li>
              <li className={profile.description ? 'is-done' : ''}>Description</li>
              <li className={visibleCount > 0 ? 'is-done' : ''}>At least one visible offering <small>(recommended)</small></li>
              {unsupportedClaims.length > 0 && <li className={claimsPending === 0 ? 'is-done' : ''}>Flagged claims reviewed</li>}
            </ul>
          </section>
        </aside>
      </div>

      {/* ---------- Sticky action bar ---------- */}
      <div className="action-bar">
        <div className="action-bar__status" aria-live="polite">
          {error && <span className="action-bar__error">{error}</span>}
          {!error && saved && <span className="action-bar__ok">✓ Saved</span>}
          {!error && !saved && <span>Changes are saved when you click Save draft or Preview.</span>}
        </div>
        <div className="action-bar__buttons">
          <button type="button" onClick={handleSave} disabled={saving} className="btn btn--ghost">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" onClick={handlePreviewPublish} disabled={publishing || saving} className="btn btn--primary">
            {saving ? 'Saving…' : 'Preview & publish →'}
          </button>
        </div>
      </div>
    </div>
  )
}
