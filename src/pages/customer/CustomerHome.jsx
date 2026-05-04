import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, MapPin, ShoppingBag, ChevronDown } from 'lucide-react'
import { getRestaurants } from '../../lib/services'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { useCart } from '../../context/CartContext'
import { getMyAddresses } from '../../lib/customers'

const CUISINE_EMOJI = {
  pizza: '🍕', burger: '🍔', burgers: '🍔', chicken: '🍗', sushi: '🍣',
  noodles: '🍜', indian: '🍛', biryani: '🍛', chinese: '🥡', thai: '🍜',
  desserts: '🍰', dessert: '🍰', drinks: '🥤', coffee: '☕',
  breakfast: '🥞', salad: '🥗', salads: '🥗', african: '🍲', local: '🍲',
  bbq: '🍖', seafood: '🦐', vegan: '🥬', mexican: '🌮', italian: '🍝',
  pasta: '🍝', wraps: '🌯', sandwich: '🥪', shawarma: '🌯', grill: '🍖',
}
const emojiFor = (n) => CUISINE_EMOJI[(n || '').toLowerCase().trim()] || '🍽️'

export default function CustomerHome() {
  const { profile } = useCustomerAuth()
  const { itemCount } = useCart()
  const [restaurants, setRestaurants] = useState([])
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCuisine, setActiveCuisine] = useState('all')

  useEffect(() => {
    let cancelled = false
    getRestaurants()
      .then(d => { if (!cancelled) setRestaurants(d) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    if (profile) getMyAddresses().then(setAddresses).catch(() => {})
    return () => { cancelled = true }
  }, [profile])

  const cuisines = useMemo(() => {
    const map = new Map()
    restaurants.forEach(r => {
      const c = (r.cuisine_type || '').trim()
      if (c) map.set(c.toLowerCase(), c)
    })
    return ['all', ...Array.from(map.values())]
  }, [restaurants])

  const filtered = useMemo(() => {
    let list = restaurants
    if (activeCuisine !== 'all') {
      list = list.filter(r => (r.cuisine_type || '').toLowerCase() === activeCuisine)
    }
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.cuisine_type || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [restaurants, activeCuisine, query])

  const deliverTo = addresses.find(a => a.is_default) || addresses[0]
  const firstName = (profile?.full_name || '').split(' ')[0]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <Link to="/app/profile" className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-lg"
            >
              {firstName?.[0]?.toUpperCase() || '🙂'}
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.18em] text-black/40 font-extrabold">
                Deliver to <ChevronDown className="inline w-3 h-3 -mt-0.5" />
              </div>
              <div className="text-sm font-extrabold text-black truncate max-w-[180px]">
                {deliverTo?.line1 || deliverTo?.label || 'Set your address'}
              </div>
            </div>
          </Link>

          <Link
            to="/app/cart"
            aria-label="Cart"
            className="relative w-12 h-12 rounded-full bg-black flex items-center justify-center active:scale-95 transition-transform"
          >
            <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2.4} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-white text-black text-[11px] font-extrabold flex items-center justify-center border-2 border-black">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-5">
          <h1 className="text-2xl font-black text-black tracking-tight">
            {firstName ? `Hey ${firstName}` : 'Hello there'} 👋
          </h1>
          <p className="text-sm text-black/55 font-medium">What would you like to eat today?</p>
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, cuisines, cities"
            className="w-full h-12 pl-11 pr-4 bg-white border-2 border-black/10 rounded-full text-sm font-medium focus:outline-none focus:border-black transition-colors"
          />
        </div>
      </div>

      {/* Cuisine chips */}
      {cuisines.length > 1 && (
        <section className="pt-1 pb-2">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 pb-2">
            {cuisines.map(c => {
              const active = activeCuisine === c.toLowerCase()
              const label = c === 'all' ? 'All' : c
              return (
                <button
                  key={c}
                  onClick={() => setActiveCuisine(c.toLowerCase())}
                  className={`shrink-0 flex items-center gap-2 px-4 h-10 rounded-full font-bold text-sm transition-all ${
                    active
                      ? 'bg-black text-white'
                      : 'bg-white text-black/75 border border-black/15'
                  }`}
                >
                  <span className="text-base leading-none">
                    {c === 'all' ? '🍽️' : emojiFor(c)}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Restaurant list */}
      <section className="px-5 pt-3 pb-32">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-black">
            {query ? `Results (${filtered.length})` : 'Restaurants'}
          </h2>
          {!query && filtered.length > 0 && (
            <span className="text-xs text-black/40 font-bold">{filtered.length} open</span>
          )}
        </div>

        {loading ? (
          <ul className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <li key={i} className="h-20 bg-white rounded-full animate-pulse" />
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border-2 border-black/10">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm font-bold text-black">
              {query ? 'No matches' : 'Nothing here yet'}
            </p>
            <p className="text-xs text-black/40 mt-1">
              {query ? 'Try a different search' : 'New restaurants coming soon'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map(r => (
              <li key={r.id}>
                <Link
                  to={`/app/r/${r.slug}`}
                  className="group flex items-center gap-3 bg-white rounded-full pl-2 pr-4 py-2 border-2 border-black/10 hover:border-black active:scale-[0.99] transition-all"
                >
                  {/* Circular avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#F4F4F4] shrink-0 ring-2 ring-black/5 group-hover:ring-black transition-all">
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : r.cover_photo_url ? (
                      <img
                        src={r.cover_photo_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {emojiFor(r.cuisine_type)}
                      </div>
                    )}
                  </div>

                  {/* Tag content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-extrabold text-black truncate text-[15px]">
                        {r.name}
                      </h3>
                      {r.rating && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 bg-black rounded-full text-[11px] font-extrabold text-white">
                          <Star className="w-3 h-3 fill-white text-white" />
                          {Number(r.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-black/55 font-medium truncate">
                      <span className="font-semibold text-black/75 truncate">
                        {r.cuisine_type || 'Restaurant'}
                      </span>
                      {r.city && (
                        <>
                          <span className="text-black/40">·</span>
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" /> {r.city}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
