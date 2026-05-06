import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Star } from 'lucide-react'
import { getRestaurants } from '../../lib/services'

export default function CustomerHome() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const city = '' // no onboarded city — show by city sections regardless

  useEffect(() => {
    let cancelled = false
    getRestaurants()
      .then(d => { if (!cancelled) setRestaurants(d) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!query) return restaurants
    const q = query.toLowerCase()
    return restaurants.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.cuisine_type || '').toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q)
    )
  }, [restaurants, query])

  // Group restaurants by city, with the user's city first
  const byCity = useMemo(() => {
    const map = new Map()
    for (const r of filtered) {
      const key = r.city || 'Unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    const entries = Array.from(map.entries())
    entries.sort(([a], [b]) => {
      if (a === city) return -1
      if (b === city) return 1
      return a.localeCompare(b)
    })
    return entries
  }, [filtered, city])

  // Promo slides — first 5 restaurants with cover photos
  const promos = useMemo(
    () => restaurants.filter(r => r.cover_photo_url).slice(0, 5),
    [restaurants]
  )

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Header */}
      <header className="px-5 pt-7 pb-3">
        <p className="text-xs uppercase tracking-[0.18em] text-black/45 font-extrabold">
          Pre-Order
        </p>
        <h1 className="text-2xl font-black text-black tracking-tight mt-1">Pick a restaurant</h1>
      </header>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, cuisines, dishes"
            className="w-full h-12 pl-11 pr-4 bg-[#F4F4F4] rounded-full text-sm font-medium text-black placeholder-black/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black transition-all"
          />
        </div>
      </div>

      {/* Promo carousel — only when not searching */}
      {!query && promos.length > 0 && <PromoCarousel promos={promos} />}

      {/* Restaurants grouped by city */}
      <div className="pt-2 pb-4">
        {loading ? (
          <div className="px-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-[#F4F4F4] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-5 bg-white rounded-3xl p-8 text-center border border-black/10">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-sm font-bold text-black">
              {query ? 'No matches' : 'Nothing here yet'}
            </p>
            <p className="text-xs text-black/45 mt-1">
              {query ? 'Try a different search' : 'New restaurants are coming soon'}
            </p>
          </div>
        ) : (
          byCity.map(([cityName, list]) => (
            <section key={cityName} className="mb-6">
              <h2 className="px-5 mb-3 text-base font-extrabold text-black tracking-tight">
                {cityName === city ? `Restaurants in ${cityName}` : cityName}
                <span className="ml-2 text-xs font-bold text-black/40">
                  · {list.length}
                </span>
              </h2>
              <ul className="px-5 space-y-3">
                {list.map(r => <RestaurantCard key={r.id} r={r} />)}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function PromoCarousel({ promos }) {
  const [idx, setIdx] = useState(0)
  const trackRef = useRef(null)
  const startX = useRef(0)
  const startScroll = useRef(0)
  const dragging = useRef(false)

  // Auto-advance every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % promos.length)
    }, 5000)
    return () => clearInterval(t)
  }, [promos.length])

  // Sync scroll position to active idx
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const card = el.children[idx]
    if (card) el.scrollTo({ left: card.offsetLeft - 20, behavior: 'smooth' })
  }, [idx])

  const onScroll = () => {
    if (dragging.current) return
    const el = trackRef.current
    if (!el) return
    const cardW = el.children[0]?.offsetWidth || 1
    const newIdx = Math.round(el.scrollLeft / cardW)
    if (newIdx !== idx && newIdx >= 0 && newIdx < promos.length) setIdx(newIdx)
  }

  return (
    <div className="pb-4">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-5"
        style={{ scrollPaddingLeft: '20px' }}
      >
        {promos.map(r => (
          <Link
            key={r.id}
            to={`/app/r/${r.slug}`}
            className="snap-start shrink-0 relative w-[88%] h-40 rounded-3xl overflow-hidden bg-black"
          >
            <img
              src={r.cover_photo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-5 text-white">
              <span className="inline-block w-fit px-2 py-0.5 bg-white text-black rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2">
                Featured
              </span>
              <h3 className="text-xl font-extrabold tracking-tight leading-tight">
                {r.name}
              </h3>
              <p className="text-xs text-white/80 mt-1">
                {r.cuisine_type} · {r.city}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {promos.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-6 bg-black' : 'w-1.5 bg-black/20'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function RestaurantCard({ r }) {
  return (
    <li>
      <Link
        to={`/app/r/${r.slug}`}
        className="group flex bg-white rounded-2xl overflow-hidden border border-black/10 hover:border-black active:scale-[0.99] transition-all"
      >
        <div className="w-28 h-28 shrink-0 bg-[#F4F4F4]">
          {r.cover_photo_url ? (
            <img
              src={r.cover_photo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : r.logo_url ? (
            <img
              src={r.logo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
          )}
        </div>

        <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-black truncate">{r.name}</h3>
            {r.rating && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-extrabold text-black">
                <Star className="w-3 h-3 fill-black text-black" />
                {Number(r.rating).toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-xs text-black/55 mt-0.5 truncate">
            {r.cuisine_type || 'Restaurant'}
          </p>
          {r.city && (
            <p className="text-[11px] text-black/40 mt-1 inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {r.city}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
