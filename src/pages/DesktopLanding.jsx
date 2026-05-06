import { Link } from 'react-router-dom'
import { Shield, Building2, UserPlus, ArrowRight, Smartphone } from 'lucide-react'

export default function DesktopLanding() {
  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Top bar */}
      <header className="px-10 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span
            className="text-3xl text-black"
            style={{ fontFamily: 'Pacifico, cursive' }}
          >
            Feaster
          </span>
        </div>

        <Link
          to="/welcome"
          className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-black/65 hover:text-black"
        >
          <Smartphone className="w-4 h-4" /> Customer App
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-10 pt-12 pb-6 text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-black/45">
          Feaster Business
        </p>
        <h1 className="mt-4 text-5xl lg:text-7xl font-black text-black tracking-tight leading-[0.95]">
          Run a smarter <br />
          <span style={{ fontFamily: 'Pacifico, cursive', fontWeight: 400 }}>restaurant.</span>
        </h1>
        <p className="mt-6 text-base lg:text-lg text-black/60 max-w-2xl mx-auto leading-relaxed">
          One tool for orders, tables, kitchen, and pre-orders.
          Sign in below — or list your restaurant in minutes.
        </p>
      </section>

      {/* Three platforms */}
      <section className="max-w-5xl mx-auto px-10 py-10">
        <div className="grid md:grid-cols-3 gap-5">
          <PlatformCard
            icon={UserPlus}
            kicker="New here?"
            title="List your restaurant"
            desc="Sign up your business in 60 seconds — free to start."
            cta="Sign Up"
            href="/restaurant/signup"
            primary
          />
          <PlatformCard
            icon={Building2}
            kicker="Already onboard?"
            title="Restaurant Login"
            desc="Manage menu, tables, kitchen, orders and pre-orders."
            cta="Sign In"
            href="/system/login"
          />
          <PlatformCard
            icon={Shield}
            kicker="Platform team"
            title="Admin Console"
            desc="Manage all restaurants, payments, and platform settings."
            cta="Admin Login"
            href="/platform"
          />
        </div>
      </section>

      {/* Footer band */}
      <section className="border-t border-black/10 mt-10">
        <div className="max-w-5xl mx-auto px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-black/55 font-medium">
            <span className="font-bold text-black">Feaster</span> · Order Food Faster
          </p>
          <div className="flex items-center gap-6">
            <Link to="/welcome" className="text-black/65 hover:text-black font-bold">
              Customer App
            </Link>
            <a href="mailto:hello@feaster.app" className="text-black/65 hover:text-black font-bold">
              Contact
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

function PlatformCard({ icon: Icon, kicker, title, desc, cta, href, primary }) {
  return (
    <Link
      to={href}
      className={`group relative flex flex-col rounded-3xl p-7 transition-all duration-200 ${
        primary
          ? 'bg-black text-white border-2 border-black hover:-translate-y-0.5'
          : 'bg-white text-black border-2 border-black/10 hover:border-black hover:-translate-y-0.5'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
          primary ? 'bg-white text-black' : 'bg-black text-white'
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={2.4} />
      </div>

      <p className={`mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] ${primary ? 'text-white/55' : 'text-black/45'}`}>
        {kicker}
      </p>
      <h3 className="mt-1 text-2xl font-black tracking-tight">{title}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${primary ? 'text-white/70' : 'text-black/60'}`}>
        {desc}
      </p>

      <div className="flex-1 min-h-[12px]" />

      <span
        className={`mt-6 inline-flex items-center gap-2 text-sm font-extrabold ${
          primary ? 'text-white' : 'text-black'
        }`}
      >
        {cta}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
