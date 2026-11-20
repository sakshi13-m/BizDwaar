import { useState, useEffect } from 'react'
import { getEnquiries, updateEnquiryStatus } from '../api/owner'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'replied', label: 'Replied' },
  { key: 'closed', label: 'Closed' }
]

const STATUS_LABEL = { new: 'New', replied: 'Replied', closed: 'Closed' }

export default function OwnerInbox({ businessId, businessName, storefrontUrl, onBack }) {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [updating, setUpdating] = useState(null)   // enquiry id being updated
  const [actionError, setActionError] = useState('')

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

  async function setStatus(enq, status) {
    setActionError('')
    setUpdating(enq.id)
    try {
      const res = await updateEnquiryStatus(businessId, enq.id, status)
      if (res.ok) {
        setEnquiries(list => list.map(e => (e.id === enq.id ? { ...e, status: res.enquiry.status } : e)))
      } else {
        setActionError(res.message || 'Could not update the enquiry.')
      }
    } catch {
      setActionError('Network error — the enquiry was not updated.')
    }
    setUpdating(null)
  }

  const counts = enquiries.reduce((acc, e) => {
    const s = e.status || 'new'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, { all: enquiries.length })
  const shown = filter === 'all' ? enquiries : enquiries.filter(e => (e.status || 'new') === filter)

  return (
    <div className="inbox">
      <button type="button" className="btn btn--text" onClick={onBack}>← Back to storefront settings</button>

      <header className="page-head">
        <div>
          <p className="eyebrow eyebrow--coral">Inbox</p>
          <h1 className="h-page">Customer enquiries</h1>
          {businessName && <p className="lede">Messages sent to {businessName} from your storefront. They're private and never shown publicly.</p>}
        </div>
        {!loading && !error && (counts.new || 0) > 0 && (
          <span className="status-pill status-pill--draft">{counts.new} new</span>
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

      {!loading && !error && enquiries.length > 0 && (
        <>
          <div className="filter-tabs" role="tablist" aria-label="Filter enquiries">
            {FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={`filter-tab ${filter === f.key ? 'is-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} <span className="filter-tab__count">{counts[f.key] || 0}</span>
              </button>
            ))}
          </div>

          {actionError && <p className="alert alert--error" role="alert">{actionError}</p>}

          {shown.length === 0 && (
            <div className="empty-inline"><p>No {filter} enquiries.</p></div>
          )}

          <div className="inbox-list">
            {shown.map(enq => {
              const status = enq.status || 'new'
              const busy = updating === enq.id
              return (
                <article key={enq.id} className={`message-card message-card--${status}`}>
                  <div className="message-card__head">
                    <span className="sf-monogram">{(enq.customerName || '?').charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{enq.customerName}</strong>
                      <span className="message-card__date">{formatDate(enq.createdAt)}</span>
                    </div>
                    <span className={`enq-status enq-status--${status}`}>{STATUS_LABEL[status]}</span>
                  </div>

                  <p className="message-card__product">
                    <span>Interested in</span> {enq.productName || 'General enquiry'}
                  </p>

                  <p className="message-card__body">{enq.message}</p>

                  {(enq.customerEmail || enq.customerPhone) ? (
                    <div className="message-card__contact">
                      {enq.customerEmail && <a className="btn btn--ghost btn--sm" href={`mailto:${enq.customerEmail}`}>Reply by email</a>}
                      {enq.customerPhone && <a className="btn btn--ghost btn--sm" href={`tel:${enq.customerPhone}`}>Call {enq.customerPhone}</a>}
                    </div>
                  ) : (
                    <p className="field__help">No contact details were shared with this enquiry.</p>
                  )}

                  <div className="message-card__actions">
                    {status !== 'replied' && status !== 'closed' && (
                      <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => setStatus(enq, 'replied')}>
                        Mark as replied
                      </button>
                    )}
                    {status !== 'closed' && (
                      <button type="button" className="btn btn--text" disabled={busy} onClick={() => setStatus(enq, 'closed')}>
                        Close
                      </button>
                    )}
                    {status !== 'new' && (
                      <button type="button" className="btn btn--text" disabled={busy} onClick={() => setStatus(enq, 'new')}>
                        Mark as new
                      </button>
                    )}
                    {busy && <span className="field__help">Saving…</span>}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
