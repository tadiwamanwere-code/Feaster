import { useState } from 'react'
import { Link, Navigate, Outlet, useParams, useLocation } from 'react-router-dom'
import { UtensilsCrossed, Menu as MenuIcon, X, LayoutDashboard, BookOpen, QrCode, ClipboardList, Calendar, Settings, LogOut, ChefHat, ExternalLink, Bike } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { path: '', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/menu', label: 'Menu', icon: BookOpen },
  { path: '/tables', label: 'QR Codes & Tables', icon: QrCode },
  { path: '/orders', label: 'Orders', icon: ClipboardList },
  { path: '/deliveries', label: 'Deliveries', icon: Bike },
  { path: '/calendar', label: 'Pre-Orders', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { slug } = useParams()
  const location = useLocation()
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/admin/${slug}/login`} replace />
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#F4F4F4] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[var(--color-academic-paper)] border-r border-[var(--color-academic-border)] transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="px-4 h-14 flex items-center justify-between border-b border-[var(--color-academic-border)]">
            <Link to={`/admin/${slug}`} className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 512 512" fill="none">
                  <g stroke="white" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M168 80L168 220Q168 260 198 260L198 432"/>
                    <path d="M128 80L128 200"/>
                    <path d="M208 80L208 200"/>
                    <path d="M314 80L314 260L314 432"/>
                    <path d="M314 80Q372 130 372 220Q372 260 314 260"/>
                  </g>
                </svg>
              </div>
              <div className="leading-tight">
                <span className="font-semibold text-black text-[13px] tracking-tight">Feaster</span>
                <span className="block text-[9px] text-[var(--color-academic-muted)] font-bold tracking-[0.18em] uppercase">Admin</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-8 h-8 rounded-md hover:bg-[var(--color-academic-soft)] text-[var(--color-academic-muted)] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Restaurant name */}
          <div className="px-4 py-3 border-b border-[var(--color-academic-border)]">
            <p className="text-[10px] text-[var(--color-academic-muted)] font-bold uppercase tracking-[0.18em]">Restaurant</p>
            <p className="text-[13px] font-semibold text-black capitalize truncate mt-0.5">{slug}</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-academic-muted)]">
              Manage
            </p>
            {NAV_ITEMS.map(item => {
              const fullPath = `/admin/${slug}${item.path}`
              const isActive = location.pathname === fullPath ||
                (item.path !== '' && location.pathname.startsWith(fullPath))
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  to={fullPath}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 h-9 px-3 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-academic-soft-2)] text-black'
                      : 'text-[var(--color-academic-muted)] hover:bg-[var(--color-academic-soft)] hover:text-black'
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
                  {item.label}
                </Link>
              )
            })}

            <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-academic-muted)]">
              Tools
            </p>
            <Link
              to={`/kitchen/${slug}`}
              className="flex items-center gap-2.5 h-9 px-3 rounded-md text-[13px] font-medium text-[var(--color-academic-muted)] hover:bg-[var(--color-academic-soft)] hover:text-black transition-colors"
            >
              <ChefHat className="w-[15px] h-[15px]" strokeWidth={1.75} />
              Kitchen Display
            </Link>
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2.5 h-9 px-3 rounded-md text-[13px] font-medium text-[var(--color-academic-muted)] hover:bg-[var(--color-academic-soft)] hover:text-black transition-colors"
            >
              <ExternalLink className="w-[15px] h-[15px]" strokeWidth={1.75} />
              View Menu
            </a>
          </nav>

          {/* User */}
          <div className="px-3 py-3 border-t border-[var(--color-academic-border)]">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-black truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-[var(--color-academic-muted)] font-medium">Restaurant Admin</p>
              </div>
              <button
                onClick={logout}
                className="w-8 h-8 rounded-md hover:bg-[var(--color-academic-soft)] text-[var(--color-academic-muted)] hover:text-black flex items-center justify-center transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — only visible mobile */}
        <header className="lg:hidden h-12 bg-white border-b border-[var(--color-academic-border)] flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 -ml-1 rounded-md hover:bg-[var(--color-academic-soft)] text-[var(--color-academic-muted)] flex items-center justify-center"
            aria-label="Open menu"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
          <span className="ml-3 text-[13px] font-semibold text-black tracking-tight capitalize">
            {slug}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
