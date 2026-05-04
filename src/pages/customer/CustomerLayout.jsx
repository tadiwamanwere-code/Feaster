import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, User } from 'lucide-react'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { useEffect } from 'react'

const tabs = [
  { to: '/app',         icon: Home,          label: 'Home',    end: true },
  { to: '/app/orders',  icon: ClipboardList, label: 'Orders' },
  { to: '/app/profile', icon: User,          label: 'Profile' },
]

export default function CustomerLayout() {
  const { user, loading } = useCustomerAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/app/auth', { replace: true })
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="w-8 h-8 border-4 border-feaster-yellow border-t-feaster-black rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-cream-50 pb-28">
      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>

      {/* Floating black pill nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div
          className="max-w-[360px] mx-auto bg-feaster-black rounded-full px-2 py-2 flex items-stretch gap-1 pointer-events-auto"
          style={{ boxShadow: '0 14px 32px -10px rgba(10,10,10,0.55), 0 4px 10px -2px rgba(10,10,10,0.35)' }}
        >
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative h-12 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden transition-all duration-300 ease-out ${
                  isActive
                    ? 'flex-[2] bg-white text-feaster-black px-5 gap-2'
                    : 'flex-1 text-white/85 hover:text-white px-2'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon className="w-5 h-5 shrink-0" strokeWidth={2.4} />
                  <span
                    className={`whitespace-nowrap transition-all duration-300 ${
                      isActive ? 'max-w-[80px] opacity-100' : 'max-w-0 opacity-0'
                    }`}
                  >
                    {t.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
