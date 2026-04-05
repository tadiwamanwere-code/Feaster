import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Detect iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.MSStream
    setIsIOS(ios)

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Show iOS prompt after a short delay
    if (ios) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler) }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-dismissed', 'true')
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-in">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
            <svg width="28" height="28" viewBox="0 0 512 512" fill="none">
              <g stroke="white" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round">
                <path d="M168 100L168 220Q168 260 198 260L198 412"/>
                <path d="M138 100L138 200"/>
                <path d="M198 100L198 200"/>
                <path d="M314 100L314 260L314 412"/>
                <path d="M314 100Q362 140 362 220Q362 260 314 260"/>
              </g>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Install Feaster</h3>
            {isIOS ? (
              <p className="text-xs text-gray-500 mt-0.5">
                Tap <span className="inline-flex items-center"><svg className="w-3.5 h-3.5 mx-0.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></span> then <strong>"Add to Home Screen"</strong>
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Add to your home screen for quick access to menus and ordering
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-lg shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
        )}
      </div>
    </div>
  )
}
