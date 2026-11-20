import { useState, useEffect } from 'react'
import { Logo, LogoMark } from '../components/Brand'
import SmartImage from '../components/SmartImage'
import StorefrontView from '../components/StorefrontView'
import { navigate } from '../lib/navigate'
import { DEMO_STOREFRONT } from '../lib/demoData'
import { formatPrice } from '../../../shared/price.js'
import '../styles/App.css'
import '../styles/Storefront.css'

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// The full owner journey, Describe → Update
const JOURNEY = [
  { title: 'Describe', line: 'Tell us about your business in everyday words.', tone: 'coral' },
  { title: 'Organise', line: 'AI drafts your profile and catalogue — and asks about anything missing.', tone: 'mango' },
  { title: 'Approve', line: 'You check every detail and choose what customers see.', tone: 'teal' },
  { title: 'Publish', line: 'Your business page goes live on a link you can share.', tone: 'indigo' },
  { title: 'Connect', line: 'Customers send enquiries straight from your business page.', tone: 'coral' },
  { title: 'Manage', line: 'Enquiries collect in your inbox — mark them replied or closed.', tone: 'mango' },
  { title: 'Update', line: 'Change prices and products any time; publish when you\'re ready.', tone: 'teal' }
]

// Hero collage: the kinds of businesses Bizdwaar is made for
const HERO_TILES = [
  { label: 'Home food', img: '/images/cat-food.jpg', alt: 'A tray of fresh jalebis at a sweet shop', tone: 'mango' },
  { label: 'Crafts', img: '/images/cat-crafts.jpg', alt: 'Hand-made terracotta pottery laid out at a market', tone: 'coral' },
  { label: 'Fashion', img: '/images/cat-fashion.jpg', alt: 'Colourful folded dupattas stacked at a market stall', tone: 'teal' }
]

const CATEGORIES = [
  {
    title: 'Homemade food',
    line: 'Pickles, sweets, tiffins and festive boxes from home kitchens.',
    img: '/images/food-sweets-box.jpg',
    accent: 'mango'
  },
  {
    title: 'Handmade crafts',
    line: 'Pottery, candles, décor and gifts made by skilled hands.',
    img: '/images/candle-diya.jpg',
    accent: 'coral'
  },
  {
    title: 'Fashion & lifestyle',
    line: 'Dupattas, block prints, tailoring and boutique collections.',
    img: '/images/cat-fashion.jpg',
    accent: 'teal'
  }
]

const DOMAIN_SEARCH_URL = 'https://www.godaddy.com/domains/domain-name-search'
const CUSTOM_SITE_EMAIL = 'sakshi.m@bizdwaar.in'
const CUSTOM_SITE_MAILTO = `mailto:${CUSTOM_SITE_EMAIL}?subject=${encodeURIComponent('Custom website enquiry')}&body=${encodeURIComponent(
  'Hi Bizdwaar team,\n\nI would like a custom website for my business.\n\nBusiness name:\nMy Bizdwaar page (if any):\nWhat I need:\nBest way to reach me:\n'
)}`

export default function LandingPage() {
  // Show "Log in" only when email login is available on this server
  const [emailLogin, setEmailLogin] = useState(false)
  useEffect(() => {
    fetch('/api/owner/me', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setEmailLogin(Boolean(d?.emailLogin)))
      .catch(() => {})
  }, [])

  return (
    <div className="landing">
      {/* ---------- Nav ---------- */}
      <nav className="site-nav">
        <Logo />
        <div className="site-nav__links">
          <button type="button" onClick={() => scrollToId('how')}>How it works</button>
          <button type="button" onClick={() => scrollToId('trust')}>Trustworthy AI</button>
          <button type="button" onClick={() => scrollToId('example')}>Example</button>
          <button type="button" onClick={() => scrollToId('plans')}>What's free</button>
        </div>
        <div className="site-nav__cta">
          {emailLogin && (
            <button type="button" className="btn btn--text" onClick={() => navigate('/owner?login=1')}>Log in</button>
          )}
          <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/owner')}>
            <span className="label-long">Create your business page</span>
            <span className="label-short">Start free</span>
          </button>
        </div>
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
            Bizdwaar helps home-based makers, boutiques and small service providers across India get
            online. Describe your business in your own words — AI organises it into a business page
            customers can browse and enquire from, and you approve every detail.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate('/owner')}>
              Create your business page <Arrow />
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => scrollToId('how')}>
              See how it works
            </button>
          </div>
          <p className="hero__note">Free business page · No sign-up forms · You approve everything</p>
        </div>

        <div className="hero__media hero__media--collage">
          <div className="hero__shape" aria-hidden="true" />
          <ul className="hero-collage" aria-label="Businesses Bizdwaar is made for">
            {HERO_TILES.map(t => (
              <li key={t.label} className={`hero-collage__item hero-collage__item--${t.tone}`}>
                <SmartImage src={t.img} alt={t.alt} className="hero-collage__img arch" initial={t.label.charAt(0)} />
                <span className="hero-collage__label">{t.label}</span>
              </li>
            ))}
          </ul>
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
                {DEMO_STOREFRONT.catalogue.map(item => (
                  <li key={item.name}><span>{item.name}</span><span className="price-chip">{formatPrice(item.price)}</span></li>
                ))}
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
            <h2 className="h-section">From a simple idea to your own business page</h2>
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

      {/* ---------- Journey: positioning + Describe → Update ---------- */}
      <section className="section journey" id="journey">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow eyebrow--coral">Not a one-time website</p>
            <h2 className="h-section">Your business doesn't stand still. Your digital presence shouldn't either.</h2>
            <p className="section-lede">
              Bizdwaar stays with you after launch — customers reach you from your business page, and you
              keep it current as your products, prices and seasons change.
            </p>
          </div>
          <ol className="journey__track">
            {JOURNEY.map((s, i) => (
              <li key={s.title} className={`journey__step journey__step--${s.tone}`}>
                <span className="journey__num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.line}</p>
              </li>
            ))}
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
            <p className="trust__foot">Nothing appears on your business page until you confirm it.</p>
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

      {/* ---------- Section 4: example business page ---------- */}
      <section className="section example" id="example">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow eyebrow--coral">See the result</p>
            <h2 className="h-section">A business page that feels like your own website</h2>
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
              <div><h3>A direct enquiry channel</h3><p>Customers message you from the business page; enquiries collect in your inbox.</p></div>
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- What's free / what's next ---------- */}
      <section className="section plans" id="plans">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow eyebrow--teal">What you get</p>
            <h2 className="h-section">Start free. Grow when you're ready.</h2>
          </div>
          <div className="plans__grid">
            <article className="plan plan--free">
              <span className="plan__tag">Available now · Free</span>
              <h3>Bizdwaar business page</h3>
              <p className="plan__url">bizdwaar.in/s/your-business</p>
              <ul className="plan__list">
                <li>AI-organised profile and product catalogue</li>
                <li>Prices shown clearly in rupees (₹)</li>
                <li>You approve everything before it's public</li>
                <li>Mobile-friendly page with a shareable link</li>
                <li>Customer enquiries in your own inbox</li>
                <li>Update your products and prices any time</li>
              </ul>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/owner')}>
                Create your free business page <Arrow />
              </button>
            </article>
            <article className="plan plan--later">
              <span className="plan__tag plan__tag--soon">Upgrade · paid</span>
              <h3>Your own domain</h3>
              <p>
                Get a name like <strong>sarasstudio.in</strong> that belongs to you. Search and buy it on GoDaddy
                today; connecting it to your Bizdwaar page is coming soon.
              </p>
              <a className="btn btn--ghost plan__btn" href={DOMAIN_SEARCH_URL} target="_blank" rel="noopener noreferrer">
                Find a domain on GoDaddy <ExternalIcon />
              </a>
            </article>
            <article className="plan plan--later">
              <span className="plan__tag plan__tag--soon">Service · on request</span>
              <h3>Custom website</h3>
              <p>
                Ready for more than one page? Our team can design and build a fuller website for your business.
                Tell us what you need and we'll get back to you.
              </p>
              <a className="btn btn--ghost plan__btn" href={CUSTOM_SITE_MAILTO}>
                Enquire about a custom website
              </a>
              <p className="plan__contact">or email <a href={CUSTOM_SITE_MAILTO}>{CUSTOM_SITE_EMAIL}</a></p>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="final-cta">
        <div className="final-cta__arch" aria-hidden="true" />
        <div className="container final-cta__inner">
          <h2 className="display display--light">Your business deserves its own doorway.</h2>
          <p>Describe your business, review what Bizdwaar organises, and publish — in minutes.</p>
          <button type="button" className="btn btn--mango btn--lg" onClick={() => navigate('/owner')}>
            Create your business page <Arrow />
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
function ExternalIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1em', height: '1em' }}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
