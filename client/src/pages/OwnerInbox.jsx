import { useState, useEffect } from 'react'
import { getEnquiries } from '../api/owner'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function OwnerInbox({ businessId, businessName, storefrontUrl, onBack }) {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getEnquiries(businessId)
      .then(res => {
        if (res.ok) {
          setEnquiries(res.enquiries || [])
        } else {
          setError(res.message || 'Could not load enquiries.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Network error — could not load enquiries.')
        setLoading(false)
      })
  }, [businessId])

  return (
    <div className="inbox">
      <button type="button" className="btn btn--text" onClick={onBack}>← Back to storefront settings</button>

      <header className="page-head">
        <div>
          <p className="eyebrow eyebrow--coral">Inbox</p>
          <h1 className="h-page">Customer enquiries</h1>
          {businessName && <p className="lede">Messages sent to {businessName} from your storefront.</p>}
        </div>
        {!loading && !error && enquiries.length > 0 && (
          <span className="status-pill status-pill--published">{enquiries.length} message{enquiries.length === 1 ? '' : 's'}</span>
        )}
      </header>

      {loading && (
        <div className="state-panel">
          <span className="spinner" aria-hidden="true" />
          <p>Loading enquiries…</p>
        </div>
      )}

      {error && (
        <div className="state-panel state-panel--error">
          <h2>We couldn't load your inbox</h2>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && enquiries.length === 0 && (
        <div className="inbox-empty">
          <div className="inbox-empty__arch" aria-hidden="true" />
          <h2>No enquiries yet</h2>
          <p>Share your storefront link with customers — their messages will appear here.</p>
          {storefrontUrl && (
            <a className="btn btn--primary" href={storefrontUrl} target="_blank" rel="noreferrer">Open my storefront</a>
          )}
        </div>
      )}

      {!loading && enquiries.length > 0 && (
        <div className="inbox-list">
          {enquiries.map(enq => (
            <article key={enq.id} className="message-card">
              <div className="message-card__head">
                <span className="sf-monogram">{(enq.customerName || '?').charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{enq.customerName}</strong>
                  <span className="message-card__date">{formatDate(enq.createdAt)}</span>
                </div>
              </div>
              <p className="message-card__body">{enq.message}</p>
              {(enq.customerEmail || enq.customerPhone) && (
                <div className="message-card__contact">
                  {enq.customerEmail && <a className="btn btn--ghost btn--sm" href={`mailto:${enq.customerEmail}`}>Reply by email</a>}
                  {enq.customerPhone && <a className="btn btn--ghost btn--sm" href={`tel:${enq.customerPhone}`}>Call {enq.customerPhone}</a>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
