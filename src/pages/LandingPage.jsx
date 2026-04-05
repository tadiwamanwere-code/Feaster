import { Link } from 'react-router-dom'
import { ArrowRight, MonitorSmartphone, QrCode, Clock, ShoppingBag, Utensils, Tablet } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600" />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 2px, transparent 2px)', backgroundSize: '40px 40px' }} />

        <div className="relative px-4 pt-8 pb-16 sm:pt-16 sm:pb-24">
          {/* Nav */}
          <nav className="max-w-5xl mx-auto flex items-center justify-between mb-16 sm:mb-24">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 512 512" fill="none">
                  <g stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M168 80L168 220Q168 260 198 260L198 432"/>
                    <path d="M128 80L128 200"/>
                    <path d="M208 80L208 200"/>
                    <path d="M314 80L314 260L314 432"/>
                    <path d="M314 80Q372 130 372 220Q372 260 314 260"/>
                  </g>
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Feaster</span>
            </div>
            <Link
              to="/system/login"
              className="text-sm text-white/80 hover:text-white font-medium px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
            >
              System Login
            </Link>
          </nav>

          {/* Hero content */}
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
              Order food<br />
              <span className="text-yellow-300">faster.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mt-4 max-w-lg mx-auto">
              Scan a QR code. Browse the menu. Order from your phone. Skip the queue. Eat happy.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link
                to="/explore"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-orange-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg shadow-orange-900/20"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/system/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-colors"
              >
                <Tablet className="w-5 h-5" />
                System Login
              </Link>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: QrCode, title: 'Scan', desc: 'Scan the QR code on your table or open the restaurant link', color: 'bg-orange-100 text-orange-600' },
            { icon: ShoppingBag, title: 'Order', desc: 'Browse the menu, add items to your cart, and checkout', color: 'bg-blue-100 text-blue-600' },
            { icon: Utensils, title: 'Eat', desc: 'Your food arrives at your table. No queues, no waiting at the counter', color: 'bg-green-100 text-green-600' },
          ].map(step => (
            <div key={step.title} className="text-center">
              <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-4`}>
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{step.title}</h3>
              <p className="text-gray-500 mt-1 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-50 px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Three ways to order
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: QrCode, title: 'Dine In', desc: 'Scan the QR code at your table. Order goes straight to the kitchen. Food arrives at your seat.', tag: 'In-store' },
              { icon: Clock, title: 'Pre-Order', desc: 'Order from home or office. Pick a date and time. Walk in and your meal is ready.', tag: 'Schedule ahead' },
              { icon: ShoppingBag, title: 'Takeout', desc: 'Order remotely. Select a pickup time. Arrive and collect — no queue.', tag: 'Grab & go' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all">
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">{f.tag}</span>
                <div className="mt-4">
                  <f.icon className="w-8 h-8 text-gray-900 mb-3" />
                  <h3 className="font-semibold text-gray-900 text-lg">{f.title}</h3>
                  <p className="text-gray-500 mt-2 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* For restaurants */}
      <div className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-center">
            <MonitorSmartphone className="w-10 h-10 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Are you a restaurant?
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Get Feaster for your restaurant. Receive orders in real-time, manage your menu, and serve customers faster.
            </p>
            <Link
              to="/system/login"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
            >
              <Tablet className="w-4 h-4" />
              Restaurant Login
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 512 512" fill="none">
                <g stroke="white" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M168 80L168 220Q168 260 198 260L198 432"/>
                  <path d="M128 80L128 200"/>
                  <path d="M208 80L208 200"/>
                  <path d="M314 80L314 260L314 432"/>
                  <path d="M314 80Q372 130 372 220Q372 260 314 260"/>
                </g>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">Feaster</span>
          </div>
          <p className="text-xs text-gray-400">Built in Zimbabwe. Serving Africa.</p>
        </div>
      </footer>
    </div>
  )
}
