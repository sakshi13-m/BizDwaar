import { useState } from 'react'
import { login } from '../api/owner'

export default function OwnerLogin({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login(token)
    setLoading(false)
    if (res.ok) {
      onLogin()
    } else {
      setError(res.message || 'Invalid token.')
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1 className="brand">Bizdwaar</h1>
        <p className="subtitle">Owner access</p>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="token">Access token</label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Enter your owner token"
            required
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
