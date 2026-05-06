import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Home, Bell, Navigation, LogOut, Pencil } from 'lucide-react'

export default function CustomerProfile() {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const [home, setHome] = useState('')
  const [notif, setNotif] = useState('default')
  const [loc, setLoc] = useState(null)

  useEffect(() => {
    setCity(localStorage.getItem('feaster:city') || '')
    setHome(localStorage.getItem('feaster:home') || '')
    setNotif(localStorage.getItem('feaster:notif') || 'default')
    try {
      const raw = localStorage.getItem('feaster:loc')
      setLoc(raw ? JSON.parse(raw) : null)
    } catch {}
  }, [])

  const reset = () => {
    if (!window.confirm('Reset onboarding and start over?')) return
    localStorage.removeItem('feaster:onboarded')
    localStorage.removeItem('feaster:city')
    localStorage.removeItem('feaster:home')
    localStorage.removeItem('feaster:notif')
    localStorage.removeItem('feaster:loc')
    localStorage.removeItem('feaster:cart')
    navigate('/welcome', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] bg-white px-5 pt-7">
      <h1 className="text-2xl font-black text-black tracking-tight">Profile</h1>
      <p className="text-sm text-black/55 mt-1 font-medium">Your saved info.</p>

      <ul className="mt-6 space-y-3">
        <Row icon={MapPin} label="City" value={city || 'Not set'} />
        <Row icon={Home} label="Home address" value={home || 'Not set'} />
        <Row
          icon={Bell}
          label="Notifications"
          value={notif === 'granted' ? 'Allowed' : notif === 'denied' ? 'Blocked' : 'Not asked'}
        />
        <Row
          icon={Navigation}
          label="Location"
          value={loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : 'Not shared'}
        />
      </ul>

      <button
        onClick={() => navigate('/onboarding')}
        className="mt-6 w-full h-12 rounded-full bg-[#F4F4F4] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#E5E5E5] transition-colors"
      >
        <Pencil className="w-4 h-4" /> Edit info
      </button>

      <button
        onClick={reset}
        className="mt-3 w-full h-12 rounded-full bg-white border border-black/15 text-black/60 font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Reset and start over
      </button>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <li className="flex items-center gap-3 bg-white rounded-2xl border border-black/10 p-4">
      <div className="w-10 h-10 rounded-full bg-[#F4F4F4] flex items-center justify-center">
        <Icon className="w-4 h-4 text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-black/45 font-extrabold">{label}</p>
        <p className="text-sm font-bold text-black truncate">{value}</p>
      </div>
    </li>
  )
}
