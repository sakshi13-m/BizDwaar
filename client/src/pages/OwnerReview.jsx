import { useState, useEffect } from 'react'
import { getBusiness, updateBusiness, publishBusiness } from '../api/owner'
import StorefrontView from '../components/StorefrontView'
import SmartImage from '../components/SmartImage'
import { itemImageFor, tileToneFor } from '../lib/imagery'
import { parsePriceInput, formatPrice, PRICE_ON_REQUEST } from '../../../shared/price.js'

// A catalogue row the owner added but never filled in is ignored
function hasContent(item) {
  return ['name', 'description', 'price', 'unitOrSize'].some(k => typeof item[k] === 'string' && item[k].trim() !== '')
}

// Prices are edited as text but saved as a number of rupees. Returns an error message or null.
function priceError(item) {
  return parsePriceInput(item.price) === undefined
    ? 'Enter the price as a number in rupees, e.g. 1299. Put units like "per kg" in Size / unit.'
    : null
}

// Number from the server → editable text ("1299"); legacy text prices are shown as written
function priceToInput(price) {
  if (typeof price === 'number') return String(price)
  return typeof price === 'string' ? price : ''
}

// What customers will see under the price field
function priceHint(item) {
  const amount = parsePriceInput(item.price)
  if (amount === null) return `Customers will see "${PRICE_ON_REQUEST}".`
  if (amount === 0) return 'Customers will see ₹0. Leave it blank instead if the price is on request.'
  return `Customers will see ${formatPrice(amount)}`
}

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
    approvedCatalogue: approved.approvedCatalogue.filter(hasContent).map(item => ({
      name:          blank(item.name),
      description:   blank(item.description),
      price:         parsePriceInput(item.price) ?? null, // number of rupees, or null = price on request
      unitOrSize:    blank(item.unitOrSize),
      attributes:    item.attributes || [],
      publicVisible: item.publicVisible === true,
      availability:  item.availability || null
    }))
  }
}

// Local-only identity for catalogue rows (never sent to the server)
let keySeq = 0
const nextKey = () => `item-${++keySeq}`

function emptyItem() {
  return {
    _key: nextKey(), _source: 'owner',
    name: '', description: '', price: '', unitOrSize: '', attributes: [],
    publicVisible: true,   // the owner is adding it themselves
    availability: ''
  }
}

/**
 * Work out which form field answers an AI "missing information" question.
 * Returns { kind: 'profile'|'item', field, index?, append? }.
 * `append` targets (free-text answers) add a labelled line to a description.
 */
function resolveQuestion(q, catalogue) {
  const text = `${q.field || ''} ${q.question || ''}`.toLowerCase()

  // Which product is this about? Explicit index like "catalogueDrafts[1].price", or a product name mentioned
  let index = null
  const idx = (q.field || '').match(/\[(\d+)\]/)
  if (idx && catalogue[Number(idx[1])]) index = Number(idx[1])
  if (index === null) {
    const hit = catalogue.findIndex(it => it.name && it.name.trim().length > 2 && text.includes(it.name.trim().toLowerCase()))
    if (hit >= 0) index = hit
  }

  // Product-level answer: go to the item's field, or add the first product if there are none yet
  const itemField = (field, emptyCheck) => {
    if (catalogue.length === 0) return { kind: 'addItem' }
    const i = index !== null ? index : catalogue.findIndex(it => emptyCheck(it))
    return { kind: 'item', field, index: i >= 0 ? i : 0 }
  }

  if (/price|cost|rate|₹|rupee|how much/.test(text)) return itemField('price', it => !it.price)
  if (/size|weight|volume|quantity|unit|dimension|gram|\bml\b|\bkg\b|length/.test(text)) return itemField('unitOrSize', it => !it.unitOrSize)
  if (/availab|in stock|out of stock|made to order/.test(text)) return itemField('availability', it => !it.availability)
  if (/(describe|description).{0,40}(product|item|service)|(product|item|service).{0,20}description/.test(text)) {
    return itemField('description', it => !it.description)
  }
  // "What products do you sell? Please list each item" → add products
  if (/(list|what|which).{0,40}(products|items|services)|products?\s*$|^\s*products?\b/.test(text)) return { kind: 'addItem' }

  if (/e-?mail/.test(text)) return { kind: 'profile', field: 'contactEmail' }
  if (/phone|whatsapp|mobile|contact|call|reach you|get in touch/.test(text)) return { kind: 'profile', field: 'contactPhone' }
  if (/location|address|city|area|where (are|is) you|based/.test(text)) return { kind: 'profile', field: 'location' }
  if (/category|type of business/.test(text)) return { kind: 'profile', field: 'category' }

  // Anything else (ingredients, delivery, materials…) is answered in a description
  if (index !== null) return { kind: 'item', field: 'description', index, append: true }
  return { kind: 'profile', field: 'description', append: true }
}

// "delivery_area" → "Delivery area: " — the line a free-text answer is typed after
// "paymentMethods" / "delivery_area" → "Payment methods: " — readable on the public page
function answerPrefix(q) {
  const label = (q.field || 'Answer')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\[\]._]+/g, ' ')
    .replace(/\b\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() || 'answer'
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}: `
}

const PROFILE_FIELD_IDS = {
  description: 'rv-desc', category: 'rv-cat', location: 'rv-loc',
  contactEmail: 'rv-email', contactPhone: 'rv-phone'
}
const ITEM_FIELD_IDS = { price: 'it-price', unitOrSize: 'it-size', availability: 'it-avail', description: 'it-desc' }

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Not stated' },
  { value: 'available', label: 'Available' },
  { value: 'made_to_order', label: 'Made to order' },
  { value: 'out_of_stock', label: 'Out of stock' }
]

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
  const [dirty, setDirty] = useState(false)
  const [pendingLive, setPendingLive] = useState(false) // saved edits not yet on the live business page

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    getBusiness(businessId).then(res => {
      if (res.ok) {
        setBusiness(res.business)
        setPendingLive(Boolean(res.business.hasUnpublishedChanges))
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
              _key:          nextKey(),
              _source:       'saved',
              name:          item.name || '',
              description:   item.description || '',
              price:         priceToInput(item.price),
              unitOrSize:    item.unitOrSize || '',
              attributes:    item.attributes || [],
              publicVisible: item.publicVisible === true,
              availability:  item.availability || ''
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
            _key:          nextKey(),
            _source:       'ai',
            name:          item.name || '',
            description:   item.description || '',
            price:         priceToInput(item.price),
            unitOrSize:    item.unitOrSize || '',
            attributes:    item.attributes || [],
            publicVisible: false,  // default OFF — owner must opt in
            availability:  ''      // never inferred by AI — owner states it
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
    setDirty(true)
  }

  function updateCatalogueItem(index, field, value) {
    setApproved(a => {
      const cat = [...a.approvedCatalogue]
      cat[index] = { ...cat[index], [field]: value }
      return { ...a, approvedCatalogue: cat }
    })
    setSaved(false)
    setDirty(true)
  }

  function focusField(id) {
    // Wait for React to render any new row before focusing
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
      if (typeof el.setSelectionRange === 'function' && el.value != null && el.tagName !== 'SELECT') {
        el.setSelectionRange(el.value.length, el.value.length)
      }
    }))
  }

  function addItem() {
    const newIndex = approved.approvedCatalogue.length
    setApproved(a => ({ ...a, approvedCatalogue: [...a.approvedCatalogue, emptyItem()] }))
    setSaved(false)
    setDirty(true)
    focusField(`it-name-${newIndex}`)
  }

  function removeItem(index) {
    const item = approved.approvedCatalogue[index]
    const label = item?.name ? `"${item.name}"` : `item ${index + 1}`
    if (!window.confirm(`Remove ${label} from your catalogue?`)) return
    setApproved(a => ({ ...a, approvedCatalogue: a.approvedCatalogue.filter((_, i) => i !== index) }))
    setSaved(false)
    setDirty(true)
  }

  // Jump to the field that answers a question; free-text answers get a labelled line to type after
  function answerQuestion(q) {
    const target = resolveQuestion(q, approved.approvedCatalogue)
    const prefix = answerPrefix(q)

    if (target.kind === 'addItem') {
      // Reuse an empty row the owner already added, otherwise add one
      const blank = approved.approvedCatalogue.findIndex(it => !hasContent(it))
      if (blank >= 0) focusField(`it-name-${blank}`)
      else addItem()
      return
    }

    if (target.kind === 'profile') {
      if (target.append) {
        const cur = approved.approvedProfile.description || ''
        if (!cur.includes(prefix)) updateProfile('description', cur ? `${cur.trimEnd()}\n${prefix}` : prefix)
      }
      focusField(PROFILE_FIELD_IDS[target.field])
    } else {
      if (target.append) {
        const cur = approved.approvedCatalogue[target.index]?.description || ''
        if (!cur.includes(prefix)) updateCatalogueItem(target.index, 'description', cur ? `${cur.trimEnd()}\n${prefix}` : prefix)
      }
      focusField(`${ITEM_FIELD_IDS[target.field]}-${target.index}`)
    }
  }

  // A question counts as answered when its target field has a value (free-text ones: once something follows the label)
  function isAnswered(q) {
    const target = resolveQuestion(q, approved.approvedCatalogue)
    if (target.kind === 'addItem') return approved.approvedCatalogue.some(hasContent)
    const value = target.kind === 'profile'
      ? approved.approvedProfile[target.field]
      : approved.approvedCatalogue[target.index]?.[target.field]
    if (!target.append) return Boolean(value && String(value).trim())
    const prefix = answerPrefix(q)
    const at = (value || '').indexOf(prefix)
    return at >= 0 && (value || '').slice(at + prefix.length).split('\n')[0].trim().length > 0
  }

  // Block saving while any price isn't a number; jump to the first one
  function checkPrices() {
    const bad = approved.approvedCatalogue.findIndex(item => hasContent(item) && priceError(item))
    if (bad < 0) return true
    setError(`Item ${bad + 1}: ${priceError(approved.approvedCatalogue[bad])}`)
    focusField(`it-price-${bad}`)
    return false
  }

  function afterSave(res) {
    setSaved(true)
    setDirty(false)
    if (res.business) setPendingLive(Boolean(res.business.hasUnpublishedChanges))
  }

  async function handleSave() {
    setError('')
    if (!checkPrices()) return
    setSaving(true)
    try {
      const res = await updateBusiness(businessId, toPayload(approved))
      if (res.ok) afterSave(res)
      else setError(res.message || 'Save failed. Please try again.')
    } catch {
      setError('Network error — your changes were not saved.')
    }
    setSaving(false)
  }

  async function handlePreviewPublish() {
    // Save first, then show preview
    setError('')
    if (!checkPrices()) return
    setSaving(true)
    try {
      const saveRes = await updateBusiness(businessId, toPayload(approved))
      setSaving(false)
      if (!saveRes.ok) {
        setError(saveRes.message || 'Save failed before preview.')
        return
      }
      afterSave(saveRes)
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
        setPendingLive(false)
        onPublished(pubRes.slug || business.slug, approved.approvedProfile.businessName || business.name)
      } else {
        setError(pubRes.message || 'Publish failed. Please fill in required fields.')
        setShowPreview(false)
      }
    } catch {
      setPublishing(false)
      setShowPreview(false)
      setError('Network error — your business page was not published.')
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
        <h2>We couldn't open this business page</h2>
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
  const answeredCount = missingQuestions.filter(q => isAnswered(q)).length
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
    catalogue:    catalogue.filter(i => i.publicVisible && hasContent(i))
  }

  return (
    <div className="review">
      {/* ---------- Preview overlay ---------- */}
      {showPreview && (
        <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Business page preview">
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
                {publishing ? 'Publishing…' : isLive ? 'Update live business page' : 'Publish business page'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Header ---------- */}
      <header className="page-head">
        <div>
          <p className="eyebrow eyebrow--coral">Step 2 · Review</p>
          <h1 className="h-page">Here's your business page draft</h1>
          <p className="lede">
            Bizdwaar organised what you shared. Check each detail, fill any gaps and choose what customers
            see — only what you confirm here is published.
          </p>
        </div>
        <div className="state-badge" aria-live="polite">
          {!isLive && <span className="status-pill status-pill--draft">Draft · not public yet</span>}
          {isLive && !pendingLive && !dirty && <span className="status-pill status-pill--published">Live · up to date</span>}
          {isLive && (pendingLive || dirty) && (
            <span className="status-pill status-pill--pending">Live · changes not published yet</span>
          )}
          <small>
            {isLive
              ? 'Customers see your last published version until you publish again.'
              : 'Nothing here is public until you publish.'}
          </small>
        </div>
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
              <div className="empty-inline empty-inline--action">
                <p>
                  <strong>No products or services yet.</strong> Bizdwaar didn't find any in your description —
                  add them here. Without any, your business page shows your profile and enquiry form only.
                </p>
                <button type="button" className="btn btn--primary btn--sm" onClick={addItem}>+ Add a product or service</button>
              </div>
            )}

            {hasNoVisible && (
              <p className="alert alert--warn">No items are switched on yet — your business page will show your profile only.</p>
            )}

            <div className="item-list">
              {catalogue.map((item, i) => (
                <article key={item._key || i} className={`item-card ${item.publicVisible ? 'is-visible' : ''}`}>
                  <div className="item-card__media">
                    <SmartImage
                      src={itemImageFor(item)}
                      tone={tileToneFor(i)}
                      alt=""
                      className="item-card__img"
                      illustrative
                      initial={(item.name || 'I').charAt(0)}
                    />
                  </div>
                  <div className="item-card__fields">
                    <div className="item-card__top">
                      <span className="item-card__index">
                        Item {i + 1}
                        {item._source === 'owner' && <span className="badge badge--owner">Added by you</span>}
                      </span>
                      <label className="switch-field">
                        <input
                          type="checkbox"
                          checked={item.publicVisible || false}
                          onChange={e => updateCatalogueItem(i, 'publicVisible', e.target.checked)}
                        />
                        <span className="switch" aria-hidden="true" />
                        <span className="switch-field__text">{item.publicVisible ? 'Visible on business page' : 'Hidden'}</span>
                      </label>
                    </div>

                    <div className="field">
                      <label htmlFor={`it-name-${i}`}>Name</label>
                      <input id={`it-name-${i}`} value={item.name || ''} onChange={e => updateCatalogueItem(i, 'name', e.target.value)} maxLength={200} />
                    </div>

                    <div className="field">
                      <label htmlFor={`it-desc-${i}`}>
                        Description {item._source === 'ai' && item.description && <span className="badge badge--ai">AI draft · please check</span>}
                      </label>
                      <textarea id={`it-desc-${i}`} value={item.description || ''} onChange={e => updateCatalogueItem(i, 'description', e.target.value)} rows={2} maxLength={1000} />
                    </div>

                    <div className="field-pair">
                      <div className="field">
                        <label htmlFor={`it-price-${i}`}>
                          Price (₹ INR) {!item.price && <span className="badge badge--missing">Needs your input</span>}
                        </label>
                        <div className={`money-input${!item.price ? ' is-missing' : ''}${priceError(item) ? ' is-invalid' : ''}`}>
                          <span className="money-input__symbol" aria-hidden="true">₹</span>
                          <input
                            id={`it-price-${i}`}
                            inputMode="decimal"
                            autoComplete="off"
                            value={item.price || ''}
                            onChange={e => updateCatalogueItem(i, 'price', e.target.value)}
                            placeholder="e.g. 1299"
                            maxLength={100}
                            aria-invalid={Boolean(priceError(item))}
                            aria-describedby={`it-price-help-${i}`}
                          />
                        </div>
                        <p id={`it-price-help-${i}`} className={`field__help${priceError(item) ? ' field__help--error' : ''}`}>
                          {priceError(item) || priceHint(item)}
                        </p>
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

                    <div className="field">
                      <label htmlFor={`it-avail-${i}`}>
                        Availability <span className="optional">only shown if you choose one</span>
                      </label>
                      <select
                        id={`it-avail-${i}`}
                        value={item.availability || ''}
                        onChange={e => updateCatalogueItem(i, 'availability', e.target.value)}
                      >
                        {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <button type="button" className="btn btn--text item-card__remove" onClick={() => removeItem(i)}>
                      Remove this item
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {catalogue.length > 0 && (
              <>
                <button type="button" className="add-item" onClick={addItem}>+ Add another product or service</button>
                <p className="field__help">A photo appears only when an item's name clearly matches one of our illustrative images (always labelled as such); otherwise a colour tile with its initial is shown. Uploading your own photos is planned.</p>
              </>
            )}
          </section>
        </div>

        {/* ---------- Side column ---------- */}
        <aside className="review__aside">
          {missingQuestions.length > 0 && (
            <section className="note-card note-card--mango">
              <span className="badge badge--missing">Missing information</span>
              <h3>Bizdwaar needs a few answers</h3>
              <p>
                These weren't in your description, so we left them blank instead of guessing.
                Tap <strong>Answer</strong> to jump to the right field. Skip any that don't apply.
              </p>
              <p className="question-progress">
                <strong>{answeredCount}</strong> of {missingQuestions.length} answered
              </p>
              <ul className="question-list">
                {missingQuestions.map((q, i) => {
                  const done = isAnswered(q)
                  return (
                    <li key={i} className={done ? 'is-answered' : ''}>
                      <span className="question-list__field">{done ? '✓ Answered' : answerPrefix(q).replace(/:\s*$/, '')}</span>
                      <span className="question-list__text">{q.question}</span>
                      <button type="button" className="question-list__btn" onClick={() => answerQuestion(q)}>
                        {done ? 'Edit answer' : 'Answer →'}
                      </button>
                    </li>
                  )
                })}
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
          {!error && saved && (
            <span className="action-bar__ok">
              {isLive && pendingLive ? '✓ Saved — not live yet. Preview & update to publish these changes.' : '✓ Saved'}
            </span>
          )}
          {!error && !saved && (
            <span>{dirty ? 'You have unsaved changes.' : 'Changes are saved when you click Save or Preview.'}</span>
          )}
        </div>
        <div className="action-bar__buttons">
          <button type="button" onClick={handleSave} disabled={saving} className="btn btn--ghost">
            {saving ? 'Saving…' : isLive ? 'Save changes' : 'Save draft'}
          </button>
          <button type="button" onClick={handlePreviewPublish} disabled={publishing || saving} className="btn btn--primary">
            {saving ? 'Saving…' : isLive ? 'Preview & update live →' : 'Preview & publish →'}
          </button>
        </div>
      </div>
    </div>
  )
}
