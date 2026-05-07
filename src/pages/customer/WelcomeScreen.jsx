import { useNavigate } from 'react-router-dom'
import { ArrowRight, QrCode, Clock, ShoppingBag } from 'lucide-react'
import PWAInstallPrompt from '../../components/PWAInstallPrompt'

const FEATURES = [
  { icon: QrCode,     title: 'Scan & Order',     desc: 'Scan your table QR — menu instantly on your phone' },
  { icon: Clock,      title: 'Pre-Order Ahead',  desc: 'Skip the line. Pick a time, pay, walk in and grab' },
  { icon: ShoppingBag,title: 'Eat In or Take Away', desc: 'Order from your seat or take it home' },
]

export default function WelcomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col px-6 py-10">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        {/* Wordmark */}
        <div className="text-center animate-[wRise_0.6s_ease_0.05s_both]">
          <div
            className="text-6xl text-black"
            style={{ fontFamily: 'Pacifico, cursive' }}
          >
            Feaster
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.32em] text-black/55 mt-2">
            Order Food Faster
          </p>
        </div>

        {/* Headline */}
        <div className="text-center mt-10 animate-[wRise_0.7s_ease_0.18s_both]">
          <h1 className="text-[34px] leading-[1.1] font-black text-black tracking-tight">
            Your favourite spots,<br/>
            <span className="text-black/45">one tap away.</span>
          </h1>
        </div>

        {/* Feature rows */}
        <ul className="mt-10 space-y-3">
          {FEATURES.map((f, i) => (
            <li
              key={f.title}
              className="flex items-center gap-3 bg-white border border-black/10 rounded-2xl p-3.5"
              style={{
                animation: `wRise 0.6s ease ${0.32 + i * 0.08}s both`,
              }}
            >
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-white" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-black">{f.title}</h3>
                <p className="text-[11px] text-black/55 font-medium leading-snug mt-0.5">
                  {f.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="max-w-md mx-auto w-full pt-6 animate-[wRise_0.7s_ease_0.6s_both]">
        <button
          onClick={() => navigate('/app/order-type')}
          className="group relative w-full h-14 rounded-full bg-black text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-3 overflow-hidden active:scale-[0.97] hover:-translate-y-0.5 transition-transform"
        >
          <span className="relative z-10">Get Started</span>
          <ArrowRight className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>
        <p className="text-center text-[11px] text-black/45 font-medium mt-3">
          By continuing you agree to our terms · No account needed
        </p>
      </div>

      <PWAInstallPrompt />

      <style>{`
        @keyframes wRise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
