import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import OwnerLogin from './pages/OwnerLogin'
import Onboarding from './pages/Onboarding'
import OwnerReview from './pages/OwnerReview'
import OwnerInbox from './pages/OwnerInbox'
import PublicStorefront from './pages/PublicStorefront'
import EnquiryForm from './pages/EnquiryForm'
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

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// -------------------------------------------------------
// Owner flow progress bar
// -------------------------------------------------------
const STEPS = ['login', 'onboarding', 'review', 'published', 'inbox']
const STEP_LABELS = { login: 'Sign in', onboarding: 'Describe', review: 'Review', published: 'Published' }

function ProgressBar({ step }) {
  const display = ['login', 'onboarding', 'review', 'published']
  const currentIndex = display.indexOf(step === 'inbox' ? 'published' : step)
  return (
    <div className="progress-bar">
      {display.map((s, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''
        return (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span className={`progress-step ${state}`}>
              <span className="progress-step-num">
                {i < currentIndex ? '✓' : i + 1}
              </span>
              <span style={{ display: 'none' }}>{STEP_LABELS[s]}</span>
            </span>
            {i < display.length - 1 && <span className="progress-divider" />}
          </span>
        )
      })}
    </div>
  )
}

// -------------------------------------------------------
// Owner flow state machine
// -------------------------------------------------------
function OwnerFlow() {
  const [step, setStep] = useState('login')
  const [businessId, setBusinessId] = useState(null)
  const [publishedSlug, setPublishedSlug] = useState(null)
  const [publishedBusinessId, setPublishedBusinessId] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState('')

  function copyLink(url) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopyFeedback('Copied!')
        setTimeout(() => setCopyFeedback(''), 2000)
      })
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
      setCopyFeedback('Copied!')
      setTimeout(() => setCopyFeedback(''), 2000)
    }
  }

  if (step === 'login') {
    return (
      <div className="owner-flow">
        <nav className="nav-bar">
          <button
            className="nav-logo"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Bizdwaar
          </button>
        </nav>
        <OwnerLogin onLogin={() => setStep('onboarding')} />
      </div>
    )
  }

  if (step === 'onboarding') {
    return (
      <div className="owner-flow">
        <nav className="nav-bar">
          <button
            className="nav-logo"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Bizdwaar
          </button>
          <ProgressBar step="onboarding" />
        </nav>
        <Onboarding
          onCreated={(id) => {
            setBusinessId(id)
            setStep('review')
          }}
        />
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="owner-flow">
        <nav className="nav-bar">
          <button
            className="nav-logo"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Bizdwaar
          </button>
          <ProgressBar step="review" />
        </nav>
        <OwnerReview
          businessId={businessId}
          onPublished={(slug) => {
            setPublishedSlug(slug)
            setPublishedBusinessId(businessId)
            setStep('published')
          }}
        />
      </div>
    )
  }

  if (step === 'inbox') {
    return (
      <div className="owner-flow">
        <nav className="nav-bar">
          <button
            className="nav-logo"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Bizdwaar
          </button>
        </nav>
        <OwnerInbox
          businessId={publishedBusinessId}
          businessName={publishedSlug}
          onBack={() => setStep('published')}
        />
      </div>
    )
  }

  if (step === 'published') {
    const url = `${window.location.origin}/s/${publishedSlug}`
    return (
      <div className="published-screen">
        <div className="published-card">
          <h2>Your storefront is live</h2>
          <p className="hint">Share this link with your customers:</p>
          <a href={url} target="_blank" rel="noreferrer" className="storefront-link">{url}</a>

          <div className="published-actions">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ textAlign: 'center' }}
            >
              View my storefront →
            </a>

            <button
              className="btn-ghost"
              onClick={() => copyLink(url)}
            >
              {copyFeedback || 'Copy link'}
            </button>

            <button
              className="btn-secondary"
              onClick={() => setStep('inbox')}
            >
              View enquiries
            </button>

            <button
              className="btn-secondary"
              onClick={() => {
                setStep('onboarding')
                setBusinessId(null)
                setPublishedSlug(null)
                setPublishedBusinessId(null)
              }}
            >
              Create another storefront
            </button>
          </div>
        </div>
      </div>
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
