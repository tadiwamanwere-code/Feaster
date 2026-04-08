import { useState } from 'react'
import { Link, Navigate, Outlet, useParams, useLocation } from 'react-router-dom'
import { UtensilsCrossed, Menu as MenuIcon, X, LayoutDashboard, BookOpen, QrCode, ClipboardList, Calendar, Settings, LogOut, ChefHat, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { path: '', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/menu', label: 'Menu', icon: BookOpen },
  { path: '/tables', label: 'QR Codes & Tables', icon: QrCode },
  { path: '/orders', label: 'Orders', icon: ClipboardList },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/admin/${slug}/login`} replace />
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="px-5 h-16 flex items-center justify-between border-b border-gray-800">
            <Link to={`/admin/${slug}`} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
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
              <div>
                <span className="font-bold text-white text-sm tracking-tight">Feaster</span>
                <span className="block text-[10px] text-orange-400 font-medium -mt-0.5">ADMIN</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-gray-800 rounded-lg text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Restaurant name */}
          <div className="px-5 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 font-medium">RESTAURANT</p>
            <p className="text-sm font-semibold text-white capitalize truncate">{slug}</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-3 space-y-0.5">
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-orange-400' : ''}`} />
                  {item.label}
                </Link>
              )
            })}

            <div className="pt-3 mt-3 border-t border-gray-800 space-y-0.5">
              <Link
                to={`/kitchen/${slug}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <ChefHat className="w-[18px] h-[18px]" />
                Kitchen Display
              </Link>
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <ExternalLink className="w-[18px] h-[18px]" />
                View Menu
              </a>
            </div>
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-3">
              <div className="w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {user.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-gray-500">Restaurant Admin</p>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-gray-900/50 border-b border-gray-800 flex items-center px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-800 rounded-lg mr-3 text-gray-400"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
