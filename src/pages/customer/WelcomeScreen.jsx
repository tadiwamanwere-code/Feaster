import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function WelcomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col px-7 pt-16 pb-10">
      {/* Top brand badge */}
      <div className="flex justify-center animate-[welcomeRise_0.6s_ease_0.05s_both]">
        <div className="px-4 py-1.5 bg-black text-white rounded-full text-[11px] font-extrabold tracking-[0.28em] uppercase">
          FEASTER
        </div>
      </div>

      {/* Hero text */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="animate-[welcomeRise_0.7s_ease_0.2s_both]">
          <h1 className="text-[44px] leading-[1.05] font-black text-black tracking-tight">
            Welcome to
          </h1>
          <h1
            className="text-[64px] leading-none text-black mt-1"
            style={{ fontFamily: 'Pacifico, cursive' }}
          >
            Feaster <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-base text-black/60 mt-5 leading-relaxed max-w-[320px] font-medium">
            Order from your favourite spots. Sit-in, pre-order, or delivered to your door.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3 animate-[welcomeRise_0.8s_ease_0.45s_both]">
        <button
          onClick={() => navigate('/app')}
          className="group relative w-full h-16 rounded-full bg-black text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-3 overflow-hidden transition-transform active:scale-[0.97] hover:-translate-y-0.5"
        >
          <span className="relative z-10">GET STARTED</span>
          <ArrowRight className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />
          <span className="absolute inset-0 bg-white -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-0 group-hover:opacity-10" />
        </button>
      </div>

      <style>{`
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
