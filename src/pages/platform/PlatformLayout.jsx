import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Building2, PlusCircle, LogOut, Shield, Mail, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const PLATFORM_ADMINS = (import.meta.env.VITE_PLATFORM_ADMINS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

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
      if (!PLATFORM_ADMINS.includes(cred.user.email)) {
        setError('This account does not have platform admin access.')
      }
    } catch {
      setError('Invalid email or password.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Feaster Platform</h1>
          <p className="text-gray-400 mt-1">Admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="admin@feaster.app"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <Link to="/" className="block text-center text-sm text-gray-600 hover:text-gray-400 mt-6">
          Back to Feaster
        </Link>
      </div>
    </div>
  )
}

export default function PlatformLayout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-3 border-orange-400 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Must be logged in
  if (!user) return <PlatformLogin />

  // Must be an authorized admin
  if (!PLATFORM_ADMINS.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-gray-400 mt-1">This account doesn't have platform access.</p>
          <button onClick={logout} className="text-orange-400 text-sm font-medium mt-4 hover:text-orange-300">
            Sign out and try another account
          </button>
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
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold">Feaster Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <button onClick={logout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

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

      <main className="max-w-6xl mx-auto p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}
