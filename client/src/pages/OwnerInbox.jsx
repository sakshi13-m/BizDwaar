import { useState, useEffect } from 'react'
import { getEnquiries } from '../api/owner'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function OwnerInbox({ businessId, businessName, onBack }) {
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
    <div className="inbox-page">
      <button className="btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={onBack}>
        ← Back to storefront settings
      </button>

      <h2>Enquiries</h2>
      {businessName && <p className="hint" style={{ marginBottom: 0 }}>{businessName}</p>}

      {loading && <p className="hint" style={{ marginTop: '2rem' }}>Loading enquiries…</p>}

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      {!loading && !error && enquiries.length === 0 && (
        <div className="inbox-empty">
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</p>
          <p>No enquiries yet. Share your storefront link to start receiving messages.</p>
        </div>
      )}

      {!loading && enquiries.length > 0 && (
        <div className="inbox-list">
          {enquiries.map(enq => (
            <div key={enq.id} className="enquiry-card">
              <div className="enquiry-card-header">
                <span className="enquiry-customer">{enq.customerName}</span>
                <span className="enquiry-date">{formatDate(enq.createdAt)}</span>
              </div>
              {(enq.customerEmail || enq.customerPhone) && (
                <div className="enquiry-contact">
                  {enq.customerEmail && (
                    <a href={`mailto:${enq.customerEmail}`}>{enq.customerEmail}</a>
                  )}
                  {enq.customerPhone && (
                    <a href={`tel:${enq.customerPhone}`}>{enq.customerPhone}</a>
                  )}
                </div>
              )}
              <p className="enquiry-message">{enq.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
