// Minimal client-side navigation used across pages (App.jsx listens for popstate)
export function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}
