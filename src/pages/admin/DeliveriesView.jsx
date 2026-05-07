import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bike, MapPin, Phone, RefreshCw, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getRestaurantBySlug } from '../../lib/services'
import { getRestaurantDeliveries } from '../../lib/deliveries'

const STATUS_PILL = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  awaiting_pickup: 'bg-blue-500/20 text-blue-400',
  picked_up: 'bg-purple-500/20 text-purple-400',
  in_transit: 'bg-black/10 text-black',
  arrived: 'bg-emerald-500/20 text-emerald-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/20 text-red-400',
  failed: 'bg-red-500/20 text-red-400',
}

export default function DeliveriesView() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [filter, setFilter] = useState('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const r = await getRestaurantBySlug(slug)
      if (cancelled || !r) return
      setRestaurant(r)
      await load(r.id)
    }
    init()
    return () => { cancelled = true }
  }, [slug])

  async function load(rid) {
    if (!rid) return
    setLoading(true)
    try {
      const data = await getRestaurantDeliveries(rid, { activeOnly: filter === 'active' })
      setDeliveries(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (restaurant) load(restaurant.id) }, [filter]) // eslint-disable-line

  // Realtime: subscribe to changes for this restaurant's deliveries
  useEffect(() => {
    if (!restaurant) return
    const channel = supabase
      .channel(`admin-deliveries:${restaurant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deliveries',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, () => load(restaurant.id))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [restaurant?.id]) // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Deliveries</h1>
          <p className="text-sm text-black/55">Live view of all delivery orders</p>
        </div>
        <button
          onClick={() => restaurant && load(restaurant.id)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F4F4] hover:bg-black/10 text-black/80 rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active' },
          { key: 'all', label: 'All' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === f.key
                ? 'bg-black/10 text-black'
                : 'bg-[#F4F4F4] text-black/55 hover:bg-black/10'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">
          <Loader className="w-6 h-6 animate-spin text-black mx-auto" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-xl p-8 text-center text-black/45">
          <Bike className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No deliveries to show</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {deliveries.map(d => (
            <li key={d.id} className="bg-white border border-black/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-black/45">#{d.id.slice(0, 8)}</p>
                  <p className="text-sm font-semibold text-black capitalize">
                    {d.distance_km} km · ${Number(d.total_fee_usd).toFixed(2)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_PILL[d.status] || 'bg-black/10 text-black/80'}`}>
                  {d.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="text-sm space-y-1 text-black/55">
                <p className="flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{d.pickup_address}</span>
                </p>
                <p className="flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{d.dropoff_address}</span>
                </p>
              </div>

              {d.drivers && (
                <div className="border-t border-black/10 pt-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-black/80 font-medium">{d.drivers.full_name}</p>
                    <p className="text-black/45">{d.drivers.vehicle_plate}</p>
                  </div>
                  {d.drivers.phone && (
                    <a
                      href={`tel:${d.drivers.phone}`}
                      className="flex items-center gap-1 text-black hover:text-black"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                </div>
              )}

              <div className="text-xs text-black/45">
                Created {new Date(d.created_at).toLocaleString()}
                {d.delivered_at && (
                  <span className="ml-2 text-emerald-400">
                    · Delivered {new Date(d.delivered_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
