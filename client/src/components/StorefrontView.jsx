import SmartImage from './SmartImage'
import { LogoMark } from './Brand'
import { heroImageFor, itemImageFor, tileToneFor } from '../lib/imagery'
import { formatPrice, PRICE_ON_REQUEST } from '../../../shared/price.js'
import '../styles/Storefront.css'

/**
 * Renders a business storefront from owner-approved data only.
 *
 * business: { name, description, category, location, contactEmail, contactPhone, catalogue[] }
 * mode:     'live'    — real public page (enquiry button navigates)
 *           'preview' — owner preview before publishing (enquiry button inert)
 *           'sample'  — fictional homepage example (enquiry button inert)
 */
export default function StorefrontView({ business, mode = 'live', onEnquire }) {
  const interactive = mode === 'live'
  const catalogue = business.catalogue || []
  const initial = (business.name || '?').trim().charAt(0).toUpperCase()

  function EnquireButton({ variant = 'primary', children = 'Send an enquiry' }) {
    if (!interactive) {
      return (
        <span className={`btn btn--${variant} is-inert`} aria-disabled="true"
          title={mode === 'preview' ? 'Customers will use this button to contact you' : 'Example only'}>
          {children}
        </span>
      )
    }
    return (
      <button type="button" className={`btn btn--${variant}`} onClick={() => onEnquire()}>
        {children}
      </button>
    )
  }

  return (
    <div className={`sf sf--${mode}`}>
      {/* Business top bar */}
      <header className="sf-bar">
        <div className="sf-bar__brand">
          <span className="sf-monogram" aria-hidden="true">{initial}</span>
          <span className="sf-bar__name">{business.name}</span>
        </div>
        <EnquireButton variant="small">Enquire</EnquireButton>
      </header>

      {/* Hero */}
      <section className="sf-hero">
        <div className="sf-hero__text">
          {business.category && <p className="eyebrow eyebrow--coral">{business.category}</p>}
          <h1 className="sf-hero__name">{business.name}</h1>
          {business.location && (
            <p className="sf-hero__location">
              <PinIcon /> {business.location}
            </p>
          )}
          <div className="sf-hero__actions">
            <EnquireButton />
            {catalogue.length > 0 && <a className="btn btn--ghost" href="#sf-offerings" onClick={scrollTo('sf-offerings')}>See offerings</a>}
          </div>
        </div>
        <div className="sf-hero__media">
          <SmartImage
            src={heroImageFor(business.category, business.name)}
            alt=""
            className="sf-hero__img arch"
            illustrative
            initial={initial}
          />
          <span className="sf-hero__badge">
            <LogoMark size={18} /> Local business
          </span>
        </div>
      </section>

      {/* Story */}
      {business.description && (
        <section className="sf-story">
          <p className="eyebrow">Our story</p>
          <p className="sf-story__text">{business.description}</p>
        </section>
      )}

      {/* Catalogue */}
      {catalogue.length > 0 && (
        <section className="sf-offerings" id="sf-offerings">
          <div className="sf-section-head">
            <p className="eyebrow eyebrow--teal">Offerings</p>
            <h2>What we make</h2>
          </div>
          <div className="sf-grid">
            {catalogue.map((item, i) => (
              <article key={i} className="product-card">
                <SmartImage
                  src={itemImageFor(item)}
                  tone={tileToneFor(i)}
                  alt=""
                  className="product-card__img"
                  illustrative
                  initial={(item.name || initial).charAt(0)}
                />
                <div className="product-card__body">
                  <h3 className="product-card__name">{item.name || 'Offering'}</h3>
                  {item.description && <p className="product-card__desc">{item.description}</p>}
                  <div className="product-card__meta">
                    {formatPrice(item.price) !== null
                      ? <span className="price-chip" aria-label={`Price ${formatPrice(item.price)}`}>{formatPrice(item.price)}</span>
                      : <span className="price-chip price-chip--ask">{PRICE_ON_REQUEST}</span>}
                    {item.unitOrSize && <span className="size-text">{item.unitOrSize}</span>}
                  </div>
                  {AVAILABILITY[item.availability] && (
                    <span className={`avail avail--${item.availability}`}>{AVAILABILITY[item.availability]}</span>
                  )}
                  {item.attributes?.length > 0 && (
                    <div className="tag-row">
                      {item.attributes.map((a, j) => <span key={j} className="tag">{a}</span>)}
                    </div>
                  )}
                  {interactive && item.name && (
                    <button type="button" className="product-card__ask" onClick={() => onEnquire(item.name)}>
                      Ask about this →
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="sf-contact">
        <div className="sf-contact__inner">
          <div>
            <p className="eyebrow eyebrow--mango">Get in touch</p>
            <h2>Have a question or want to order?</h2>
            <p className="sf-contact__lede">Send {business.name} a message — they'll reply directly.</p>
          </div>
          <div className="sf-contact__details">
            {business.location && <p><PinIcon /> {business.location}</p>}
            {business.contactEmail && (
              <p>
                <MailIcon />{' '}
                {interactive ? <a href={`mailto:${business.contactEmail}`}>{business.contactEmail}</a> : business.contactEmail}
              </p>
            )}
            {business.contactPhone && (
              <p>
                <PhoneIcon />{' '}
                {interactive ? <a href={`tel:${business.contactPhone}`}>{business.contactPhone}</a> : business.contactPhone}
              </p>
            )}
            <EnquireButton variant="mango" />
          </div>
        </div>
      </section>

      <footer className="sf-footer">
        <span>© {new Date().getFullYear()} {business.name}</span>
        <span className="sf-footer__attr">
          Business page made with <LogoMark size={16} /> <strong>Bizdwaar</strong>
        </span>
      </footer>
    </div>
  )
}

// Owner-stated availability labels; anything else (null/unknown) is not shown
const AVAILABILITY = {
  available: 'Available',
  made_to_order: 'Made to order',
  out_of_stock: 'Currently out of stock'
}

function scrollTo(id) {
  return e => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function PinIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="9.5" r="2.5" fill="currentColor" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.6 3h3l1.5 4.5-2 1.3a12 12 0 0 0 6.1 6.1l1.3-2 4.5 1.5v3A2 2 0 0 1 19 19.6 16.6 16.6 0 0 1 4.4 5 2 2 0 0 1 6.6 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
