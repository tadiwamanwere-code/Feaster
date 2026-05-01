import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Clock, Star, Bell, ChevronRight, Sparkles } from 'lucide-react'
import { getRestaurants } from '../lib/services'

const DEMO_RESTAURANTS = [
  {
    id: 'demo-1',
    slug: 'fishmonger',
    name: 'Fishmonger',
    cuisine_type: 'Seafood & Grill',
    city: 'Harare',
    cover_photo_url: null,
    logo_url: null,
    rating: 4.5,
    is_active: true,
  },
  {
    id: 'demo-2',
    slug: 'smokehouse',
    name: 'Smokehouse',
    cuisine_type: 'BBQ & Steakhouse',
    city: 'Bulawayo',
    cover_photo_url: null,
    logo_url: null,
    rating: 4.3,
    is_active: true,
  },
  {
    id: 'demo-3',
    slug: 'coimbra',
    name: 'Coimbra',
    cuisine_type: 'Portuguese & Seafood',
    city: 'Harare',
    cover_photo_url: null,
    logo_url: null,
    rating: 4.7,
    is_active: true,
  },
  {
    id: 'demo-4',
    slug: 'roosters',
    name: 'Roosters',
    cuisine_type: 'Chicken & Fast Food',
    city: 'Bulawayo',
    cover_photo_url: null,
    logo_url: null,
    rating: 4.1,
    is_active: true,
  },
  {
    id: 'demo-5',
    slug: 'mozambik',
    name: 'Mozambik',
    cuisine_type: 'Mozambican Cuisine',
    city: 'Bulawayo',
    cover_photo_url: null,
    logo_url: null,
    rating: 4.6,
    is_active: true,
  },
]

const CITIES = ['All', 'Harare', 'Bulawayo']

export default function HomePage() {
  const [restaurants, setRestaurants] = useState([])
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRestaurants()
      .then(data => setRestaurants(data.length > 0 ? data : DEMO_RESTAURANTS))
      .catch(() => setRestaurants(DEMO_RESTAURANTS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => restaurants.filter(r => {
    const matchesCity = city === 'All' || r.city === city
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine_type?.toLowerCase().includes(search.toLowerCase())
    return matchesCity && matchesSearch
  }), [restaurants, city, search])

  const featured = filtered.slice(0, 1)[0]
  const list = filtered

  return (
    <div className="lg:overflow-y-auto thin-scrollbar lg:h-[calc(100vh-3rem)]">
      {/* Top bar with search */}
      <div className="px-5 lg:px-8 pt-5 lg:pt-7 pb-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search restaurants or cuisine..."
            className="w-full pl-10 pr-4 py-2.5 bg-canvas-50 border border-canvas-200 rounded-2xl text-sm placeholder:text-ink-400 focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>
        <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-ink-500 hover:bg-canvas-50 relative">
          <Bell className="w-[18px] h-[18px]" />
        </button>
      </div>

      <div className="px-5 lg:px-8 pb-12">
        {/* Hero greeting */}
        <div className="mb-7 mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3 h-3" />
            Pre-order. Skip the queue.
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-ink-900 tracking-tight leading-tight">
            Discover great food <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
              near you.
            </span>
          </h1>
          <p className="text-ink-500 mt-2.5 text-sm">Order ahead, eat happy. No more waiting in lines.</p>
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider mr-1 shrink-0">City:</span>
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                city === c
                  ? 'bg-ink-900 text-white shadow-soft'
                  : 'bg-white text-ink-500 border border-canvas-200 hover:border-ink-200 hover:text-ink-900'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Featured banner */}
        {!loading && featured && (
          <Link
            to={`/${featured.slug}`}
            className="group block mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-6 lg:p-8 shadow-pop"
          >
            {featured.cover_photo_url && (
              <img
                src={featured.cover_photo_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
              />
            )}
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -right-20 -bottom-20 w-56 h-56 bg-orange-300/20 rounded-full blur-3xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-white/80 mb-2">
                  Featured
                </span>
                <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                  {featured.name}
                </h2>
                <p className="text-sm text-white/80 mt-1">{featured.cuisine_type} · {featured.city}</p>
                <div className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-white text-orange-700 text-sm font-semibold group-hover:bg-orange-50 transition-colors">
                  Order now
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="hidden sm:flex w-24 h-24 lg:w-32 lg:h-32 rounded-3xl bg-white/15 backdrop-blur-sm items-center justify-center text-5xl lg:text-6xl font-black text-white shrink-0">
                {featured.name[0]}
              </div>
            </div>
          </Link>
        )}

        {/* All restaurants */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink-900">All restaurants</h2>
          <span className="text-xs text-ink-500">{filtered.length} found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse border border-canvas-200">
                <div className="h-36 bg-canvas-100" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-canvas-100 rounded w-2/3" />
                  <div className="h-4 bg-canvas-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-canvas-200">
            <p className="text-ink-500 font-medium">No restaurants found</p>
            <p className="text-sm text-ink-400 mt-1">Try a different city or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map(restaurant => (
              <Link
                key={restaurant.id}
                to={`/${restaurant.slug}`}
                className="bg-white rounded-3xl overflow-hidden border border-canvas-200 hover:border-orange-200 hover:shadow-soft hover:-translate-y-0.5 transition-all group"
              >
                <div className="h-36 bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 relative overflow-hidden">
                  {restaurant.cover_photo_url ? (
                    <img
                      src={restaurant.cover_photo_url}
                      alt={restaurant.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl font-black text-white/40">
                        {restaurant.name[0]}
                      </span>
                    </div>
                  )}
                  {restaurant.rating && (
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-2 py-1 flex items-center gap-1 shadow-soft">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-ink-900 tabular-nums">{restaurant.rating}</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-ink-900 truncate group-hover:text-orange-600 transition-colors">
                        {restaurant.name}
                      </h2>
                      <p className="text-sm text-ink-500 mt-0.5 truncate">{restaurant.cuisine_type}</p>
                    </div>
                    {restaurant.logo_url && (
                      <img
                        src={restaurant.logo_url}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-canvas-200 shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {restaurant.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Pre-order
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
