import { useEffect, useState, lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'

const DesktopLanding = lazy(() => import('./DesktopLanding'))

const DESKTOP_MIN_WIDTH = 1024

function isDesktopViewport() {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches
  }
  return window.innerWidth >= DESKTOP_MIN_WIDTH
}

export default function RootGate() {
  const [isDesktop, setIsDesktop] = useState(() => isDesktopViewport())
  const [decided, setDecided] = useState(false)

  useEffect(() => {
    setDecided(true)
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`)
    const onChange = (e) => setIsDesktop(e.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])

  if (!decided) return null

  if (isDesktop) {
    return (
      <Suspense fallback={<div className="min-h-[100dvh] bg-white" />}>
        <DesktopLanding />
      </Suspense>
    )
  }

  return <Navigate to="/welcome" replace />
}
