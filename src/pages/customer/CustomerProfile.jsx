import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, LogOut, Trash2 } from 'lucide-react'

export default function CustomerProfile() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    setName(localStorage.getItem('feaster:name') || '')
    setPhone(localStorage.getItem('feaster:phone') || '')
    try {
      const orders = JSON.parse(localStorage.getItem('feaster:orders') || '[]')
      setOrderCount(orders.length)
    } catch { setOrderCount(0) }
  }, [])

  const save = () => {
    localStorage.setItem('feaster:name', name.trim())
    localStorage.setItem('feaster:phone', phone.trim())
    alert('Saved')
  }

  const reset = () => {
    if (!window.confirm('Clear all your saved info and start over?')) return
    localStorage.removeItem('feaster:name')
    localStorage.removeItem('feaster:phone')
    localStorage.removeItem('feaster:cart')
    navigate('/welcome', { replace: true })
  }

  const clearOrders = () => {
    if (!window.confirm('Delete order history?')) return
    localStorage.removeItem('feaster:orders')
    setOrderCount(0)
  }

  return (
    <div className="min-h-[100dvh] bg-white px-5 pt-7">
      <h1 className="text-2xl font-black text-black tracking-tight">Profile</h1>
      <p className="text-sm text-black/55 mt-1 font-medium">Your details for ordering.</p>

      {/* Avatar */}
      <div className="mt-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center font-black text-3xl">
          {name?.[0]?.toUpperCase() || '🙂'}
        </div>
        <p className="mt-3 text-base font-extrabold text-black">
          {name || 'Guest'}
        </p>
        <p className="text-xs text-black/55 font-bold">
          {orderCount} order{orderCount === 1 ? '' : 's'}
        </p>
      </div>

      {/* Form */}
      <div className="mt-8 space-y-3">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full h-14 pl-11 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-2xl text-base font-bold text-black placeholder-black/40 focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+263 77 123 4567"
            className="w-full h-14 pl-11 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-2xl text-base font-bold text-black placeholder-black/40 focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={save}
          className="w-full h-12 rounded-full bg-black text-white font-bold text-sm active:scale-[0.97] transition-transform"
        >
          Save
        </button>
      </div>

      {/* Maintenance */}
      <div className="mt-10 space-y-2">
        {orderCount > 0 && (
          <button
            onClick={clearOrders}
            className="w-full h-12 rounded-full bg-white border border-black/15 text-black/65 font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear order history
          </button>
        )}
        <button
          onClick={reset}
          className="w-full h-12 rounded-full bg-white border border-black/15 text-black/65 font-bold text-sm flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Reset and start over
        </button>
      </div>
    </div>
  )
}
