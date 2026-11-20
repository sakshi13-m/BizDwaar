import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import OwnerLogin from './pages/OwnerLogin'
import OwnerSignIn from './pages/OwnerSignIn'
import AdminPanel from './pages/AdminPanel'
import Onboarding from './pages/Onboarding'
import OwnerReview from './pages/OwnerReview'
import OwnerInbox from './pages/OwnerInbox'
import PublicStorefront from './pages/PublicStorefront'
import EnquiryForm from './pages/EnquiryForm'
import { Logo, LogoMark } from './components/Brand'
import { startSession, listMyBusinesses, getMe, logout } from './api/owner'
import './styles/App.css'

// -------------------------------------------------------
// Router
// -------------------------------------------------------
function parsePath(pathname) {
  // /s/:slug
  const storefront = pathname.match(/^\/s\/([^/]+)\/?$/)
  if (storefront) return { route: 'storefront', slug: storefront[1] }

  // /enquiry/:slug
  const enquiry = pathname.match(/^\/enquiry\/([^/]+)\/?$/)
  if (enquiry) return { route: 'enquiry', slug: enquiry[1] }

  // /owner
  if (pathname === '/owner' || pathname.startsWith('/owner/')) return { route: 'owner' }

  // / or anything else → landing
  return { route: 'landing' }
}

function useRoute() {
  const [location, setLocation] = useState(() => parsePath(window.location.pathname))

  useEffect(() => {
    function onPop() {
      setLocation(parsePath(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return location
}

// -------------------------------------------------------
// Owner workspace chrome
// -------------------------------------------------------
const STEPS = [
  { key: 'onboarding', label: 'Describe' },
  { key: 'review', label: 'Review' },
  { key: 'published', label: 'Publish' }
]

function Stepper({ step }) {
  const current = STEPS.findIndex(s => s.key === (step === 'inbox' ? 'published' : step))
  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo'
        return (
          <li key={s.key} className={`stepper__item is-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="stepper__dot">{state === 'done' ? '✓' : i + 1}</span>
            <span className="stepper__label">{s.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function OwnerShell({ step, showStepper = true, account, children }) {
  return (
    <div className="workspace">
      <nav className="workspace-nav">
        <Logo />
        {showStepper && <Stepper step={step} />}
        <div className="workspace-nav__account">
          {account?.isAdminMode ? (
            <span className="workspace-nav__tag">Administrator</span>
          ) : account?.email ? (
            <>
              <span className="workspace-nav__email" title={account.email}>{account.email}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={account.onLogout}>Log out</button>
            </>
          ) : account?.onSignIn ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={account.onSignIn}>Log in</button>
          ) : (
            <span className="workspace-nav__tag">Owner workspace</span>
          )}
        </div>
      </nav>
      <main className="workspace-main">{children}</main>
    </div>
  )
}

// Business pages this owner can manage (their account's pages, or ones started in this browser)
function MyStorefronts({ businesses, onOpen, loggedIn, onSignIn }) {
  if (!businesses || businesses.length === 0) return null
  return (
    <section className="my-stores">
      <div className="my-stores__head">
        <h2>Welcome back</h2>
        <p>Continue with one of your business pages, or create a new one below.</p>
      </div>
      <div className="my-stores__list">
        {businesses.map(b => (
          <button key={b.id} type="button" className="store-tile" onClick={() => onOpen(b)}>
            <span className="sf-monogram">{(b.name || '?').charAt(0).toUpperCase()}</span>
            <span className="store-tile__name">{b.name}</span>
            <span className={`status-pill status-pill--${b.status}`}>
              {b.status === 'published' ? 'Live' : 'Draft'}
            </span>
          </button>
        ))}
      </div>
      {loggedIn ? (
        <p className="my-stores__note">Saved to your account — log in with the same email to manage them from any device.</p>
      ) : (
        <p className="my-stores__note">
          These are saved in this browser only.{' '}
          <button type="button" className="btn btn--text btn--inline" onClick={onSignIn}>Log in with your email</button>{' '}
          to keep them safe and manage them from any device.
        </p>
      )}
    </section>
  )
}

// Prompt shown after publishing when the owner hasn't logged in yet
function KeepAccessCard({ name, onSignIn }) {
  return (
    <div className="keep-access">
      <div>
        <strong>Keep access from any device</strong>
        <p>
          Right now {name || 'your business page'} can only be managed from this browser. Log in with your
          email to edit it and read enquiries from any phone or computer.
        </p>
      </div>
      <button type="button" className="btn btn--mango" onClick={onSignIn}>Log in with email</button>
    </div>
  )
}

// -------------------------------------------------------
// Owner flow state machine
// -------------------------------------------------------
function OwnerFlow() {
  // Admin token screen is only reachable at /owner/admin; regular visitors start at onboarding
  const isAdminPath = window.location.pathname.replace(/\/+$/, '') === '/owner/admin'
  const wantsSignIn = new URLSearchParams(window.location.search).has('login')
  const [step, setStep] = useState(isAdminPath ? 'login' : wantsSignIn ? 'signin' : 'onboarding')
  const [returnStep, setReturnStep] = useState('onboarding')
  const [adminMode, setAdminMode] = useState(false)
  const [businessId, setBusinessId] = useState(null)
  const [publishedSlug, setPublishedSlug] = useState(null)
  const [publishedBusinessId, setPublishedBusinessId] = useState(null)
  const [publishedName, setPublishedName] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const [session, setSession] = useState('starting') // 'starting' | 'ready' | 'error'
  const [sessionError, setSessionError] = useState('')
  const [myBusinesses, setMyBusinesses] = useState([])
  const [me, setMe] = useState({ loggedIn: false, email: null, isAdmin: false })

  async function refreshOwner() {
    const [who, list] = await Promise.all([getMe(), listMyBusinesses()])
    if (who.ok) setMe({ loggedIn: who.loggedIn, email: who.email, isAdmin: who.isAdmin })
    setMyBusinesses(list.ok ? (list.businesses || []) : [])
    return who
  }

  async function initSession() {
    setSession('starting')
    setSessionError('')
    try {
      const res = await startSession()
      if (!res.ok) throw new Error(res.message || 'Could not start your session.')
      const who = await refreshOwner()
      // Returning admin (cookie still valid) skips the token screen
      if (isAdminPath && who.isAdmin) { setAdminMode(true); setStep('admin') }
      setSession('ready')
    } catch (err) {
      setSessionError(err.message || 'Network error — could not start your session.')
      setSession('error')
    }
  }

  useEffect(() => { initSession() }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [step])

  function openExisting(b) {
    setBusinessId(b.id)
    if (b.status === 'published') {
      setPublishedSlug(b.slug)
      setPublishedBusinessId(b.id)
      setPublishedName(b.name)
      setStep('published')
    } else {
      setStep('review')
    }
  }

  function startNew() {
    setStep('onboarding')
    setBusinessId(null)
    setPublishedSlug(null)
    setPublishedBusinessId(null)
    setPublishedName('')
    // Refresh the list so the page just published shows under "Welcome back"
    listMyBusinesses().then(list => { if (list.ok) setMyBusinesses(list.businesses || []) }).catch(() => {})
  }

  function goSignIn() {
    setReturnStep(step === 'signin' ? 'onboarding' : step)
    setStep('signin')
  }

  async function handleSignedIn() {
    await refreshOwner().catch(() => {})
    setStep(returnStep || 'onboarding')
  }

  async function handleLogout() {
    const msg = adminMode
      ? 'Log out of the administrator view?'
      : 'Log out on this device? Any unsaved changes will be lost. You can log back in with your email.'
    if (!window.confirm(msg)) return
    await logout().catch(() => {})
    setAdminMode(false)
    setMe({ loggedIn: false, email: null, isAdmin: false })
    setBusinessId(null)
    setPublishedSlug(null)
    setPublishedBusinessId(null)
    setPublishedName('')
    setStep(isAdminPath ? 'login' : 'onboarding')
    initSession()
  }

  function copyLink(url) {
    const done = () => {
      setCopyFeedback('Link copied')
      setTimeout(() => setCopyFeedback(''), 2000)
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(done)
    } else {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      done()
    }
  }

  const account = {
    email: me.loggedIn ? me.email : null,
    isAdminMode: adminMode,
    onSignIn: goSignIn,
    onLogout: handleLogout
  }

  if (step === 'login') {
    return (
      <OwnerShell step="onboarding" showStepper={false}>
        <OwnerLogin onLogin={() => { setAdminMode(true); setStep('admin') }} />
      </OwnerShell>
    )
  }

  if (step === 'admin') {
    return (
      <OwnerShell step="onboarding" showStepper={false} account={account}>
        <AdminPanel
          onOpen={(b) => { setBusinessId(b.id); setPublishedSlug(b.slug); setPublishedBusinessId(b.id); setPublishedName(b.name); setStep('review') }}
          onInbox={(b) => { setPublishedSlug(b.slug); setPublishedBusinessId(b.id); setPublishedName(b.name); setStep('inbox') }}
          onLogout={handleLogout}
        />
      </OwnerShell>
    )
  }

  if (step === 'signin') {
    return (
      <OwnerShell step="onboarding" showStepper={false}>
        <OwnerSignIn onSignedIn={handleSignedIn} onCancel={() => setStep(returnStep || 'onboarding')} />
      </OwnerShell>
    )
  }

  if (step === 'onboarding') {
    return (
      <OwnerShell step="onboarding" account={account}>
        {session === 'starting' && (
          <div className="state-panel">
            <span className="spinner" aria-hidden="true" />
            <p>Opening your workspace…</p>
          </div>
        )}
        {session === 'error' && (
          <div className="state-panel state-panel--error">
            <h2>We couldn't open your workspace</h2>
            <p>{sessionError}</p>
            <button type="button" className="btn btn--primary" onClick={initSession}>Try again</button>
          </div>
        )}
        {session === 'ready' && (
          <>
            {!me.loggedIn && myBusinesses.length === 0 && (
              <p className="returning-note">
                Already have a business page?{' '}
                <button type="button" className="btn btn--text btn--inline" onClick={goSignIn}>Log in with your email</button>
              </p>
            )}
            <MyStorefronts businesses={myBusinesses} onOpen={openExisting} loggedIn={me.loggedIn} onSignIn={goSignIn} />
            <Onboarding
              onCreated={(id) => {
                setBusinessId(id)
                setStep('review')
              }}
            />
          </>
        )}
      </OwnerShell>
    )
  }

  if (step === 'review') {
    return (
      <OwnerShell step="review" showStepper={!adminMode} account={account}>
        {adminMode && (
          <button type="button" className="btn btn--text" onClick={() => setStep('admin')}>← All business pages</button>
        )}
        <OwnerReview
          businessId={businessId}
          onPublished={(slug, name) => {
            setPublishedSlug(slug)
            setPublishedBusinessId(businessId)
            setPublishedName(name || '')
            setStep(adminMode ? 'admin' : 'published')
          }}
        />
      </OwnerShell>
    )
  }

  if (step === 'inbox') {
    return (
      <OwnerShell step="inbox" showStepper={!adminMode} account={account}>
        <OwnerInbox
          businessId={publishedBusinessId}
          businessName={publishedName || publishedSlug}
          storefrontUrl={`${window.location.origin}/s/${publishedSlug}`}
          onBack={() => setStep(adminMode ? 'admin' : 'published')}
        />
      </OwnerShell>
    )
  }

  if (step === 'published') {
    const url = `${window.location.origin}/s/${publishedSlug}`
    return (
      <OwnerShell step="published" account={account}>
        <section className="published">
          <div className="published__art" aria-hidden="true">
            <div className="published__arch"><LogoMark size={56} /></div>
          </div>
          <div className="published__body">
            <p className="eyebrow eyebrow--coral">You're live</p>
            <h1 className="display display--md">
              {publishedName ? <>{publishedName} is open for business.</> : <>Your business page is live.</>}
            </h1>
            <p className="lede">Share this link anywhere your customers already are — chats, social profiles, product labels.</p>

            <div className="link-box">
              <a href={url} target="_blank" rel="noreferrer" className="link-box__url">{url.replace(/^https?:\/\//, '')}</a>
              <button type="button" className="btn btn--dark btn--sm" onClick={() => copyLink(url)}>
                {copyFeedback || 'Copy link'}
              </button>
            </div>

            {!me.loggedIn && <KeepAccessCard name={publishedName} onSignIn={goSignIn} />}

            <div className="published__actions">
              <a href={url} target="_blank" rel="noreferrer" className="btn btn--primary">View my business page</a>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('inbox')}>View enquiries</button>
              <button type="button" className="btn btn--ghost" onClick={() => { setBusinessId(publishedBusinessId); setStep('review') }}>
                Edit business page
              </button>
              <button type="button" className="btn btn--text" onClick={startNew}>Create another business page</button>
            </div>
          </div>
        </section>
      </OwnerShell>
    )
  }

  return null
}

// -------------------------------------------------------
// App — top-level router
// -------------------------------------------------------
export default function App() {
  const { route, slug } = useRoute()

  if (route === 'storefront') return <PublicStorefront slug={slug} />
  if (route === 'enquiry')    return <EnquiryForm businessSlug={slug} />
  if (route === 'owner')      return <OwnerFlow />
  return <LandingPage />
}
