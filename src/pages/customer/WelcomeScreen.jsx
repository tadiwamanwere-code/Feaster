import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getRestaurants } from '../../lib/services'

const FALLBACK_EMOJI = ['🍜', '🍕', '🥗', '🍛', '🍣', '🍔']

const ORBS = [
  { size: 96,  top: '6%',  left: '14%',  delay: 0.05 },
  { size: 110, top: '4%',  right: '10%', delay: 0.18 },
  { size: 132, top: '22%', left: '38%',  delay: 0.30 },
  { size: 90,  top: '34%', left: '8%',   delay: 0.42 },
  { size: 96,  top: '36%', right: '6%',  delay: 0.55 },
  { size: 112, top: '52%', left: '28%',  delay: 0.68 },
]

export default function WelcomeScreen() {
  const navigate = useNavigate()
  const [orbImages, setOrbImages] = useState([])

  useEffect(() => {
    let cancelled = false
    getRestaurants()
      .then(rs => {
        if (cancelled) return
        const photos = rs
          .map(r => r.cover_photo_url || r.logo_url)
          .filter(Boolean)
          .slice(0, 6)
        setOrbImages(photos)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-cream-100 via-cream-50 to-white">
      {/* Decorative orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 w-72 h-72 bg-orange-200/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-orange-300/40 rounded-full blur-3xl" />
      </div>

      {/* Floating food cluster */}
      <div className="absolute inset-x-0 top-0 h-[62%]">
        {ORBS.map((o, i) => {
          const img = orbImages[i]
          const emoji = FALLBACK_EMOJI[i % FALLBACK_EMOJI.length]
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white shadow-shell flex items-center justify-center overflow-hidden"
              style={{
                width: o.size, height: o.size,
                top: o.top, left: o.left, right: o.right,
                animation: `welcomeFloat 4s ease-in-out ${o.delay}s infinite, welcomeIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${o.delay}s both`,
              }}
            >
              {img ? (
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ fontSize: o.size * 0.5 }}>{emoji}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom content */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col justify-end px-6 pb-10 pt-[64%]">
        <div className="text-center space-y-3 mb-8 animate-[welcomeRise_0.8s_ease_0.5s_both]">
          <h1 className="text-3xl font-extrabold text-orange-600 tracking-tight">
            Welcome to Feaster <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-base text-ink-500 leading-relaxed max-w-xs mx-auto">
            Order from your favourite spots. Sit-in, pre-order, or delivered to your door.
          </p>
        </div>

        <button
          onClick={() => navigate('/app/auth')}
          className="w-full bg-orange-600 active:bg-orange-700 text-white py-4 rounded-full font-bold tracking-wide flex items-center justify-center gap-2 shadow-pop transition-transform active:scale-[0.98]"
        >
          GET STARTED
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate('/explore')}
          className="mt-3 w-full text-sm text-ink-500 hover:text-ink-700 py-2"
        >
          Just browsing? <span className="font-semibold text-orange-600">Explore restaurants</span>
        </button>
      </div>

      <style>{`
        @keyframes welcomeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes welcomeIn {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes welcomeRise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0); }
          10%, 30% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          40%, 50% { transform: rotate(10deg); }
        }
        .animate-wave { animation: wave 2.5s ease infinite; transform-origin: 70% 70%; display: inline-block; }
      `}</style>
    </div>
  )
}
