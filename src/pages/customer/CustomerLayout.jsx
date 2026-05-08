import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const TABS = [
  { to: '/app',         icon: Home,          label: 'Home',    end: true },
  { to: '/app/cart',    icon: ShoppingBag,   label: 'Cart',    badge: true, accent: 'cart' },
  { to: '/app/orders',  icon: ClipboardList, label: 'Orders' },
  { to: '/app/profile', icon: User,          label: 'Profile' },
]

export default function CustomerLayout() {
  const location = useLocation()
  const { itemCount } = useCart()
  const [bouncing, setBouncing] = useState(false)
  const lastCount = useRef(itemCount)

  // Bounce the cart icon every time the count changes
  useEffect(() => {
    if (itemCount !== lastCount.current) {
      lastCount.current = itemCount
      setBouncing(true)
      const t = setTimeout(() => setBouncing(false), 500)
      return () => clearTimeout(t)
    }
  }, [itemCount])

  // Active tab index for the sliding indicator
  const activeIndex = TABS.findIndex(t =>
    t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
  )
  const safeIndex = activeIndex >= 0 ? activeIndex : 0

  return (
    <div className="min-h-[100dvh] bg-white pb-28">
      <main key={location.pathname} className="max-w-2xl mx-auto page-fade-in">
        <Outlet />
      </main>

      {/* Floating black-pill bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div
          className="relative max-w-[420px] mx-auto bg-[#1F1F1F] rounded-full p-2 grid grid-cols-4 pointer-events-auto"
          style={{ boxShadow: '0 18px 36px -12px rgba(0,0,0,0.45)' }}
        >
          {/* Sliding gray pill */}
          <div
            className="absolute top-2 bottom-2 left-2 rounded-full bg-[#3A3A3A] transition-transform duration-300 ease-out pointer-events-none"
            style={{
              width: 'calc((100% - 16px) / 4)',
              transform: `translateX(${safeIndex * 100}%)`,
            }}
          />

          {TABS.map(t => {
            const isCart = t.accent === 'cart'
            const cartActive = isCart && itemCount > 0
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `relative z-10 flex items-center justify-center gap-1.5 h-12 rounded-full font-bold text-sm transition-colors ${
                    isActive ? 'text-white' : 'text-white/60 hover:text-white/90'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative shrink-0 ${bouncing && isCart ? 'cart-bounce' : ''}`}
                    >
                      <t.icon
                        className={`w-5 h-5 transition-colors ${
                          cartActive
                            ? 'text-[var(--color-cart)]'
                            : isActive ? 'text-white' : ''
                        }`}
                        strokeWidth={2.4}
                      />
                      {t.badge && itemCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ring-2 ring-[#1F1F1F] bg-[var(--color-cart)] text-white"
                        >
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </span>
                    <span
                      className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                        isActive ? 'max-w-[64px] opacity-100' : 'max-w-0 opacity-0'
                      }`}
                    >
                      {t.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
