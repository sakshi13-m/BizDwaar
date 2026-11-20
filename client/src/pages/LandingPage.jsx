import { Logo, LogoMark } from '../components/Brand'
import SmartImage from '../components/SmartImage'
import StorefrontView from '../components/StorefrontView'
import { navigate } from '../lib/navigate'
import { DEMO_STOREFRONT } from '../lib/demoData'
import '../styles/App.css'
import '../styles/Storefront.css'

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const CATEGORIES = [
  {
    title: 'Homemade food',
    line: 'Pickles, sweets, tiffins and festive boxes from home kitchens.',
    img: '/images/cat-food.jpg',
    accent: 'mango'
  },
  {
    title: 'Handmade crafts',
    line: 'Pottery, candles, décor and gifts made by skilled hands.',
    img: '/images/cat-crafts.jpg',
    accent: 'coral'
  },
  {
    title: 'Fashion & lifestyle',
    line: 'Dupattas, block prints, tailoring and boutique collections.',
    img: '/images/cat-fashion.jpg',
    accent: 'teal'
  }
]

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ---------- Nav ---------- */}
      <nav className="site-nav">
        <Logo />
        <div className="site-nav__links">
          <button type="button" onClick={() => scrollToId('how')}>How it works</button>
          <button type="button" onClick={() => scrollToId('trust')}>Trustworthy AI</button>
          <button type="button" onClick={() => scrollToId('example')}>Example</button>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/owner')}>
          Create your storefront
        </button>
      </nav>

      {/* ---------- Hero ---------- */}
      <header className="hero">
        <div className="hero__text">
          <p className="eyebrow eyebrow--coral">Your business's doorway to the digital world</p>
          <h1 className="display">
            Small business.<br />
            <em>Big digital dreams.</em>
          </h1>
          <p className="hero__lede">
            Your business has a story. Bizdwaar helps turn it into a beautiful online storefront —
            with AI that organises your ideas while you stay in control.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate('/owner')}>
              Create your storefront <Arrow />
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => scrollToId('how')}>
              See how it works
            </button>
          </div>
          <p className="hero__note">Free for the hackathon pilot · No sign-up forms · You approve everything</p>
        </div>

        <div className="hero__media">
          <div className="hero__shape" aria-hidden="true" />
          <SmartImage
            src="/images/hero-candle-stall.jpg"
            alt="Rows of colourful hand-dipped candles hanging at a market stall"
            className="hero__img arch"
            initial="B"
          />
          <div className="hero__float hero__float--link">
            <LogoMark size={22} />
            <div>
              <span className="float-label">Now live</span>
              <span className="float-value">bizdwaar.in/s/saras-studio</span>
            </div>
          </div>
          <div className="hero__float hero__float--enquiry">
            <span className="dot dot--coral" />
            <div>
              <span className="float-label">New enquiry</span>
              <span className="float-value">"Can I order 10 candles as wedding favours?"</span>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Before / after ---------- */}
      <section className="transform">
        <div className="container transform__grid">
          <div className="transform__card transform__card--before">
            <p className="eyebrow">Before</p>
            <h3>Word of mouth and scattered messages</h3>
            <div className="chat">
              <p className="chat__bubble">Hi! Price of the jar candle?</p>
              <p className="chat__bubble chat__bubble--me">₹350 for 200g 🙂</p>
              <p className="chat__bubble">Can you send photos of the dupattas again?</p>
              <p className="chat__bubble">Do you deliver to Malviya Nagar??</p>
            </div>
            <p className="transform__caption">Answering the same questions, one chat at a time.</p>
          </div>

          <div className="transform__arrow" aria-hidden="true"><Arrow /></div>

          <div className="transform__card transform__card--after">
            <p className="eyebrow eyebrow--mango">After</p>
            <h3>One link with everything customers need</h3>
            <div className="mini-store">
              <div className="mini-store__head">
                <span className="sf-monogram">S</span>
                <div>
                  <strong>Sara's Studio</strong>
                  <span>Handmade crafts · Jaipur</span>
                </div>
              </div>
              <ul className="mini-store__list">
                <li><span>Hand-poured Jar Candle</span><span className="price-chip">₹350</span></li>
                <li><span>Painted Terracotta Planter</span><span className="price-chip">₹450</span></li>
                <li><span>Block-print Cotton Dupatta</span><span className="price-chip">₹890</span></li>
              </ul>
              <span className="mini-store__cta">Send an enquiry</span>
            </div>
            <p className="transform__caption">Organised, shareable, and ready for new customers.</p>
          </div>
        </div>
        <p className="fiction-note">Sara's Studio is a fictional demo business.</p>
      </section>

      {/* ---------- Section 1: stories ---------- */}
      <section className="section stories">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow eyebrow--coral">Made for India's micro-businesses</p>
            <h2 className="h-section">Every business has a story</h2>
            <p className="section-lede">
              Home kitchens, craft studios and neighbourhood boutiques run on skill and trust.
              Bizdwaar gives that work a home online.
            </p>
          </div>
          <div className="stories__grid">
            {CATEGORIES.map((c, i) => (
              <article key={c.title} className={`story-card story-card--${c.accent} ${i === 1 ? 'story-card--lift' : ''}`}>
                <SmartImage src={c.img} alt={c.title} className="story-card__img" initial={c.title.charAt(0)} />
                <div className="story-card__body">
                  <h3>{c.title}</h3>
                  <p>{c.line}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Section 2: how it works ---------- */}
      <section className="section how" id="how">
        <div className="container">
          <div className="section-head section-head--left">
            <p className="eyebrow eyebrow--teal">How it works</p>
            <h2 className="h-section">From a simple idea to your own storefront</h2>
          </div>

          <ol className="steps">
            <li className="step">
              <span className="step__num">01</span>
              <div className="step__copy">
                <h3>Tell us about your business</h3>
                <p>Describe what you make and sell in your own words — the way you'd tell a friend. No forms full of jargon.</p>
              </div>
              <div className="step__visual step__visual--quote">
                <p>"I make hand-poured candles, paint terracotta planters and block-print dupattas at home… Jar candle — 200g, ₹350…"</p>
              </div>
            </li>
            <li className="step step--alt">
              <span className="step__num">02</span>
              <div className="step__copy">
                <h3>Let AI organise your ideas</h3>
                <p>Bizdwaar turns your description into a clear profile and product catalogue — and points out anything that's missing.</p>
              </div>
              <div className="step__visual step__visual--fields">
                <div className="field-row"><span>Product</span><strong>Hand-poured Jar Candle</strong></div>
                <div className="field-row"><span>Price</span><strong>₹350</strong></div>
                <div className="field-row field-row--missing"><span>Price</span><strong>Cotton Dupatta — needs your input</strong></div>
              </div>
            </li>
            <li className="step">
              <span className="step__num">03</span>
              <div className="step__copy">
                <h3>Review, approve and publish</h3>
                <p>Edit anything, choose what customers see, preview the real page, then publish a link you can share anywhere.</p>
              </div>
              <div className="step__visual step__visual--publish">
                <div className="toggle-row"><span className="switch is-on" /> Jar Candle — visible</div>
                <div className="toggle-row"><span className="switch is-on" /> Terracotta Planter — visible</div>
                <span className="publish-pill"><LogoMark size={16} /> Published</span>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ---------- Section 3: trust ---------- */}
      <section className="section trust" id="trust">
        <div className="container trust__grid">
          <div className="trust__copy">
            <p className="eyebrow eyebrow--mango">Our AI principle</p>
            <h2 className="h-section">AI that knows what it doesn't know.</h2>
            <p className="section-lede">
              Bizdwaar organises only what you tell it. It never invents details about your business.
              If something is missing, it asks you. If something sounds like a claim, it flags it.
            </p>
            <p className="trust__never-label">Bizdwaar never makes up</p>
            <ul className="never-list">
              {['Prices', 'Sizes & weights', 'Ingredients', 'Certifications', 'Delivery promises', 'Business policies'].map(x => (
                <li key={x}><CrossIcon /> {x}</li>
              ))}
            </ul>
            <p className="trust__foot">Nothing appears on your storefront until you confirm it.</p>
          </div>

          <div className="trust__demo" aria-label="Example of an AI-organised profile">
            <div className="ai-card">
              <div className="ai-card__head">
                <span className="badge badge--ai">AI-organised draft</span>
                <span className="ai-card__from">from your description</span>
              </div>
              <h4>Sara's Studio</h4>
              <p>Hand-poured candles, painted terracotta and block-printed dupattas from a home studio in Jaipur.</p>
              <div className="ai-card__items">
                <div><span>Hand-poured Jar Candle</span><span>200g · ₹350</span></div>
                <div><span>Painted Terracotta Planter</span><span>6 inch · ₹450</span></div>
                <div><span>Block-print Cotton Dupatta</span><span className="is-missing">size? · price?</span></div>
              </div>
            </div>
            <div className="missing-card">
              <span className="badge badge--missing">Missing information</span>
              <p><strong>What is the price of the block-print cotton dupatta?</strong></p>
              <p className="missing-card__sub">We left it blank instead of guessing.</p>
            </div>
            <div className="claim-card">
              <span className="badge badge--claim">Please confirm</span>
              <p>"Everything I make is 100% eco-friendly"</p>
              <p className="missing-card__sub">Kept out of your summary until you check it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Section 4: example storefront ---------- */}
      <section className="section example" id="example">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow eyebrow--coral">See the result</p>
            <h2 className="h-section">A storefront that feels like your own website</h2>
            <p className="section-lede">This is the page customers see when you share your link.</p>
          </div>
          <div className="browser">
            <div className="browser__bar">
              <span className="browser__dots"><i /><i /><i /></span>
              <span className="browser__url">bizdwaar.in/s/{DEMO_STOREFRONT.slug}</span>
              <span className="badge badge--fiction">Fictional example</span>
            </div>
            <div className="browser__viewport">
              <StorefrontView business={DEMO_STOREFRONT} mode="sample" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Section 5: impact ---------- */}
      <section className="section impact">
        <div className="container impact__grid">
          <div>
            <p className="eyebrow eyebrow--teal">Why it matters</p>
            <h2 className="h-section">Make your business easier to discover.</h2>
            <SmartImage src="/images/maker-hand-dipped.jpg" alt="Hand-dipped candles drying on a wooden rack in a maker's studio" className="impact__img" initial="B" />
          </div>
          <ul className="benefits">
            <li>
              <span className="benefit-icon benefit-icon--teal"><StoreIcon /></span>
              <div><h3>A professional digital presence</h3><p>A polished page with your name, story and location — no website skills needed.</p></div>
            </li>
            <li>
              <span className="benefit-icon benefit-icon--mango"><GridIcon /></span>
              <div><h3>Products organised clearly</h3><p>Names, prices and sizes laid out so customers find what they need.</p></div>
            </li>
            <li>
              <span className="benefit-icon benefit-icon--coral"><LinkIcon /></span>
              <div><h3>A link customers can share</h3><p>Send it in chats, print it on labels, add it to your social profiles.</p></div>
            </li>
            <li>
              <span className="benefit-icon benefit-icon--indigo"><ChatIcon /></span>
              <div><h3>A direct enquiry channel</h3><p>Customers message you from the storefront; enquiries collect in your inbox.</p></div>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="final-cta">
        <div className="final-cta__arch" aria-hidden="true" />
        <div className="container final-cta__inner">
          <h2 className="display display--light">Your business deserves its own doorway.</h2>
          <p>Describe your business, review what Bizdwaar organises, and publish — in minutes.</p>
          <button type="button" className="btn btn--mango btn--lg" onClick={() => navigate('/owner')}>
            Create your storefront <Arrow />
          </button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <Logo onDark />
          <p>Your business's doorway to the digital world.</p>
          <p className="site-footer__small">
            © {new Date().getFullYear()} Bizdwaar · Built for the GoDaddy Inclusive Innovation Hackathon ·
            Photos: CC0, WordPress Photo Directory
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Inline icons (no icon library needed) ---------- */
export function Arrow() {
  return (
    <svg className="icon icon--arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CrossIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function StoreIcon() {
  return (<svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-6h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>)
}
function GridIcon() {
  return (<svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>)
}
function LinkIcon() {
  return (<svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>)
}
function ChatIcon() {
  return (<svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>)
}
