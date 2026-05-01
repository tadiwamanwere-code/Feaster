import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Zap, Smartphone } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-canvas-100">
      {/* Background image — covers entire screen */}
      <img
        src="/hero-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/70 to-ink-900/30" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/30 rounded-full blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[140px]" />

      <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 lg:px-10 max-w-7xl mx-auto">
        {/* Top bar */}
        <nav className="flex items-center justify-between pt-6 lg:pt-8 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/15">
              <svg width="20" height="20" viewBox="0 0 512 512" fill="none">
                <g stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M168 80L168 220Q168 260 198 260L198 432" />
                  <path d="M128 80L128 200" />
                  <path d="M208 80L208 200" />
                  <path d="M314 80L314 260L314 432" />
                  <path d="M314 80Q372 130 372 220Q372 260 314 260" />
                </g>
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Feaster</span>
          </div>
          <Link
            to="/system/login"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Restaurant Login
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Hero text */}
        <div className="pb-10 sm:pb-16 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-semibold mb-6">
            <Sparkles className="w-3 h-3 text-orange-300" />
            New: Pre-order from your favorite spots
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.92] tracking-tight">
            Order food
            <br />
            <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500 bg-clip-text text-transparent">
              faster.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/70 mt-6 max-w-md leading-relaxed">
            Scan, order, and eat. Skip the queue and order from your phone — no app required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              to="/explore"
              className="group flex items-center justify-center gap-2.5 bg-white hover:bg-orange-50 text-ink-900 px-7 py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] shadow-pop"
            >
              Browse Restaurants
              <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/system/login"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white px-7 py-4 rounded-2xl font-semibold text-base border border-white/15 transition-all active:scale-[0.98]"
            >
              I'm a Restaurant
            </Link>
          </div>

          {/* Quick highlight pills */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-10 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-orange-300" />
              </div>
              No queues
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5 text-orange-300" />
              </div>
              Works on any phone
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              </div>
              Pre-order ahead
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
