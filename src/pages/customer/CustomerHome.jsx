import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin } from 'lucide-react'
import { getRestaurants } from '../../lib/services'

export default function CustomerHome() {
  const [restaurants, setRestaurants] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRestaurants()
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = query
    ? restaurants.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        (r.cuisine_type || '').toLowerCase().includes(query.toLowerCase()) ||
        (r.city || '').toLowerCase().includes(query.toLowerCase())
      )
    : restaurants

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What's hungry?</h1>
        <p className="text-sm text-gray-500">Pick a restaurant near you</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search restaurants, cuisines, cities"
          className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {query ? 'No matches.' : 'No restaurants yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(r => (
            <li key={r.id}>
              <Link
                to={`/app/r/${r.slug}`}
                className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {r.cover_photo_url && (
                  <div className="h-32 bg-gray-100">
                    <img
                      src={r.cover_photo_url}
                      alt={r.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 flex items-center gap-3">
                  {r.logo_url && (
                    <img
                      src={r.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{r.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{r.cuisine_type}</p>
                    {r.city && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {r.city}
                      </p>
                    )}
                  </div>
                  {r.rating && (
                    <div className="text-sm font-medium text-orange-600">
                      ★ {Number(r.rating).toFixed(1)}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
