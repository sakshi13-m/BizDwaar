import { useState } from 'react'
import { requestLoginCode, verifyLoginCode } from '../api/owner'

/**
 * Owner email login with a one-time code.
 * Step 1: email → we send a 6-digit code. Step 2: code → logged in on this device.
 * Pages created in this browser before logging in are attached to the account.
 */
export default function OwnerSignIn({ onSignedIn, onCancel }) {
  const [step, setStep] = useState('email') // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function sendCode(e) {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await requestLoginCode(email)
      if (res.ok) {
        setNotice(res.message)
        setCode('')
        setStep('code')
      } else {
        setError(res.message || 'Could not send the code. Please try again.')
      }
    } catch {
      setError('Network error — please check your connection and try again.')
    }
    setBusy(false)
  }

  async function verify(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await verifyLoginCode(email, code)
      if (res.ok) {
        onSignedIn(res)
        return
      }
      setError(res.message || 'That code did not work. Please try again.')
    } catch {
      setError('Network error — please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="state-panel signin">
      <p className="eyebrow eyebrow--coral">Owner login</p>
      <h1 className="h-page">{step === 'email' ? 'Log in with your email' : 'Enter your code'}</h1>

      {step === 'email' ? (
        <>
          <p>
            We'll email you a 6-digit code — no password to remember. Logging in keeps your business page
            and enquiries safe, and lets you manage them from any phone or computer.
          </p>
          <form onSubmit={sendCode} className="admin-form">
            <div className="field">
              <label htmlFor="signin-email">Email address</label>
              <input
                id="signin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={254}
                required
                autoFocus
              />
            </div>
            {error && <p className="alert alert--error" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn--primary btn--block">
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p aria-live="polite">{notice}</p>
          <form onSubmit={verify} className="admin-form">
            <div className="field">
              <label htmlFor="signin-code">6-digit code</label>
              <input
                id="signin-code"
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                required
                autoFocus
              />
              <p className="field__help">Check your inbox (and spam folder). The code expires in 10 minutes.</p>
            </div>
            {error && <p className="alert alert--error" role="alert">{error}</p>}
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn--primary btn--block">
              {busy ? 'Checking…' : 'Log in'}
            </button>
          </form>
          <div className="signin__links">
            <button type="button" className="btn btn--text" disabled={busy} onClick={() => sendCode()}>Send a new code</button>
            <button type="button" className="btn btn--text" onClick={() => { setStep('email'); setError('') }}>Use a different email</button>
          </div>
        </>
      )}

      {onCancel && (
        <button type="button" className="btn btn--text signin__cancel" onClick={onCancel}>← Back</button>
      )}
    </div>
  )
}
