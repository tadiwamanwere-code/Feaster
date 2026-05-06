import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Keyboard, AlertCircle, ScanLine } from 'lucide-react'
import { getRestaurants } from '../../lib/services'
import { useCart } from '../../context/CartContext'

const QR_PATTERNS = [
  // /:slug/table/:n  or  feaster.app/:slug/table/:n
  /(?:^|\/)([a-z0-9][a-z0-9-]+)\/table\/([a-zA-Z0-9-]+)/i,
  // feaster:r:slug:table:n
  /^feaster:r:([a-z0-9-]+):table:([a-zA-Z0-9-]+)/i,
]

function parseQr(raw) {
  if (!raw) return null
  for (const re of QR_PATTERNS) {
    const m = raw.match(re)
    if (m) return { slug: m[1], table: m[2] }
  }
  return null
}

export default function CustomerScan() {
  const navigate = useNavigate()
  const cart = useCart()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(true)
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState('pending') // pending | granted | denied
  const [error, setError] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualSlug, setManualSlug] = useState('')
  const [manualTable, setManualTable] = useState('')
  const [restaurants, setRestaurants] = useState([])

  useEffect(() => {
    mountedRef.current = true
    getRestaurants().then(setRestaurants).catch(() => {})

    const hasDetector = 'BarcodeDetector' in window
    if (!hasDetector) {
      setSupported(false)
      setShowManual(true)
      return
    }

    let detector
    try {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    } catch {
      setSupported(false)
      setShowManual(true)
      return
    }

    let scanTimer

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setPermission('granted')
        scanLoop()
      } catch (err) {
        setPermission('denied')
        setError(err?.message || 'Camera permission denied')
        setShowManual(true)
      }
    }

    async function scanLoop() {
      if (!mountedRef.current || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes && codes[0]) {
          handleScanned(codes[0].rawValue)
          return
        }
      } catch {}
      scanTimer = setTimeout(scanLoop, 250)
    }

    start()

    return () => {
      mountedRef.current = false
      clearTimeout(scanTimer)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScanned = (raw) => {
    const parsed = parseQr(raw)
    if (!parsed) {
      setError(`Unrecognised QR code: ${raw.slice(0, 80)}`)
      // Resume scanning after 2s
      setTimeout(() => setError(''), 2500)
      return
    }
    const r = restaurants.find(x => x.slug === parsed.slug)
    if (!r) {
      setError(`Restaurant "${parsed.slug}" not found`)
      setTimeout(() => setError(''), 2500)
      return
    }
    cart.setRestaurant?.(r.slug, r.id)
    cart.setTable?.(parsed.table)
    navigate(`/app/r/${r.slug}?table=${parsed.table}`, { replace: true })
  }

  const submitManual = (e) => {
    e.preventDefault()
    if (!manualSlug || !manualTable) return
    handleScanned(`/${manualSlug}/table/${manualTable}`)
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-6 pb-3 z-10">
        <button
          onClick={() => navigate('/app/order-type')}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-extrabold tracking-tight">Scan table QR</h1>
        <button
          onClick={() => setShowManual(s => !s)}
          aria-label="Enter manually"
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </header>

      {/* Camera viewport */}
      {!showManual && supported && (
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dim overlay with cutout */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/55" />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-3xl"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-3xl border-2 border-white/95" />
            {/* Animated scan line */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 overflow-hidden rounded-3xl">
              <div className="absolute left-2 right-2 h-[2px] bg-white/85 rounded-full animate-[scanLine_2.4s_ease-in-out_infinite]" />
            </div>
            {/* Corner ticks */}
            <CornerTicks />
          </div>

          {/* Status text */}
          <div className="absolute inset-x-0 bottom-24 flex flex-col items-center text-center px-6">
            {permission === 'pending' && (
              <p className="text-sm font-bold text-white/90 inline-flex items-center gap-2">
                <Camera className="w-4 h-4" /> Allow camera to scan
              </p>
            )}
            {permission === 'granted' && !error && (
              <p className="text-sm font-bold text-white/90 inline-flex items-center gap-2">
                <ScanLine className="w-4 h-4" /> Point at the QR on your table
              </p>
            )}
            {error && (
              <p className="text-sm font-bold bg-white text-black rounded-full px-4 py-2 inline-flex items-center gap-2 shadow-lg">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manual fallback */}
      {showManual && (
        <div className="flex-1 px-6 pt-6 bg-white text-black">
          <div className="max-w-md mx-auto">
            {!supported && (
              <div className="bg-[#F4F4F4] rounded-2xl p-4 mb-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <p className="text-sm text-black/75 leading-relaxed">
                  This device can't scan QR codes from the camera. Type the
                  restaurant code and table number printed on your table.
                </p>
              </div>
            )}

            <form onSubmit={submitManual} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
                  Restaurant code
                </label>
                <input
                  type="text"
                  value={manualSlug}
                  onChange={(e) => setManualSlug(e.target.value.trim().toLowerCase())}
                  placeholder="e.g. nair-nosh"
                  list="restaurant-slugs"
                  className="w-full h-14 px-5 bg-white border-2 border-black rounded-2xl text-base font-bold text-black placeholder-black/30 focus:outline-none"
                  required
                  autoFocus
                />
                <datalist id="restaurant-slugs">
                  {restaurants.map(r => (
                    <option key={r.id} value={r.slug}>{r.name}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
                  Table number
                </label>
                <input
                  type="text"
                  value={manualTable}
                  onChange={(e) => setManualTable(e.target.value.trim())}
                  placeholder="e.g. 7"
                  className="w-full h-14 px-5 bg-white border-2 border-black rounded-2xl text-base font-bold text-black placeholder-black/30 focus:outline-none"
                  required
                />
              </div>
              {error && (
                <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={!manualSlug || !manualTable}
                className="w-full h-14 rounded-full bg-black text-white font-bold disabled:opacity-40 active:scale-[0.97] transition-transform"
              >
                Continue
              </button>
              {supported && (
                <button
                  type="button"
                  onClick={() => { setShowManual(false); setError('') }}
                  className="w-full text-sm font-semibold text-black/55 py-2"
                >
                  Use camera instead
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(0);     opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(15rem); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function CornerTicks() {
  return (
    <>
      {/* TL */}
      <div className="absolute left-1/2 top-1/2 -translate-x-[8.5rem] -translate-y-[8.5rem] w-6 h-6 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
      {/* TR */}
      <div className="absolute left-1/2 top-1/2 translate-x-[6.5rem] -translate-y-[8.5rem] w-6 h-6 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
      {/* BL */}
      <div className="absolute left-1/2 top-1/2 -translate-x-[8.5rem] translate-y-[6.5rem] w-6 h-6 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
      {/* BR */}
      <div className="absolute left-1/2 top-1/2 translate-x-[6.5rem] translate-y-[6.5rem] w-6 h-6 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
    </>
  )
}
