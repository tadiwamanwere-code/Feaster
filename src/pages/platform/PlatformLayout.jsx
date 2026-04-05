import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { Building2, PlusCircle, BarChart3, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Only these emails can access platform admin
const PLATFORM_ADMINS = ['admin@feaster.app', 'tadiwamanwere@gmail.com']

export default function PlatformLayout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  // In demo mode (no Firebase auth), allow access
  const isAuthorized = !user || PLATFORM_ADMINS.includes(user.email)

  if (user && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-1">You don't have platform admin access.</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { path: '/platform', label: 'Restaurants', icon: Building2, exact: true },
    { path: '/platform/add', label: 'Add Restaurant', icon: PlusCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold">Feaster Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email || 'Demo Admin'}</span>
            <button onClick={logout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}
