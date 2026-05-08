import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, PlusCircle, QrCode, Users,
  ShoppingBag, LogOut, Shield, Mail, Lock, Menu as MenuIcon, X, Loader,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const PLATFORM_ADMINS = (import.meta.env.VITE_PLATFORM_ADMINS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

const NAV = [
  { to: '/platform',             label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { to: '/platform/restaurants', label: 'Restaurants',    icon: Building2 },
  { to: '/platform/orders',      label: 'Orders',         icon: ShoppingBag },
  { to: '/platform/customers',   label: 'Customers',      icon: Users },
  { to: '/platform/qr-codes',    label: 'QR Codes',       icon: QrCode },
  { to: '/platform/add',         label: 'Add Restaurant', icon: PlusCircle },
]

function PlatformLogin() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const cred = await login(email, password)
      if (PLATFORM_ADMINS.length > 0 && !PLATFORM_ADMINS.includes(cred.user.email)) {
        setError('This account does not have platform admin access.')
      }
    } catch {
      setError('Invalid email or password.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight">Feaster Platform</h1>
          <p className="text-sm text-black/55 mt-1 font-medium">Admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-black/10 p-6 space-y-4">
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-xl text-sm font-bold text-black focus:outline-none transition-colors"
                placeholder="admin@feaster.app"
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-xl text-sm font-bold text-black focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-black text-white font-extrabold disabled:opacity-50 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <Link to="/" className="block text-center text-sm text-black/45 hover:text-black mt-6 font-semibold">
          ← Back to Feaster
        </Link>
      </div>
    </div>
  )
}

export default function PlatformLayout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <Loader className="w-8 h-8 text-black animate-spin" />
      </div>
    )
  }

  if (!user) return <PlatformLogin />

  if (PLATFORM_ADMINS.length > 0 && !PLATFORM_ADMINS.includes(user.email)) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight">Access denied</h1>
          <p className="text-sm text-black/55 mt-3 font-medium">
            This account doesn't have platform access.
          </p>

          {/* Show the signed-in email so they know what to whitelist */}
          <div className="mt-5 bg-[#F4F4F4] rounded-xl px-4 py-3 inline-flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/50">
              Signed in as
            </span>
            <span className="text-sm font-bold text-black truncate max-w-[260px]">
              {user.email}
            </span>
          </div>

          <p className="text-xs text-black/55 mt-5 leading-relaxed">
            Add this email to <code className="font-mono bg-[#F4F4F4] rounded px-1 py-0.5">VITE_PLATFORM_ADMINS</code> in your environment, redeploy, then sign back in.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => logout('/system/login')}
              className="px-5 h-11 rounded-full bg-black text-white text-sm font-extrabold active:scale-95 transition-transform"
            >
              Sign out
            </button>
            <Link
              to="/"
              className="px-5 h-11 rounded-full bg-white border-2 border-black/15 text-black text-sm font-extrabold flex items-center justify-center hover:border-black transition-colors"
            >
              Back to Feaster
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[var(--color-academic-paper)] border-r border-[var(--color-academic-border)] transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 h-14 flex items-center justify-between border-b border-[var(--color-academic-border)]">
            <Link to="/platform" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              </div>
              <div className="leading-tight">
                <span className="block font-semibold text-black text-[13px] tracking-tight">Feaster</span>
                <span className="block text-[9px] text-[var(--color-academic-muted)] font-bold tracking-[0.18em] uppercase">Platform</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-8 h-8 rounded-md hover:bg-[var(--color-academic-soft)] text-[var(--color-academic-muted)] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(item => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
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
          </nav>

          <div className="px-3 py-3 border-t border-[var(--color-academic-border)]">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-black truncate">{user.email}</p>
                <p className="text-[10px] text-[var(--color-academic-muted)] font-medium">Platform Admin</p>
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-14 bg-white border-b border-black/10 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-black/5 rounded-lg text-black/65"
            aria-label="Open menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <span className="ml-3 font-extrabold text-black text-sm">Feaster Platform</span>
        </header>

        <main className="flex-1 p-5 lg:p-8 overflow-auto w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
