import { useState, useEffect } from 'react'
import '../styles/Storefront.css'

export default function PublicStorefront({ slug }) {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/businesses/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setBusiness(data.business)
        } else {
          setError(data.message || 'Business not found.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load business.')
        setLoading(false)
      })
  }, [slug])

  if (loading) return <div className="storefront-page"><p className="hint">Loading…</p></div>
  if (error) return <div className="storefront-page"><p className="error">{error}</p></div>
  if (!business) return <div className="storefront-page"><p className="error">Business not found.</p></div>

  return (
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

      {business.catalogue && business.catalogue.length > 0 && (
        <div className="storefront-section">
          <h2 className="section-title">Our offerings</h2>
          <div className="catalogue-grid">
            {business.catalogue.map((item, i) => (
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
        <p className="hint">Have a question? Send us an enquiry.</p>
        {business.contactEmail && <p>📧 {business.contactEmail}</p>}
        {business.contactPhone && <p>📞 {business.contactPhone}</p>}
        <a href={`/enquiry/${slug}`} className="btn-primary enquiry-btn">Send enquiry</a>
      </div>

      <footer className="storefront-footer">
        <p className="footer-brand">Powered by <strong>Bizdwaar</strong></p>
      </footer>
    </div>
  )
}
