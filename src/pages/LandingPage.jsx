import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] flex flex-col overflow-hidden">
      {/* Background image — covers entire screen */}
      <img
        src="/hero-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-[100dvh] px-6">
        {/* Top bar */}
        <nav className="flex items-center justify-between pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 512 512" fill="none">
                <g stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M168 80L168 220Q168 260 198 260L198 432"/>
                  <path d="M128 80L128 200"/>
                  <path d="M208 80L208 200"/>
                  <path d="M314 80L314 260L314 432"/>
                  <path d="M314 80Q372 130 372 220Q372 260 314 260"/>
                </g>
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Feaster</span>
          </div>
          <Link
            to="/system/login"
            className="text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            Restaurant Login
          </Link>
        </nav>

        {/* Spacer — pushes content to bottom */}
        <div className="flex-1" />

        {/* Hero text + buttons — anchored to bottom */}
        <div className="pb-10 sm:pb-16">
          <h1 className="text-5xl sm:text-7xl font-black text-white leading-[0.95] tracking-tight">
            Order food
            <br />
            <span className="text-orange-400">faster.</span>
          </h1>

          <p className="text-base sm:text-lg text-white/60 mt-4 max-w-sm leading-relaxed">
            Scan. Order. Eat. Skip the queue and order from your phone.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              to="/explore"
              className="group flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-400 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/system/login"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white px-8 py-4 rounded-2xl font-semibold text-base border border-white/10 transition-all active:scale-[0.98]"
            >
              I'm a Restaurant
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
