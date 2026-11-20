import { useState, useEffect } from 'react'
import StorefrontView from '../components/StorefrontView'
import { Logo } from '../components/Brand'
import { navigate } from '../lib/navigate'
import '../styles/App.css'
import '../styles/Storefront.css'

export default function PublicStorefront({ slug }) {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/businesses/${encodeURIComponent(slug)}`)
      .then(res => {
        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (!data) return
        if (data.ok) {
          setBusiness(data.business)
        } else {
          setNotFound(true)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load this storefront. Please try again later.')
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    if (business?.name) document.title = `${business.name} · Bizdwaar`
    return () => { document.title = "Bizdwaar — Your business's doorway to the digital world" }
  }, [business])

  if (loading) {
    return (
      <div className="sf-state">
        <span className="spinner" aria-hidden="true" />
        <p>Opening storefront…</p>
      </div>
    )
  }

  if (error || notFound || !business) {
    return (
      <div className="sf-state">
        <Logo />
        <div className="sf-state__card">
          <h1>{error ? 'Something went wrong' : 'Storefront not found'}</h1>
          <p>
            {error ||
              "This storefront doesn't exist or isn't published yet. Double-check the link you were given."}
          </p>
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>Visit Bizdwaar</button>
        </div>
      </div>
    )
  }

  // Server already returns only approved, visible items — this is a defensive re-check
  const visible = { ...business, catalogue: (business.catalogue || []).filter(item => item.publicVisible !== false) }

  return (
    <StorefrontView
      business={visible}
      mode="live"
      onEnquire={(itemName) =>
        navigate(`/enquiry/${slug}${itemName ? `?item=${encodeURIComponent(itemName)}` : ''}`)}
    />
  )
}
