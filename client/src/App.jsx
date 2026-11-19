import { useState } from 'react'
import OwnerLogin from './pages/OwnerLogin'
import Onboarding from './pages/Onboarding'
import OwnerReview from './pages/OwnerReview'
import './styles/App.css'

// Simple client-side flow state machine
// login → onboarding → review → published

export default function App() {
  const [step, setStep] = useState('login')
  const [businessId, setBusinessId] = useState(null)
  const [publishedSlug, setPublishedSlug] = useState(null)

  if (step === 'login') {
    return <OwnerLogin onLogin={() => setStep('onboarding')} />
  }

  if (step === 'onboarding') {
    return (
      <Onboarding
        onCreated={(id) => {
          setBusinessId(id)
          setStep('review')
        }}
      />
    )
  }

  if (step === 'review') {
    return (
      <OwnerReview
        businessId={businessId}
        onPublished={(slug) => {
          setPublishedSlug(slug)
          setStep('published')
        }}
      />
    )
  }

  if (step === 'published') {
    const url = `/b/${publishedSlug}`
    return (
      <div className="page-center">
        <div className="card">
          <h2>🎉 Your storefront is live!</h2>
          <p className="hint">Share this link with your customers:</p>
          <a href={url} target="_blank" rel="noreferrer" className="storefront-link">{url}</a>
          <button
            className="btn-secondary"
            style={{ marginTop: '1rem' }}
            onClick={() => { setStep('onboarding'); setBusinessId(null); setPublishedSlug(null) }}
          >
            Add another business
          </button>
        </div>
      </div>
    )
  }
}
