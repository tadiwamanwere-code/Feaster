import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Package, ShoppingBag, User } from 'lucide-react'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { useCart } from '../../context/CartContext'
import { useEffect } from 'react'

const tabs = [
  { to: '/app',         icon: Home,        label: 'Home',    end: true },
  { to: '/app/orders',  icon: Package,     label: 'Orders' },
  { to: '/app/cart',    icon: ShoppingBag, label: 'Cart' },
  { to: '/app/profile', icon: User,        label: 'Profile' },
]

export default function CustomerLayout() {
  const { user, loading } = useCustomerAuth()
  const navigate = useNavigate()
  const { itemCount } = useCart()

  useEffect(() => {
    if (!loading && !user) navigate('/app/auth', { replace: true })
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 bg-cream-50/85 backdrop-blur-md"
      >
        <div className="max-w-2xl mx-auto bg-white rounded-full border border-ink-200/40 shadow-shell px-2 py-1.5 flex items-center justify-between">
          {tabs.map(t => {
            const isCart = t.to === '/app/cart'
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `relative flex items-center justify-center gap-2 px-3 h-11 rounded-full font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-pop'
                      : 'text-ink-500 hover:text-ink-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <t.icon className="w-5 h-5 shrink-0" />
                    {isActive && <span className="text-[13px]">{t.label}</span>}
                    {isCart && itemCount > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isActive ? 'bg-white text-orange-600' : 'bg-orange-600 text-white'
                        }`}
                      >
                        {itemCount}
                      </span>
                    )}
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
