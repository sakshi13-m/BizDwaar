import { useState, useEffect } from 'react'
import '../styles/App.css'
import '../styles/Storefront.css'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function PublicStorefront({ slug }) {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/businesses/${slug}`)
      .then(res => {
        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (!data) return
        if (data.ok) {
          setBusiness(data.business)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load this storefront. Please try again later.')
        setLoading(false)
      })
  }, [slug])

  // Shared nav bar
  const NavBar = (
    <nav className="storefront-nav">
      <button
        className="storefront-nav-logo"
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        Bizdwaar
      </button>
      <span className="storefront-nav-powered">Powered by <strong>Bizdwaar</strong></span>
    </nav>
  )

  if (loading) {
    return (
      <>
        {NavBar}
        <div className="storefront-page">
          <p className="hint" style={{ marginTop: '3rem', textAlign: 'center' }}>Loading…</p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        {NavBar}
        <div className="storefront-page">
          <div className="storefront-not-found">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button className="btn-secondary" onClick={() => navigate('/')}>Go to Bizdwaar</button>
          </div>
        </div>
      </>
    )
  }

  if (notFound || !business) {
    return (
      <>
        {NavBar}
        <div className="storefront-page">
          <div className="storefront-not-found">
            <h2>Storefront not found</h2>
            <p>This storefront doesn't exist or may have been removed. Double-check the link you were given.</p>
            <button className="btn-secondary" onClick={() => navigate('/')}>Go to Bizdwaar</button>
          </div>
        </div>
      </>
    )
  }

  // Filter to only publicly visible catalogue items (server already filters, but be explicit)
  const visibleCatalogue = (business.catalogue || []).filter(item => item.publicVisible !== false)

  return (
    <>
      {NavBar}
      <div className="storefront-page">
        <div className="storefront-header">
          <h1 className="storefront-name">{business.name}</h1>
          {business.category && <p className="storefront-category">{business.category}</p>}
          {business.location && <p className="storefront-location">📍 {business.location}</p>}
        </div>

        {business.description && (
          <div className="storefront-section">
            <p className="storefront-description">{business.description}</p>
          </div>
        )}

        {visibleCatalogue.length > 0 && (
          <div className="storefront-section">
            <h2 className="section-title">Our offerings</h2>
            <div className="catalogue-grid">
              {visibleCatalogue.map((item, i) => (
                <div key={i} className="catalogue-item">
                  <h3 className="item-name">{item.name || 'Product'}</h3>
                  {item.description && <p className="item-description">{item.description}</p>}
                  <div className="item-details">
                    {item.price && <span className="item-price">{item.price}</span>}
                    {item.unitOrSize && <span className="item-unit">{item.unitOrSize}</span>}
                  </div>
                  {item.attributes && item.attributes.length > 0 && (
                    <div className="item-attributes">
                      {item.attributes.map((attr, j) => (
                        <span key={j} className="attribute-tag">{attr}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="storefront-section storefront-contact">
          <h2 className="section-title">Get in touch</h2>
          <p className="hint">Have a question or want to order? Send an enquiry.</p>
          {business.contactEmail && (
            <p>
              <a href={`mailto:${business.contactEmail}`} className="contact-link">
                {business.contactEmail}
              </a>
            </p>
          )}
          {business.contactPhone && (
            <p>
              <a href={`tel:${business.contactPhone}`} className="contact-link">
                {business.contactPhone}
              </a>
            </p>
          )}
          <a
            href={`/enquiry/${slug}`}
            className="btn-primary enquiry-btn"
            onClick={e => { e.preventDefault(); navigate(`/enquiry/${slug}`) }}
          >
            Send enquiry
          </a>
        </div>

        <footer className="storefront-footer">
          <p className="footer-brand">Powered by <strong>Bizdwaar</strong></p>
        </footer>
      </div>
    </>
  )
}
