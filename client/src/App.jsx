import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import OwnerLogin from './pages/OwnerLogin'
import Onboarding from './pages/Onboarding'
import OwnerReview from './pages/OwnerReview'
import OwnerInbox from './pages/OwnerInbox'
import PublicStorefront from './pages/PublicStorefront'
import EnquiryForm from './pages/EnquiryForm'
import { Logo, LogoMark } from './components/Brand'
import { startSession, listMyBusinesses } from './api/owner'
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

function OwnerShell({ step, showStepper = true, children }) {
  return (
    <div className="workspace">
      <nav className="workspace-nav">
        <Logo />
        {showStepper && <Stepper step={step} />}
        <span className="workspace-nav__tag">Owner workspace</span>
      </nav>
      <main className="workspace-main">{children}</main>
    </div>
  )
}

// Storefronts this browser session has created — lets returning owners pick up where they left off
function MyStorefronts({ businesses, onOpen }) {
  if (!businesses || businesses.length === 0) return null
  return (
    <section className="my-stores">
      <div className="my-stores__head">
        <h2>Welcome back</h2>
        <p>Continue with a storefront you started in this browser, or create a new one below.</p>
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
      <p className="my-stores__note">
        Storefronts are managed from the browser they were created in during this hackathon version.
      </p>
    </section>
  )
}

// -------------------------------------------------------
// Owner flow state machine
// -------------------------------------------------------
function OwnerFlow() {
  // Admin token screen is only reachable at /owner/admin; regular visitors start at onboarding
  const isAdminPath = window.location.pathname.replace(/\/+$/, '') === '/owner/admin'
  const [step, setStep] = useState(isAdminPath ? 'login' : 'onboarding')
  const [businessId, setBusinessId] = useState(null)
  const [publishedSlug, setPublishedSlug] = useState(null)
  const [publishedBusinessId, setPublishedBusinessId] = useState(null)
  const [publishedName, setPublishedName] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const [session, setSession] = useState('starting') // 'starting' | 'ready' | 'error'
  const [sessionError, setSessionError] = useState('')
  const [myBusinesses, setMyBusinesses] = useState([])

  async function initSession() {
    setSession('starting')
    setSessionError('')
    try {
      const res = await startSession()
      if (!res.ok) throw new Error(res.message || 'Could not start your session.')
      const list = await listMyBusinesses()
      setMyBusinesses(list.ok ? (list.businesses || []) : [])
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
    // Refresh the list so the storefront just published shows under "Welcome back"
    listMyBusinesses().then(list => { if (list.ok) setMyBusinesses(list.businesses || []) }).catch(() => {})
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

  if (step === 'login') {
    return (
      <OwnerShell step="onboarding" showStepper={false}>
        <OwnerLogin onLogin={() => setStep('onboarding')} />
      </OwnerShell>
    )
  }

  if (step === 'onboarding') {
    return (
      <OwnerShell step="onboarding">
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
            <MyStorefronts businesses={myBusinesses} onOpen={openExisting} />
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
      <OwnerShell step="review">
        <OwnerReview
          businessId={businessId}
          onPublished={(slug, name) => {
            setPublishedSlug(slug)
            setPublishedBusinessId(businessId)
            setPublishedName(name || '')
            setStep('published')
          }}
        />
      </OwnerShell>
    )
  }

  if (step === 'inbox') {
    return (
      <OwnerShell step="inbox">
        <OwnerInbox
          businessId={publishedBusinessId}
          businessName={publishedName || publishedSlug}
          storefrontUrl={`${window.location.origin}/s/${publishedSlug}`}
          onBack={() => setStep('published')}
        />
      </OwnerShell>
    )
  }

  if (step === 'published') {
    const url = `${window.location.origin}/s/${publishedSlug}`
    return (
      <OwnerShell step="published">
        <section className="published">
          <div className="published__art" aria-hidden="true">
            <div className="published__arch"><LogoMark size={56} /></div>
          </div>
          <div className="published__body">
            <p className="eyebrow eyebrow--coral">You're live</p>
            <h1 className="display display--md">
              {publishedName ? <>{publishedName} is open for business.</> : <>Your storefront is open for business.</>}
            </h1>
            <p className="lede">Share this link anywhere your customers already are — chats, social profiles, product labels.</p>

            <div className="link-box">
              <a href={url} target="_blank" rel="noreferrer" className="link-box__url">{url.replace(/^https?:\/\//, '')}</a>
              <button type="button" className="btn btn--dark btn--sm" onClick={() => copyLink(url)}>
                {copyFeedback || 'Copy link'}
              </button>
            </div>

            <div className="published__actions">
              <a href={url} target="_blank" rel="noreferrer" className="btn btn--primary">View my storefront</a>
              <button type="button" className="btn btn--ghost" onClick={() => setStep('inbox')}>View enquiries</button>
              <button type="button" className="btn btn--ghost" onClick={() => { setBusinessId(publishedBusinessId); setStep('review') }}>
                Edit storefront
              </button>
              <button type="button" className="btn btn--text" onClick={startNew}>Create another storefront</button>
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
