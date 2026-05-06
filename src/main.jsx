import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

// Splash holds for exactly 4 seconds total before fading out
const splashStartedAt = window.__splashStart || (window.__splashStart = performance.now())
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('initial-splash')
    if (!splash) return
    const elapsed = performance.now() - splashStartedAt
    const remaining = Math.max(0, 4000 - elapsed)
    setTimeout(() => {
      splash.classList.add('splash-hide')
      splash.addEventListener('animationend', () => splash.remove(), { once: true })
    }, remaining)
  })
})

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
