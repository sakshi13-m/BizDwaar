import '../styles/App.css'

function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Nav */}
      <nav className="nav-bar">
        <span className="nav-logo">Bizdwaar</span>
        <div className="nav-actions">
          <button className="nav-link" onClick={() => navigate('/owner')}>
            Owner login →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <h1>Your business deserves to be seen.</h1>
        <p>
          Turn the way you describe your business into a beautiful online storefront.
          Bizdwaar helps you organise your offerings, review the details and share your
          business with customers.
        </p>
        <button className="hero-cta" onClick={() => navigate('/owner')}>
          Create your storefront →
        </button>
      </section>

      {/* How it works */}
      <section className="landing-steps">
        <h2>How it works</h2>
        <p className="section-subheading">Three steps from description to live storefront.</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-icon">✍️</div>
            <div className="step-label">Step 1</div>
            <h3>Describe your business</h3>
            <p>Write about what you sell, where you are, and who you serve. Plain language is fine — no special format needed.</p>
          </div>
          <div className="step-card">
            <div className="step-icon">🔍</div>
            <div className="step-label">Step 2</div>
            <h3>Review with AI</h3>
            <p>Bizdwaar organises your information into a structured profile and catalogue. You review every detail before anything is published.</p>
          </div>
          <div className="step-card">
            <div className="step-icon">🚀</div>
            <div className="step-label">Step 3</div>
            <h3>Publish and share</h3>
            <p>Your storefront goes live at a shareable link. Customers can browse your offerings and send you enquiries directly.</p>
          </div>
        </div>
      </section>

      {/* Trust note */}
      <div className="landing-trust">
        <p>
          You review and approve everything. Bizdwaar never publishes details you haven't confirmed.
        </p>
      </div>

      {/* Sample storefront */}
      <section className="landing-sample">
        <h2>What your storefront looks like</h2>
        <p className="section-subheading">A real storefront is clean, mobile-friendly and shareable.</p>
        <div className="sample-card">
          <div className="sample-label-bar">Example storefront — fictional demo data</div>
          <div className="sample-header">
            <h3>Puja's Candle Studio</h3>
            <div className="sample-category">Home Decor · Handmade Candles</div>
            <div className="sample-location">📍 Pune, Maharashtra</div>
          </div>
          <div className="sample-desc">
            Handcrafted soy wax candles made in small batches in Pune. Each candle is poured
            by hand and scented with natural fragrance oils. Available for local pickup and
            delivery across Maharashtra.
          </div>
          <div className="sample-products">
            <h4>Our offerings</h4>
            <div className="sample-products-grid">
              <div className="sample-product">
                <div className="sample-product-name">Lavender Calm</div>
                <div className="sample-product-price">₹280</div>
                <div className="sample-product-unit">200g jar · 40 hr burn</div>
              </div>
              <div className="sample-product">
                <div className="sample-product-name">Citrus Burst</div>
                <div className="sample-product-price">₹260</div>
                <div className="sample-product-unit">180g tin · 35 hr burn</div>
              </div>
              <div className="sample-product">
                <div className="sample-product-name">Sandalwood & Rose</div>
                <div className="sample-product-price">₹320</div>
                <div className="sample-product-unit">220g jar · 45 hr burn</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <h2>Ready to put your business online?</h2>
        <p>Create your storefront — it's free.</p>
        <button className="cta-btn" onClick={() => navigate('/owner')}>
          Create your storefront →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Bizdwaar · Your business's doorway to the digital world.</p>
      </footer>
    </div>
  )
}
