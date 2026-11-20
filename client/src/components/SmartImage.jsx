import { useState } from 'react'

/**
 * Image with a graceful fallback: if the file fails to load, a patterned panel
 * (with an optional initial) is shown instead so layouts never break.
 * `illustrative` adds a visible label so stock imagery is never mistaken for the real product.
 */
export default function SmartImage({ src, alt = '', className = '', illustrative = false, initial, tone, style }) {
  const [failed, setFailed] = useState(!src)

  return (
    <div className={`smart-image ${className}`} style={style}>
      {failed ? (
        <div className={`smart-image__fallback${tone ? ` smart-image__fallback--${tone}` : ''}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          {initial && <span>{initial}</span>}
        </div>
      ) : (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
      {illustrative && !failed && <span className="smart-image__tag">Illustrative image</span>}
    </div>
  )
}
