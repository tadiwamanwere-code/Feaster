import { useEffect, useState } from 'react'
import Map from './Map'
import { MapPin, Loader, Search } from 'lucide-react'

// Geocoding via OSM Nominatim (free, rate-limited; fine for low-volume use)
async function geocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=zw&format=json&limit=5`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) return []
  return res.json()
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  )
  if (!res.ok) return null
  return res.json()
}

/**
 * Lets the user pick an address either by typing or tapping the map.
 * onChange({ address, lat, lng })
 */
export default function AddressPicker({ value, onChange, label = 'Pick a location' }) {
  const [query, setQuery] = useState(value?.address || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)

  // Sync external value -> input only when it differs (avoid cascading renders)
  useEffect(() => {
    setQuery(prev => (prev === (value?.address || '') ? prev : (value?.address || '')))
  }, [value?.address])

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await geocode(query)
      setResults(r)
    } catch {
      setResults([])
    }
    setSearching(false)
  }

  const handlePick = (r) => {
    onChange({
      address: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    })
    setResults([])
    setQuery(r.display_name)
  }

  const handleMapClick = async ({ lat, lng }) => {
    setResolving(true)
    try {
      const rev = await reverseGeocode(lat, lng)
      onChange({
        address: rev?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat, lng,
      })
      setQuery(rev?.display_name || '')
    } catch {
      onChange({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })
    }
    setResolving(false)
  }

  const useGps = () => {
    if (!navigator.geolocation) return
    setResolving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleMapClick({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setResolving(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const markers = value?.lat
    ? [{ lat: value.lat, lng: value.lng, label: 'Selected', color: '#ea580c' }]
    : []

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
            placeholder="Search for address or place"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          {searching ? <Loader className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
        <button
          type="button"
          onClick={useGps}
          disabled={resolving}
          title="Use my current location"
          className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm flex items-center gap-1"
        >
          <MapPin className="w-4 h-4" /> GPS
        </button>
      </div>

      {results.length > 0 && (
        <ul className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Map
        markers={markers}
        height="240px"
        onClick={handleMapClick}
        fitToMarkers={false}
      />

      {value?.lat && (
        <p className="text-xs text-gray-500">
          Selected: {value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
        </p>
      )}
    </div>
  )
}
