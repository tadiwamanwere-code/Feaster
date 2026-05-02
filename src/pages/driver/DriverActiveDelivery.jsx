import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader, MapPin, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useDriverAuth } from '../../context/DriverAuthContext'
import {
  getDelivery,
  markPickedUp,
  markInTransit,
  markArrived,
  markDelivered,
  subscribeToDelivery,
} from '../../lib/deliveries'
import Map from '../../components/Map'

const NEXT_ACTIONS = {
  awaiting_pickup: { label: 'I picked up the order', next: markPickedUp, after: 'picked_up' },
  picked_up: { label: 'Heading to customer', next: markInTransit, after: 'in_transit' },
  in_transit: { label: 'I have arrived', next: markArrived, after: 'arrived' },
  arrived: { label: 'Mark as delivered', next: markDelivered, after: 'delivered' },
}

export default function DriverActiveDelivery() {
  const { deliveryId } = useParams()
  const navigate = useNavigate()
  const { driver } = useDriverAuth()
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getDelivery(deliveryId).then(d => {
      if (cancelled) return
      setDelivery(d)
      setLoading(false)
    })
    const unsub = subscribeToDelivery(deliveryId, (d) => setDelivery(prev => ({ ...prev, ...d })))
    return () => { cancelled = true; unsub?.() }
  }, [deliveryId])

  const advance = async () => {
    if (!delivery) return
    const action = NEXT_ACTIONS[delivery.status]
    if (!action) return
    setActing(true); setError('')
    try {
      const result = await action.next(delivery.id)
      if (delivery.status === 'arrived') {
        if (!result?.success) throw new Error(result?.error || 'Could not complete')
        navigate('/driver', { replace: true })
        return
      }
    } catch (err) {
      setError(err.message || 'Action failed')
    }
    setActing(false)
  }

  if (loading || !delivery) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  const action = NEXT_ACTIONS[delivery.status]
  const driverPos = driver?.current_lat
    ? { lat: Number(driver.current_lat), lng: Number(driver.current_lng) }
    : null

  // What's the next destination based on state?
  const targetAddress = ['awaiting_pickup'].includes(delivery.status)
    ? delivery.pickup_address
    : delivery.dropoff_address

  const targetLat = ['awaiting_pickup'].includes(delivery.status)
    ? Number(delivery.pickup_lat)
    : Number(delivery.dropoff_lat)
  const targetLng = ['awaiting_pickup'].includes(delivery.status)
    ? Number(delivery.pickup_lng)
    : Number(delivery.dropoff_lng)

  const navUrl = `https://www.openstreetmap.org/directions?from=${driverPos?.lat || ''},${driverPos?.lng || ''}&to=${targetLat},${targetLng}`

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b border-gray-100 p-4 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Active delivery</h1>
          <p className="text-xs text-gray-500 capitalize">
            {delivery.status.replace(/_/g, ' ')}
          </p>
        </div>
      </header>

      <Map
        height="40vh"
        markers={[
          { lat: Number(delivery.pickup_lat), lng: Number(delivery.pickup_lng), label: 'Pickup', color: '#3b82f6' },
          { lat: Number(delivery.dropoff_lat), lng: Number(delivery.dropoff_lng), label: 'Dropoff', color: '#ea580c' },
          ...(driverPos ? [{ ...driverPos, label: 'You', color: '#10b981' }] : []),
        ]}
      />

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500">Next stop</p>
            <p className="text-sm font-semibold text-gray-900 flex items-start gap-1 mt-0.5">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span>{targetAddress}</span>
            </p>
          </div>
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >Open directions</a>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="text-sm text-gray-600">
            Earnings: <span className="font-bold text-emerald-700">${Number(delivery.driver_earnings_usd).toFixed(2)}</span>
          </p>
          <p className="text-xs text-gray-500">
            Distance: {delivery.distance_km} km · Commission: ${Number(delivery.platform_commission_usd).toFixed(2)}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}
      </div>

      {action && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-gray-200">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={advance}
              disabled={acting}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {acting ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {action.label}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
