import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Bell, ChevronDown, MapPin, Heart, SlidersHorizontal, Star, Clock } from 'lucide-react'
import { getRestaurants, getPopularMenuItems } from '../../lib/services'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { getMyAddresses } from '../../lib/customers'

const CUISINE_EMOJI = {
  pizza: '🍕', burgers: '🍔', burger: '🍔', chicken: '🍗', sushi: '🍣',
  noodles: '🍜', indian: '🍛', biryani: '🍛', chinese: '🥡', thai: '🍜',
  desserts: '🍰', dessert: '🍰', drinks: '🥤', coffee: '☕',
  breakfast: '🥞', salad: '🥗', salads: '🥗', african: '🍲', local: '🍲',
  bbq: '🍖', seafood: '🦐', vegan: '🥬', mexican: '🌮', italian: '🍝',
  pasta: '🍝', wraps: '🌯', sandwich: '🥪', shawarma: '🌯', grill: '🍖',
}

function emojiFor(name) {
  if (!name) return '🍽️'
  const k = name.toLowerCase().trim()
  return CUISINE_EMOJI[k] || '🍽️'
}

export default function CustomerHome() {
  const { profile } = useCustomerAuth()
  const [restaurants, setRestaurants] = useState([])
  const [items, setItems] = useState([])
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCuisine, setActiveCuisine] = useState('all')
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('feaster:favs') || '[]')) }
    catch { return new Set() }
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([getRestaurants(), getPopularMenuItems({ limit: 24 })])
      .then(([r, i]) => {
        if (cancelled) return
        setRestaurants(r); setItems(i)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    if (profile) getMyAddresses().then(setAddresses).catch(() => {})

    return () => { cancelled = true }
  }, [profile])

  const cuisines = useMemo(() => {
    const set = new Map()
    restaurants.forEach(r => {
      const c = (r.cuisine_type || '').trim()
      if (c) set.set(c.toLowerCase(), c)
    })
    return ['all', ...Array.from(set.values())]
  }, [restaurants])

  const featured = useMemo(() => {
    return restaurants.find(r => r.cover_photo_url) || restaurants[0] || null
  }, [restaurants])

  const filteredItems = useMemo(() => {
    let list = items
    if (activeCuisine !== 'all') {
      const k = activeCuisine.toLowerCase()
      list = list.filter(i =>
        (i.category || '').toLowerCase().includes(k) ||
        (i.restaurants?.cuisine_type || '').toLowerCase() === k
      )
    }
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.restaurants?.name || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, activeCuisine, query])

  const filteredRestaurants = useMemo(() => {
    if (!query) return restaurants
    const q = query.toLowerCase()
    return restaurants.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.cuisine_type || '').toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q)
    )
  }, [restaurants, query])

  const toggleFav = (id) => {
    setFavs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      try { localStorage.setItem('feaster:favs', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const deliverTo = addresses.find(a => a.is_default) || addresses[0]
  const firstName = (profile?.full_name || '').split(' ')[0]
  const greeting = firstName ? `Hi, ${firstName}` : 'Welcome'

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <Link to="/app/profile" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white font-bold shadow-soft">
              {firstName?.[0]?.toUpperCase() || '🙂'}
            </div>
            <div className="text-left">
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">
                Deliver to <ChevronDown className="inline w-3 h-3 -mt-0.5" />
              </div>
              <div className="text-sm font-semibold text-ink-900 truncate max-w-[180px]">
                {deliverTo?.line1 || deliverTo?.label || 'Set your address'}
              </div>
            </div>
          </Link>
          <Link
            to="/app/orders"
            aria-label="Notifications"
            className="relative w-11 h-11 rounded-full bg-white border border-ink-200/50 flex items-center justify-center hover:border-orange-300 transition-colors"
          >
            <Bell className="w-5 h-5 text-ink-700" />
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900 tracking-tight">{greeting} 👋</h1>
        <p className="text-sm text-ink-500">What would you like to eat today?</p>
      </header>

      {/* Search */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search food or restaurant..."
              className="w-full h-12 pl-11 pr-4 bg-white border border-ink-200/40 rounded-2xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
            />
          </div>
          <button
            aria-label="Filters"
            className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-pop active:scale-95 transition-transform"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Special offers / featured */}
      {featured && !query && (
        <section className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-ink-900">Special offers</h2>
            <Link to="/app" className="text-xs font-semibold text-orange-600">See all</Link>
          </div>
          <Link
            to={`/app/r/${featured.slug}`}
            className="block relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 shadow-pop"
          >
            <div className="relative z-10 max-w-[55%]">
              <div className="text-4xl font-black leading-none">30%</div>
              <div className="text-base font-semibold mt-1 leading-tight">
                Off your first order at
              </div>
              <div className="text-lg font-bold mt-0.5 truncate">{featured.name}</div>
              <span className="inline-block mt-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[11px] font-semibold uppercase tracking-wider">
                Order Now →
              </span>
            </div>
            {featured.cover_photo_url && (
              <img
                src={featured.cover_photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute -right-6 -bottom-4 w-44 h-44 rounded-full object-cover border-[6px] border-white/30"
              />
            )}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/15 rounded-full blur-2xl" />
          </Link>
        </section>
      )}

      {/* Cuisine chips */}
      {cuisines.length > 1 && (
        <section className="pt-5 pb-1">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2">
            {cuisines.map(c => {
              const active = activeCuisine === c.toLowerCase()
              const label = c === 'all' ? 'All' : c
              return (
                <button
                  key={c}
                  onClick={() => setActiveCuisine(c.toLowerCase())}
                  className={`shrink-0 flex items-center gap-2 px-4 h-11 rounded-full font-semibold text-sm transition-all ${
                    active
                      ? 'bg-orange-600 text-white shadow-pop'
                      : 'bg-white text-ink-700 border border-ink-200/40 hover:border-orange-300'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base ${active ? 'bg-white/20' : 'bg-cream-100'}`}>
                    {c === 'all' ? '🍽️' : emojiFor(c)}
                  </span>
                  {label}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Popular Food grid */}
      <section className="px-5 pt-4 pb-28">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-ink-900">
            {query ? 'Results' : 'Popular Food'}
          </h2>
          {!query && (
            <button className="text-xs font-semibold text-orange-600">View All →</button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[5/7] bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const r = item.restaurants
              return (
                <li key={item.id}>
                  <Link
                    to={`/app/r/${r?.slug}/item/${item.id}`}
                    className="block bg-white rounded-2xl border border-ink-200/30 overflow-hidden hover:shadow-soft transition-all active:scale-[0.98]"
                  >
                    <div className="relative aspect-square bg-cream-100">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFav(item.id) }}
                        aria-label="Favourite"
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-soft active:scale-90 transition-transform"
                      >
                        <Heart
                          className={`w-4 h-4 ${favs.has(item.id) ? 'fill-red-500 text-red-500' : 'text-ink-700'}`}
                        />
                      </button>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur rounded-full text-[11px] font-bold text-ink-900 shadow-soft">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {Number(r?.rating || 4.8).toFixed(1)}
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-orange-600 text-white rounded-full text-[11px] font-bold shadow-pop">
                        ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-ink-900 truncate">{item.name}</h3>
                      <p className="text-[11px] text-ink-500 truncate">{r?.name}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-400">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {r?.city || '—'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          20–30 min
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : query && filteredRestaurants.length > 0 ? (
          <ul className="space-y-3">
            {filteredRestaurants.map(r => (
              <li key={r.id}>
                <Link
                  to={`/app/r/${r.slug}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-ink-200/30 p-3 hover:shadow-soft transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-cream-100 overflow-hidden shrink-0">
                    {r.logo_url ? (
                      <img src={r.logo_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">{emojiFor(r.cuisine_type)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink-900 truncate">{r.name}</h3>
                    <p className="text-xs text-ink-500 truncate">{r.cuisine_type} · {r.city}</p>
                    {r.rating && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                        <Star className="w-3 h-3 fill-orange-500 text-orange-500" /> {Number(r.rating).toFixed(1)}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-ink-200/30">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm font-semibold text-ink-700">
              {query ? 'No matches' : 'Nothing here yet'}
            </p>
            <p className="text-xs text-ink-400 mt-1">
              {query ? 'Try a different search' : 'New restaurants coming soon'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
