import { useState, useEffect } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('pwa-dismissed')) return

    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.MSStream
    setIsIOS(ios)

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    if (ios) {
      const timer = setTimeout(() => setShowPrompt(true), 3500)
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler) }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') setShowPrompt(false)
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
    <div
      className="fixed bottom-6 inset-x-4 z-50 max-w-md mx-auto"
      style={{ animation: 'fadeSlide 0.4s ease both' }}
    >
      <div className="bg-black text-white rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          {/* Black on white "F" mark */}
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shrink-0">
            <span className="text-2xl" style={{ fontFamily: 'Pacifico, cursive' }}>F</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-sm">Install Feaster</h3>
            {isIOS ? (
              <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">
                Tap{' '}
                <Share className="inline w-3.5 h-3.5 -mt-0.5 mx-0.5" />
                {' '}then{' '}
                <strong className="text-white">Add to Home Screen</strong>
              </p>
            ) : (
              <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">
                Get it on your home screen for one-tap ordering — no app store needed.
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1 rounded-full hover:bg-white/10 shrink-0"
          >
            <X className="w-4 h-4 text-white/55" />
          </button>
        </div>

        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-full text-sm font-extrabold active:scale-[0.97] transition-transform"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
        )}

        {isIOS && (
          <button
            onClick={handleDismiss}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white/10 text-white py-2.5 rounded-full text-sm font-bold hover:bg-white/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> Got it
          </button>
        )}
      </div>
    </div>
  )
}
