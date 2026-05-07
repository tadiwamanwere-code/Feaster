import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, ClipboardList, User } from 'lucide-react'

const TABS = [
  { to: '/app',         icon: Home,          label: 'Home',    end: true },
  { to: '/app/orders',  icon: ClipboardList, label: 'Orders' },
  { to: '/app/profile', icon: User,          label: 'Profile' },
]

export default function CustomerLayout() {
  const location = useLocation()

  // Active tab index for the sliding pill indicator
  const activeIndex = TABS.findIndex(t =>
    t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)
  )
  const safeIndex = activeIndex >= 0 ? activeIndex : 0

  return (
    <div className="min-h-[100dvh] bg-white pb-28">
      <main key={location.pathname} className="max-w-2xl mx-auto page-fade-in">
        <Outlet />
      </main>

      {/* Floating bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
        <div
          className="relative max-w-[360px] mx-auto bg-[#1F1F1F] rounded-full p-2 grid grid-cols-3 pointer-events-auto"
          style={{ boxShadow: '0 18px 36px -12px rgba(0,0,0,0.45)' }}
        >
          {/* Sliding gray indicator */}
          <div
            className="absolute top-2 bottom-2 left-2 rounded-full bg-[#3A3A3A] transition-transform duration-300 ease-out pointer-events-none"
            style={{
              width: 'calc((100% - 16px) / 3)',
              transform: `translateX(${safeIndex * 100}%)`,
            }}
          />

          {TABS.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative z-10 flex items-center justify-center gap-2 h-12 rounded-full font-bold text-sm transition-colors ${
                  isActive ? 'text-white' : 'text-white/60 hover:text-white/90'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon className="w-5 h-5 shrink-0" strokeWidth={2.4} />
                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                      isActive ? 'max-w-[60px] opacity-100' : 'max-w-0 opacity-0'
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
