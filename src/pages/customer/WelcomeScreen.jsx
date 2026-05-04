import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function WelcomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-feaster-yellow">
      {/* Black accent shapes */}
      <div className="absolute -top-32 -left-24 w-80 h-80 bg-feaster-black rounded-full opacity-95" />
      <div className="absolute top-1/4 -right-32 w-72 h-72 bg-feaster-black rounded-full opacity-90" />
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-feaster-black rounded-t-[60px]" />
      <div className="absolute top-[28%] left-[18%] w-3 h-3 bg-feaster-black rounded-full" />
      <div className="absolute top-[44%] right-[14%] w-4 h-4 bg-feaster-black rounded-full" />
      <div className="absolute bottom-[42%] left-[8%] w-2.5 h-2.5 bg-feaster-yellow rounded-full" />

      {/* Content */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col px-7 pt-20 pb-10">

        {/* Top brand badge */}
        <div className="flex justify-center animate-[welcomeRise_0.6s_ease_0.05s_both]">
          <div className="px-4 py-1.5 bg-feaster-black text-feaster-yellow rounded-full text-[11px] font-extrabold tracking-[0.28em] uppercase">
            FEASTER
          </div>
        </div>

        {/* Hero text */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="animate-[welcomeRise_0.7s_ease_0.2s_both]">
            <h1 className="text-[44px] leading-[1.05] font-black text-feaster-black tracking-tight">
              Welcome to
            </h1>
            <h1
              className="text-[64px] leading-none text-feaster-black mt-1"
              style={{ fontFamily: 'Pacifico, cursive' }}
            >
              Feaster <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-base text-feaster-black/80 mt-5 leading-relaxed max-w-[320px] font-medium">
              Order from your favourite spots. Sit-in, pre-order, or delivered to your door.
            </p>
          </div>
        </div>

        {/* CTA at bottom over black */}
        <div className="relative z-10 space-y-3 animate-[welcomeRise_0.8s_ease_0.45s_both]">
          <button
            onClick={() => navigate('/app/auth')}
            className="group relative w-full h-16 rounded-full bg-white border-[3px] border-feaster-black text-feaster-black font-extrabold text-base tracking-wide flex items-center justify-center gap-3 overflow-hidden transition-transform active:scale-[0.97] hover:-translate-y-0.5"
            style={{ boxShadow: '6px 6px 0 0 #0A0A0A' }}
          >
            <span className="relative z-10">GET STARTED</span>
            <ArrowRight className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-feaster-yellow opacity-0 group-hover:opacity-30" />
          </button>

          <button
            onClick={() => navigate('/explore')}
            className="w-full text-sm text-feaster-yellow/90 hover:text-feaster-yellow py-2 font-semibold"
          >
            Just browsing? <span className="underline decoration-feaster-yellow underline-offset-4">Explore restaurants</span>
          </button>
        </div>
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
