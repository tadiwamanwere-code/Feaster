import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, User, Package } from 'lucide-react'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { useEffect } from 'react'

const tabs = [
  { to: '/app', icon: Home, label: 'Browse', end: true },
  { to: '/app/orders', icon: Package, label: 'Orders' },
  { to: '/app/cart', icon: ShoppingBag, label: 'Cart' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

export default function CustomerLayout() {
  const { user, loading } = useCustomerAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/app/auth', { replace: true })
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-3 text-xs ${
                  isActive ? 'text-orange-600' : 'text-gray-500'
                }`
              }
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
