import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Tablet, ArrowLeft, ChevronRight, MapPin } from 'lucide-react'
import { getRestaurants } from '../../lib/services'

export default function SystemLogin() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getRestaurants({ activeOnly: false })
      .then(data => setRestaurants(data))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
  }, [])

  const handlePinSubmit = (e) => {
    e.preventDefault()
    const rest = restaurants.find(r => r.slug === selectedSlug)
    if (!rest?.kitchen_pin) {
      setError('No PIN configured. Set one in restaurant settings.')
      return
    }
    if (pin === rest.kitchen_pin) {
      navigate(`/pos/${selectedSlug}`)
    } else {
      setError('Invalid PIN. Contact your restaurant admin.')
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4">
      {/* Background image */}
      <img
        src="/hero-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Tablet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Feaster System</h1>
          <p className="text-gray-400 mt-1">Restaurant POS & Order Management</p>
        </div>

        {!selectedSlug ? (
          /* Step 1: Select restaurant */
          <div>
            <p className="text-sm text-gray-500 mb-3 text-center">Select your restaurant</p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No restaurants found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {restaurants.map(rest => (
                  <button
                    key={rest.id}
                    onClick={() => { setSelectedSlug(rest.slug); setError('') }}
                    className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-orange-500/50 rounded-xl p-4 text-left transition-colors group"
                  >
                    {rest.logo_url ? (
                      <img src={rest.logo_url} alt="" className="w-11 h-11 rounded-lg object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-orange-600/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-orange-400">{rest.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{rest.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {rest.city} — {rest.cuisine_type}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-orange-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Enter PIN */
          <div>
            <button
              onClick={() => { setSelectedSlug(null); setPin(''); setError('') }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to restaurants
            </button>

            <div className="bg-white/10 rounded-xl p-5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Logging into</p>
              <p className="text-lg font-semibold text-white mb-5 capitalize">{selectedSlug}</p>

              <form onSubmit={handlePinSubmit}>
                <label className="text-sm text-gray-400 mb-2 block">Enter System PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setError('') }}
                  placeholder="Enter PIN"
                  className="w-full px-4 py-4 bg-black/40 border border-white/15 rounded-xl text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
                  autoFocus
                />
                {error && <p className="text-sm text-red-400 mb-3 text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={pin.length < 4}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Open Dashboard
                </button>
              </form>
            </div>
            <p className="text-xs text-gray-600 text-center mt-3">Enter the PIN set in your restaurant settings</p>
          </div>
        )}

        {/* Bottom links */}
        <div className="mt-8 text-center space-y-2">
          <Link to="/explore" className="text-sm text-gray-500 hover:text-orange-400 block">
            I'm a customer — browse restaurants
          </Link>
          <Link to="/platform" className="text-sm text-gray-600 hover:text-gray-400 block">
            Platform Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
