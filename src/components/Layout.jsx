import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShoppingBag, Home, ClipboardList, Compass, MessageCircle, Tag, Menu, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { getOrderCount } from '../lib/order-store'
import PWAInstallPrompt from './PWAInstallPrompt'

function BrandMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <g stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
        <path d="M168 80L168 220Q168 260 198 260L198 432" />
        <path d="M128 80L128 200" />
        <path d="M208 80L208 200" />
        <path d="M314 80L314 260L314 432" />
        <path d="M314 80Q372 130 372 220Q372 260 314 260" />
      </g>
    </svg>
  )
}

function SidebarLink({ to, icon: Icon, label, badge, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-orange-50 text-orange-700 shadow-sm'
          : 'text-ink-500 hover:text-ink-900 hover:bg-canvas-50'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${active ? 'text-orange-600' : 'text-ink-400 group-hover:text-ink-700'}`} />
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span className={`text-xs font-semibold ${active ? 'text-orange-600' : 'text-ink-400'}`}>
          {badge}
        </span>
      )}
    </Link>
  )
}

export default function Layout() {
  const { itemCount } = useCart()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isKitchen = location.pathname.startsWith('/kitchen')
  const isAdmin = location.pathname.startsWith('/admin')
  if (isKitchen || isAdmin) return <Outlet />

  const path = location.pathname
  const slug = path.split('/')[1]
  const isExplore = path.startsWith('/explore') || path === '/'
  const isOrders = path.startsWith('/my-orders') || path.startsWith('/order/')
  const isRestaurant = !isExplore && !isOrders && slug && !path.includes('/checkout')

  const orderCount = getOrderCount()

  const navItems = [
    { to: '/explore', icon: Home, label: 'Home', active: isExplore },
    { to: '/explore', icon: Compass, label: 'Restaurants', active: isRestaurant },
    {
      to: slug && !isExplore && !isOrders ? `/${slug}/checkout` : '/explore',
      icon: ShoppingBag,
      label: 'My cart',
      badge: itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : null,
      active: path.includes('/checkout'),
    },
    { to: '/my-orders', icon: ClipboardList, label: 'History', badge: orderCount > 0 ? orderCount : null, active: isOrders },
  ]

  return (
    <div className="min-h-screen bg-canvas-100">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-canvas-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 -ml-1 flex items-center justify-center rounded-xl text-ink-700 hover:bg-canvas-50"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/explore" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <BrandMark size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink-900">Feaster</span>
          </Link>
          <Link
            to="/my-orders"
            className="w-9 h-9 -mr-1 flex items-center justify-center rounded-xl text-ink-700 hover:bg-canvas-50 relative"
            aria-label="Orders"
          >
            <ClipboardList className="w-5 h-5" />
            {orderCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </Link>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <Link to="/explore" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <BrandMark size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight text-ink-900">Feaster</span>
              </Link>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-500 hover:bg-canvas-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item, i) => (
                <SidebarLink key={i} {...item} onClick={() => setMobileNavOpen(false)} />
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-canvas-200">
              <a
                href="https://wa.me/263000000000"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:text-ink-900 hover:bg-canvas-50"
              >
                <MessageCircle className="w-[18px] h-[18px] text-ink-400" />
                Customer Support
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop shell */}
      <div className="lg:p-6 max-w-[1280px] mx-auto">
        <div className="lg:bg-white lg:rounded-3xl lg:shadow-shell lg:overflow-hidden lg:flex lg:min-h-[calc(100vh-3rem)]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-60 shrink-0 flex-col p-6 border-r border-canvas-200">
            <Link to="/explore" className="flex items-center gap-2 mb-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-pop">
                <BrandMark size={18} />
              </div>
              <span className="text-xl font-bold tracking-tight text-ink-900">Feaster</span>
            </Link>

            <nav className="flex flex-col gap-1">
              {navItems.map((item, i) => (
                <SidebarLink key={i} {...item} />
              ))}
            </nav>

            <div className="mt-auto pt-6 space-y-4">
              <a
                href="https://wa.me/263000000000"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-ink-500 hover:text-ink-900 hover:bg-canvas-50"
              >
                <MessageCircle className="w-[18px] h-[18px] text-ink-400" />
                Customer Support
              </a>

              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-canvas-50 border border-canvas-200">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">Guest</p>
                  <p className="text-[11px] text-ink-400 truncate">Order as guest</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 lg:overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <PWAInstallPrompt />

      {/* Cart FAB — mobile only (desktop uses sidebar cart link) */}
      {itemCount > 0 && !location.pathname.includes('/checkout') && (
        <div className="lg:hidden fixed bottom-5 left-0 right-0 px-4 z-40 pointer-events-none">
          <Link
            to={`/${location.pathname.split('/')[1]}/checkout`}
            className="pointer-events-auto flex items-center justify-between w-full max-w-md mx-auto bg-orange-600 text-white px-5 py-3.5 rounded-2xl shadow-pop hover:bg-orange-700 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
            </div>
            <span className="font-bold text-sm">View Cart →</span>
          </Link>
        </div>
      )}
    </div>
  )
}
