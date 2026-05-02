import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader, Phone, Star, Bike, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  getOffersForDelivery,
  acceptOffer,
  subscribeToDelivery,
  subscribeToOffersForDelivery,
} from '../../lib/deliveries'
import Map from '../../components/Map'

const STATUS_TIMELINE = [
  { key: 'pending',         label: 'Order placed' },
  { key: 'confirmed',       label: 'Restaurant confirmed' },
  { key: 'preparing',       label: 'Being prepared' },
  { key: 'ready',           label: 'Ready' },
  { key: 'completed',       label: 'Completed' },
]

export default function CustomerTrackOrder() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [delivery, setDelivery] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: o } = await supabase
        .from('orders')
        .select('*, restaurants(name, slug, logo_url, whatsapp_number, latitude, longitude, address_line)')
        .eq('id', orderId)
        .maybeSingle()
      if (cancelled) return
      setOrder(o)
      if (o?.order_type === 'delivery') {
        const { data: d } = await supabase
          .from('deliveries')
          .select('*, drivers(full_name, phone, vehicle_type, vehicle_plate, rating, current_lat, current_lng)')
          .eq('order_id', orderId)
          .maybeSingle()
        if (cancelled) return
        setDelivery(d)
        if (d) {
          const off = await getOffersForDelivery(d.id)
          if (!cancelled) setOffers(off || [])
        }
      }
      if (!cancelled) setLoading(false)
    }
    load()

    const orderChannel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, payload => setOrder(prev => ({ ...prev, ...payload.new })))
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(orderChannel) }
  }, [orderId])

  useEffect(() => {
    if (!delivery?.id) return
    const unsubD = subscribeToDelivery(delivery.id, (d) => setDelivery(prev => ({ ...prev, ...d })))
    const unsubO = subscribeToOffersForDelivery(delivery.id, setOffers)
    return () => { unsubD?.(); unsubO?.() }
  }, [delivery?.id])

  const handleAccept = async (offer) => {
    setAccepting(true)
    try {
      const result = await acceptOffer({ offerId: offer.id, driverId: offer.driver_id })
      if (!result.success) throw new Error(result.error || 'Failed to accept')
    } catch (err) {
      alert(err.message)
    }
    setAccepting(false)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    )
  }
  if (!order) {
    return <div className="p-4 text-gray-500">Order not found</div>
  }

  const restaurant = order.restaurants
  const currentStepIndex = STATUS_TIMELINE.findIndex(s => s.key === order.status)

  return (
    <div className="pb-8">
      <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate('/app/orders')} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-xs text-gray-500 capitalize">
            {order.order_type.replace('_', ' ')} · {order.status}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pre-order ticket */}
        {order.order_type === 'pre_order' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-xs font-medium text-orange-700">PICKUP TICKET</p>
            <p className="text-2xl font-bold tracking-widest font-mono mt-1">
              {order.id.slice(0, 6).toUpperCase()}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              Show this code at <span className="font-semibold">{restaurant?.name}</span>
            </p>
            {order.scheduled_for && (
              <p className="text-xs text-gray-500 mt-1">
                Pickup: {new Date(order.scheduled_for).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Delivery driver selection */}
        {order.order_type === 'delivery' && delivery && delivery.status === 'pending' && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Pick a driver</h2>
            <p className="text-xs text-gray-500">
              Drivers nearby send their offers — pick the one you want.
            </p>
            {offers.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                <Loader className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                Waiting for driver offers…
              </div>
            ) : (
              <ul className="space-y-2">
                {offers.map(o => (
                  <li key={o.id} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-semibold">
                      {o.drivers?.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {o.drivers?.full_name}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {Number(o.drivers?.rating || 5).toFixed(1)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> {o.drivers?.vehicle_type}</span>
                        <span>·</span>
                        <span>~{o.est_arrival_min || '?'} min</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">${Number(o.offer_amount_usd).toFixed(2)}</p>
                      <button
                        onClick={() => handleAccept(o)}
                        disabled={accepting}
                        className="mt-1 px-3 py-1.5 bg-orange-600 text-white rounded-full text-xs font-medium hover:bg-orange-700 disabled:opacity-50"
                      >Pick</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Delivery active map */}
        {order.order_type === 'delivery' && delivery && delivery.status !== 'pending' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Map
              height="280px"
              markers={[
                { lat: Number(delivery.pickup_lat), lng: Number(delivery.pickup_lng), label: 'Pickup', color: '#3b82f6' },
                { lat: Number(delivery.dropoff_lat), lng: Number(delivery.dropoff_lng), label: 'You', color: '#ea580c' },
                ...(delivery.drivers?.current_lat
                  ? [{
                      lat: Number(delivery.drivers.current_lat),
                      lng: Number(delivery.drivers.current_lng),
                      label: 'Driver',
                      color: '#10b981',
                    }]
                  : []),
              ]}
            />
            <div className="p-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{delivery.drivers?.full_name}</p>
              <p className="text-xs text-gray-500">
                {delivery.drivers?.vehicle_type} · {delivery.drivers?.vehicle_plate}
              </p>
              {delivery.drivers?.phone && (
                <a
                  href={`tel:${delivery.drivers.phone}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                >
                  <Phone className="w-4 h-4" /> Call driver
                </a>
              )}
              <p className="mt-2 text-xs text-gray-700 capitalize">
                Status: <span className="font-semibold">{delivery.status.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>
        )}

        {/* Status timeline (non-delivery) */}
        {order.order_type !== 'delivery' && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <ol className="space-y-3">
              {STATUS_TIMELINE.map((s, idx) => {
                const done = idx <= currentStepIndex && currentStepIndex !== -1
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      done ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* Order items summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            {restaurant?.logo_url && (
              <img src={restaurant.logo_url} alt="" className="w-10 h-10 rounded-lg" />
            )}
            <div>
              <Link to={`/app/r/${restaurant?.slug}`} className="font-semibold text-gray-900">
                {restaurant?.name}
              </Link>
              {restaurant?.address_line && (
                <p className="text-xs text-gray-500">{restaurant.address_line}</p>
              )}
            </div>
          </div>
          <ul className="space-y-1">
            {(order.items || []).map((item, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span>{item.quantity}× {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>${Number(order.subtotal || 0).toFixed(2)}</span>
            </div>
            {Number(order.delivery_fee) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span><span>${Number(order.delivery_fee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1">
              <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
