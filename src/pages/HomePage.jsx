import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Clock, Star } from 'lucide-react'
import { getRestaurants } from '../lib/services'

// Demo data used when Firebase is not configured
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
      .then(data => {
        // Show real restaurants, append demo only if none exist
        setRestaurants(data.length > 0 ? data : DEMO_RESTAURANTS)
      })
      .catch(() => {
        // Firebase not configured — show demo
        setRestaurants(DEMO_RESTAURANTS)
      })
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

  return (
    <div className="px-4 py-6 pb-24">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Discover <span className="text-orange-600">great food</span>
        </h1>
        <p className="text-gray-500 mt-1">Order ahead. Skip the queue. Eat happy.</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search restaurants or cuisine..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* City Filter */}
      <div className="flex gap-2 mb-6">
        {CITIES.map(c => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              city === c
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="h-36 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No restaurants found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(restaurant => (
            <Link
              key={restaurant.id}
              to={`/${restaurant.slug}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all group"
            >
              {/* Cover photo */}
              <div className="h-36 bg-gradient-to-br from-orange-400 to-orange-600 relative overflow-hidden">
                {restaurant.cover_photo_url ? (
                  <img
                    src={restaurant.cover_photo_url}
                    alt={restaurant.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl font-bold text-white/30">
                      {restaurant.name[0]}
                    </span>
                  </div>
                )}
                {/* Rating badge */}
                {restaurant.rating && (
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-semibold">{restaurant.rating}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {restaurant.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{restaurant.cuisine_type}</p>
                  </div>
                  {restaurant.logo_url && (
                    <img
                      src={restaurant.logo_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {restaurant.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Pre-order available
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
