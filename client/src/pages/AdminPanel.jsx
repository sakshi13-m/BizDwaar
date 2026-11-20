import { useState, useEffect } from 'react'
import { adminListBusinesses } from '../api/owner'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Administrator overview of every business page (requires the admin cookie).
 * Opening a page uses the normal review / inbox screens; the admin cookie grants access.
 */
export default function AdminPanel({ onOpen, onInbox, onLogout }) {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    adminListBusinesses()
      .then(res => {
        if (res.ok) setBusinesses(res.businesses || [])
        else setError(res.message || 'Could not load business pages.')
        setLoading(false)
      })
      .catch(() => { setError('Network error — could not load business pages.'); setLoading(false) })
  }, [])

  const q = query.trim().toLowerCase()
  const shown = q
    ? businesses.filter(b => [b.name, b.slug, b.ownerEmail].some(v => (v || '').toLowerCase().includes(q)))
    : businesses
  const live = businesses.filter(b => b.status === 'published').length

  return (
    <div className="admin">
      <header className="page-head">
        <div>
          <p className="eyebrow eyebrow--coral">Administrator</p>
          <h1 className="h-page">All business pages</h1>
          <p className="lede">
            {loading ? 'Loading…' : `${businesses.length} ${businesses.length === 1 ? 'page' : 'pages'} · ${live} live. Opening a page lets you edit it or read its enquiries.`}
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onLogout}>Log out</button>
      </header>

      {error && <div className="state-panel state-panel--error"><p>{error}</p></div>}

      {!loading && !error && (
        <>
          <div className="field admin__search">
            <label htmlFor="admin-q">Search</label>
            <input id="admin-q" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, link or owner email" />
          </div>

          {shown.length === 0 ? (
            <div className="empty-inline"><p>No business pages match.</p></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Business page</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Enquiries</th>
                    <th>Updated</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(b => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.name}</strong>
                        <span className="admin-table__slug">/s/{b.slug}</span>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${b.status}`}>{b.status === 'published' ? 'Live' : 'Draft'}</span>
                      </td>
                      <td>
                        {b.ownerEmail || (b.hasBrowserSession ? <span className="admin-table__muted">Browser only</span> : <span className="admin-table__muted">Admin only</span>)}
                      </td>
                      <td>
                        {b.enquiries.total}
                        {b.enquiries.new > 0 && <span className="enq-status enq-status--new">{b.enquiries.new} new</span>}
                      </td>
                      <td>{formatDate(b.updatedAt)}</td>
                      <td className="admin-table__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpen(b)}>Edit</button>
                        <button type="button" className="btn btn--text" onClick={() => onInbox(b)}>Inbox</button>
                        {b.status === 'published' && (
                          <a className="btn btn--text" href={`/s/${b.slug}`} target="_blank" rel="noreferrer">View</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
