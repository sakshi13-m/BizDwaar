import { useState } from 'react'
import { login } from '../api/owner'

// Optional admin fallback — only reachable at /owner/admin, never part of the normal owner journey
export default function OwnerLogin({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(token)
      setLoading(false)
      if (res.ok) {
        onLogin()
      } else {
        setError(res.message || 'Invalid token.')
      }
    } catch {
      setLoading(false)
      setError('Network error — please try again.')
    }
  }

  return (
    <div className="state-panel">
      <p className="eyebrow eyebrow--coral">Administrator</p>
      <h1 className="h-page">Admin access</h1>
      <p>Regular owners don't need this — they can start from the homepage.</p>
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="field">
          <label htmlFor="token">Access token</label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Enter the admin token"
            required
            autoFocus
          />
        </div>
        {error && <p className="alert alert--error" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn--primary btn--block">
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
