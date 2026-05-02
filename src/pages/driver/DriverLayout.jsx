import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Briefcase, Wallet, User, Power } from 'lucide-react'
import { useDriverAuth } from '../../context/DriverAuthContext'
import { setDriverOnline, updateDriverLocation } from '../../lib/drivers'

const tabs = [
  { to: '/driver', icon: Briefcase, label: 'Jobs', end: true },
  { to: '/driver/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/driver/profile', icon: User, label: 'Profile' },
]

export default function DriverLayout() {
  const navigate = useNavigate()
  const { user, driver, loading, refresh } = useDriverAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (loading) return
    if (!user) return navigate('/driver/auth', { replace: true })
    if (!driver) return navigate('/driver/onboarding', { replace: true })
    if (driver.kyc_status !== 'approved') return navigate('/driver/onboarding', { replace: true })
  }, [user, driver, loading, navigate])

  // Live location updates while online
  useEffect(() => {
    if (!driver?.is_online || !navigator.geolocation) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    const send = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateDriverLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {}),
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      )
    }
    send()
    intervalRef.current = setInterval(send, 30000)
    return () => clearInterval(intervalRef.current)
  }, [driver?.is_online])

  const toggleOnline = async () => {
    try {
      await setDriverOnline(!driver.is_online)
      await refresh()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading || !driver) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="font-semibold text-gray-900 text-sm">{driver.full_name}</p>
          </div>
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              driver.is_online
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {driver.is_online ? 'Online' : 'Offline'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto grid grid-cols-3">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-3 text-xs ${
                  isActive ? 'text-emerald-600' : 'text-gray-500'
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
