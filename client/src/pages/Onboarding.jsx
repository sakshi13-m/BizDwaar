import { useState, useEffect, useRef } from 'react'
import { createBusiness } from '../api/owner'
import { DEMO_ONBOARDING } from '../lib/demoData'

const STORY_STARTERS = [
  'I make ',
  'My customers are ',
  'I sell through ',
  'What makes my work special is '
]

const ORGANISING_MESSAGES = [
  'Reading your description…',
  'Finding your products and services…',
  'Checking for details that are missing…',
  'Preparing your draft for review…'
]

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
  const [msgIndex, setMsgIndex] = useState(0)
  const storyRef = useRef(null)

  // Rotate status text while the real analysis request is in flight
  useEffect(() => {
    if (!loading) return
    setMsgIndex(0)
    const t = setInterval(() => setMsgIndex(i => Math.min(i + 1, ORGANISING_MESSAGES.length - 1)), 2600)
    return () => clearInterval(t)
  }, [loading])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function addStarter(starter) {
    setForm(f => {
      const sep = f.description && !/\s$/.test(f.description) ? ' ' : ''
      return { ...f, description: f.description + sep + starter }
    })
    requestAnimationFrame(() => {
      const el = storyRef.current
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await createBusiness(form)
      setLoading(false)
      if (res.ok) {
        onCreated(res.businessId)
      } else {
        setError(res.message || 'Something went wrong. Please try again.')
      }
    } catch {
      setLoading(false)
      setError('Network error — please check your connection and try again.')
    }
  }

  const descLen = form.description.trim().length

  return (
    <div className="onboarding">
      {loading && (
        <div className="organising" role="status" aria-live="polite">
          <div className="organising__card">
            <div className="organising__orb" aria-hidden="true"><span /><span /><span /></div>
            <h2>Bizdwaar is organising your business</h2>
            <p className="organising__msg">{ORGANISING_MESSAGES[msgIndex]}</p>
            <p className="organising__note">This usually takes a few seconds. Nothing is published yet.</p>
          </div>
        </div>
      )}

      <header className="page-head">
        <div>
          <p className="eyebrow eyebrow--coral">Step 1 · Describe</p>
          <h1 className="h-page">Tell us about your business</h1>
          <p className="lede">
            Write the way you'd explain it to a new customer. Bizdwaar organises it into a business page
            draft — you'll review every detail before anything goes live.
          </p>
        </div>
        <button type="button" className="sample-btn" onClick={() => setForm(DEMO_ONBOARDING)}>
          <span className="sample-btn__label">Just exploring?</span>
          <span className="sample-btn__action">Fill in a sample business →</span>
        </button>
      </header>

      <div className="onboarding__layout">
        <form onSubmit={handleSubmit} className="onboarding__form">
          {/* Section 1 */}
          <fieldset className="form-section">
            <legend className="form-section__head">
              <span className="form-section__num">1</span>
              <span>
                <strong>The basics</strong>
                <small>How customers will recognise and find you.</small>
              </span>
            </legend>

            <div className="field">
              <label htmlFor="businessName">Business name <span className="req">*</span></label>
              <input
                id="businessName"
                value={form.businessName}
                onChange={e => update('businessName', e.target.value)}
                placeholder="e.g. Sara's Studio"
                maxLength={200}
                required
              />
            </div>

            <div className="field-pair">
              <div className="field">
                <label htmlFor="businessType">Type of business</label>
                <input
                  id="businessType"
                  value={form.businessType}
                  onChange={e => update('businessType', e.target.value)}
                  placeholder="e.g. Handmade crafts, Home food, Boutique"
                  maxLength={200}
                />
                <p className="field__help">Helps us suggest a category.</p>
              </div>
              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  value={form.location}
                  onChange={e => update('location', e.target.value)}
                  placeholder="e.g. Jaipur, Rajasthan"
                  maxLength={200}
                />
                <p className="field__help">Local customers search by area.</p>
              </div>
            </div>
          </fieldset>

          {/* Section 2 */}
          <fieldset className="form-section">
            <legend className="form-section__head">
              <span className="form-section__num">2</span>
              <span>
                <strong>Your story</strong>
                <small>What you do, who you serve, and what makes it yours.</small>
              </span>
            </legend>

            <div className="field">
              <label htmlFor="description">Describe your business <span className="req">*</span></label>
              <div className="chips" aria-label="Sentence starters">
                {STORY_STARTERS.map(s => (
                  <button key={s} type="button" className="chip" onClick={() => addStarter(s)}>
                    + {s.trim()}…
                  </button>
                ))}
              </div>
              <textarea
                id="description"
                ref={storyRef}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="I make hand-poured candles and block-print dupattas in my home studio. My customers are mostly people buying gifts…"
                rows={6}
                minLength={10}
                maxLength={2000}
                required
              />
              <p className="field__help field__help--split">
                <span>Plain language is perfect. Any language mix is fine.</span>
                <span className={descLen > 0 && descLen < 10 ? 'is-warn' : ''}>{form.description.length}/2000</span>
              </p>
            </div>
          </fieldset>

          {/* Section 3 */}
          <fieldset className="form-section">
            <legend className="form-section__head">
              <span className="form-section__num">3</span>
              <span>
                <strong>What you sell</strong>
                <small>Products or services — one per line works best.</small>
              </span>
            </legend>

            <div className="field">
              <label htmlFor="productsRaw">Your products or services</label>
              <textarea
                id="productsRaw"
                value={form.productsRaw}
                onChange={e => update('productsRaw', e.target.value)}
                placeholder={'Hand-poured jar candle — 200g, ₹350\nPainted terracotta planter — 6 inch, ₹450'}
                rows={4}
                maxLength={2000}
              />
              <p className="field__help">
                Include prices and sizes if you know them. If you leave something out, we'll ask —
                we never guess.
              </p>
            </div>
          </fieldset>

          {error && <p className="alert alert--error" role="alert">{error}</p>}

          <div className="form-submit">
            <button type="submit" disabled={loading} className="btn btn--primary btn--lg">
              {loading ? 'Organising your information…' : 'Organise with Bizdwaar →'}
            </button>
            <p>Next: review the draft. Nothing is public until you publish.</p>
          </div>
        </form>

        <aside className="onboarding__aside">
          <div className="aside-card aside-card--teal">
            <h3>What happens next</h3>
            <ol className="mini-steps">
              <li><strong>AI organises</strong> your words into a profile and catalogue.</li>
              <li><strong>You review</strong> — fix anything, fill gaps, choose what to show.</li>
              <li><strong>You publish</strong> and get a link to share.</li>
            </ol>
          </div>
          <div className="aside-card aside-card--ivory">
            <h3>Why we ask</h3>
            <p>
              Customers decide faster when they can see what you sell, where you are and how to
              reach you. The more you share here, the less you'll need to fill in later.
            </p>
          </div>
          <div className="aside-card aside-card--mango">
            <h3>Our promise</h3>
            <p>Bizdwaar never invents prices, sizes, ingredients or certifications. Missing details become questions for you.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
