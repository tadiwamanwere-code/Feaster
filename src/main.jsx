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

// Hide the inline splash once React has painted at least one frame
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('initial-splash')
    if (!splash) return
    // Keep the splash visible briefly so it actually feels like a splash
    setTimeout(() => {
      splash.classList.add('splash-hide')
      splash.addEventListener('animationend', () => splash.remove(), { once: true })
    }, 450)
  })
})

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
