import { navigate } from '../lib/navigate'

// Doorway ("dwaar") mark: an arch with a mango-coloured light inside
export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect width="32" height="32" rx="9" fill="var(--teal)" />
      <path d="M9 26V15a7 7 0 0 1 14 0v11" fill="none" stroke="var(--ivory)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="15.5" r="2.6" fill="var(--mango)" />
    </svg>
  )
}

export function Logo({ onDark = false, to = '/' }) {
  return (
    <button
      type="button"
      className={`logo ${onDark ? 'logo--on-dark' : ''}`}
      onClick={() => navigate(to)}
      aria-label="Bizdwaar home"
    >
      <LogoMark />
      <span className="logo-word">Bizdwaar</span>
    </button>
  )
}
