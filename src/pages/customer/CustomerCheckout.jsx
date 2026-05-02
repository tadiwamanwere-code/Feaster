import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, MapPin, Clock, Utensils, Bike, ChevronRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { getRestaurantBySlug } from '../../lib/services'
import { quoteDelivery, createDelivery, placeOrder } from '../../lib/deliveries'
import { verifyPin } from '../../lib/customers'
import AddressPicker from '../../components/AddressPicker'

const ORDER_TYPES = [
  { key: 'dine_in', label: 'Sit-in', icon: Utensils, hint: 'Eat at the restaurant' },
  { key: 'pre_order', label: 'Pre-order', icon: Clock, hint: 'Schedule a pickup time' },
  { key: 'delivery', label: 'Delivery', icon: Bike, hint: 'Driver brings it to you' },
]

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash on collection / delivery' },
  { key: 'ecocash', label: 'EcoCash' },
  { key: 'innbucks', label: 'InnBucks' },
  { key: 'card', label: 'Card' },
]

export default function CustomerCheckout() {
  const navigate = useNavigate()
  const cart = useCart()
  const { profile, pinSet } = useCustomerAuth()

  const [restaurant, setRestaurant] = useState(null)
  const [orderType, setOrderType] = useState('dine_in')
  const [scheduledFor, setScheduledFor] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [dropoff, setDropoff] = useState(null)
  const [deliveryQuote, setDeliveryQuote] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  useEffect(() => {
    if (!cart.items.length) navigate('/app/cart', { replace: true })
  }, [cart.items.length, navigate])

  useEffect(() => {
    if (!cart.restaurantSlug) return
    getRestaurantBySlug(cart.restaurantSlug).then(setRestaurant).catch(console.error)
  }, [cart.restaurantSlug])

  // Pickup point — for now, the restaurant's centroid (lat/lng of restaurant if set; else Harare)
  // Real-world: store lat/lng on restaurants table. We extend that below.
  const pickupPoint = useMemo(() => {
    if (restaurant?.latitude && restaurant?.longitude) {
      return { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) }
    }
    // Fallback: Harare CBD
    return { lat: -17.8252, lng: 31.0335 }
  }, [restaurant])

  // Compute delivery quote whenever dropoff changes
  useEffect(() => {
    if (orderType !== 'delivery' || !dropoff?.lat || !pickupPoint?.lat) {
      setDeliveryQuote(null)
      return
    }
    let cancelled = false
    setQuoting(true)
    quoteDelivery({
      city: restaurant?.city || 'Harare',
      pickup: pickupPoint,
      dropoff,
    })
      .then((q) => { if (!cancelled) setDeliveryQuote(q) })
      .catch(() => { if (!cancelled) setDeliveryQuote(null) })
      .finally(() => { if (!cancelled) setQuoting(false) })
    return () => { cancelled = true }
  }, [orderType, dropoff, pickupPoint, restaurant?.city])

  const total = orderType === 'delivery' && deliveryQuote
    ? subtotal + Number(deliveryQuote.total)
    : subtotal

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate PIN — server-side, rate-limited
    if (!pinSet) return setError('Please set up your PIN first')
    if (pin.length !== 6) return setError('Enter your 6-digit PIN')
    const r = await verifyPin(pin)
    if (!r.success) {
      if (r.lockedUntil) {
        const mins = Math.ceil((new Date(r.lockedUntil) - Date.now()) / 60000)
        return setError(`Too many wrong attempts. Try again in ${mins} min.`)
      }
      return setError(r.attemptsRemaining != null
        ? `${r.error || 'Incorrect PIN'} — ${r.attemptsRemaining} attempts left`
        : (r.error || 'Incorrect PIN'))
    }

    if (orderType === 'pre_order' && !scheduledFor) {
      return setError('Please pick a pickup time')
    }
    if (orderType === 'delivery' && !dropoff?.lat) {
      return setError('Please pick a delivery address')
    }
    if (orderType === 'delivery' && !deliveryQuote) {
      return setError('Could not calculate delivery fee')
    }

    setSubmitting(true)
    try {
      // Server-authoritative pricing: send only (item_id, quantity, notes).
      const placed = await placeOrder({
        restaurantId: restaurant.id,
        items: cart.items.map(i => ({
          item_id: i.id || i.item_id,
          quantity: i.quantity,
          notes: i.notes || '',
        })),
        orderType,
        paymentMethod,
        scheduledFor: orderType === 'pre_order' ? scheduledFor : null,
        customerNotes: '',
      })
      if (!placed?.order_id) throw new Error('Order could not be placed')

      if (orderType === 'delivery') {
        await createDelivery({
          orderId: placed.order_id,
          pickup: { ...pickupPoint, address: restaurant.name + ' — pickup' },
          dropoff: { ...dropoff, address: dropoff.address || 'Selected location' },
        })
      }

      cart.clear()
      navigate(`/app/track/${placed.order_id}`, { replace: true })
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to place order')
    }
    setSubmitting(false)
  }

  if (!restaurant) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="p-4 space-y-4 pb-32">
      <h1 className="text-xl font-bold text-gray-900">Checkout</h1>

      {/* Order type */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">How do you want it?</h2>
        <div className="grid grid-cols-3 gap-2">
          {ORDER_TYPES.map(({ key, label, icon: Icon, hint }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOrderType(key)}
              className={`p-3 rounded-lg border text-center ${
                orderType === key
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <div className="text-sm font-medium">{label}</div>
              <div className="text-[10px] opacity-70 leading-tight">{hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pre-order time */}
      {orderType === 'pre_order' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <label className="text-sm font-medium text-gray-700">Pickup time</label>
          <input
            type="datetime-local"
            value={scheduledFor}
            min={new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16)}
            onChange={e => setScheduledFor(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <p className="text-xs text-gray-500">
            You'll get a ticket to bring to the restaurant when you arrive.
          </p>
        </div>
      )}

      {/* Delivery address */}
      {orderType === 'delivery' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <AddressPicker
            label="Delivery address"
            value={dropoff}
            onChange={setDropoff}
          />
          {dropoff?.lat && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              {quoting ? (
                <span className="text-gray-500 flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" /> Calculating fee…
                </span>
              ) : deliveryQuote ? (
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between"><span>Distance</span><span>{deliveryQuote.distance_km} km</span></div>
                  <div className="flex justify-between"><span>Base fee</span><span>${Number(deliveryQuote.base_fee).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Per-km</span><span>${Number(deliveryQuote.per_km_fee).toFixed(2)}/km</span></div>
                  <div className="flex justify-between"><span>Service fee</span><span>${Number(deliveryQuote.service_fee).toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-orange-200 pt-1 mt-1">
                    <span>Delivery total</span><span>${Number(deliveryQuote.total).toFixed(2)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <p className="text-xs text-gray-500">
            After ordering you'll see drivers nearby. You pick the one you want.
          </p>
        </div>
      )}

      {/* Payment */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Payment method</h2>
        <ul className="space-y-2">
          {PAYMENT_METHODS.map(p => {
            const allowed = (restaurant.payment_methods || []).includes(p.key)
              || p.key === 'cash'
            const selected = paymentMethod === p.key
            return (
              <li key={p.key}>
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => setPaymentMethod(p.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border ${
                    selected
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-700'
                  } ${!allowed ? 'opacity-40' : ''}`}
                >
                  <span className="text-sm">{p.label}</span>
                  {selected && <ChevronRight className="w-4 h-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Totals + PIN */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
        </div>
        {orderType === 'delivery' && deliveryQuote && (
          <div className="flex justify-between text-sm">
            <span>Delivery</span><span>${Number(deliveryQuote.total).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-3">
          <span>Total</span><span>${total.toFixed(2)}</span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm with your 6-digit PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="••••••"
            required
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="fixed bottom-20 inset-x-4 max-w-2xl mx-auto bg-orange-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader className="w-4 h-4 animate-spin" />}
        Place order — ${total.toFixed(2)}
      </button>
    </form>
  )
}
