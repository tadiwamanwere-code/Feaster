import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Clock, Utensils, ShoppingBag, AlertCircle, Loader, Banknote, Smartphone } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { getRestaurantBySlug } from '../../lib/services'

const ORDER_LABEL = {
  in_house: 'Dine In',
  takeaway: 'Take Away',
  pre_order: 'Pre-Order',
}

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Cash',     icon: Banknote,   sub: 'Pay on collection or delivery' },
  { key: 'ecocash',  label: 'EcoCash',  icon: Smartphone, sub: 'USD or ZWL — confirm at restaurant' },
  { key: 'innbucks', label: 'InnBucks', icon: Smartphone, sub: 'Mobile wallet payment' },
]

const CASH_PRESETS = [5, 10, 20, 50, 100]

function nowPlusMinutesIso(mins) {
  const d = new Date(Date.now() + mins * 60_000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function CustomerCheckout() {
  const navigate = useNavigate()
  const cart = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [name, setName] = useState(() => localStorage.getItem('feaster:name') || '')
  const [phone, setPhone] = useState(() => localStorage.getItem('feaster:phone') || '')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashGiven, setCashGiven] = useState('')
  const [pickupTime, setPickupTime] = useState(() => cart.pickupTime || nowPlusMinutesIso(30))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cart.items.length) navigate('/app/cart', { replace: true })
  }, [cart.items.length, navigate])

  useEffect(() => {
    if (!cart.restaurantSlug) return
    getRestaurantBySlug(cart.restaurantSlug).then(setRestaurant).catch(() => {})
  }, [cart.restaurantSlug])

  const subtotal = cart.total
  const total = subtotal // no fees yet
  const cashGivenNum = Number(cashGiven) || 0
  const change = paymentMethod === 'cash' ? Math.max(0, cashGivenNum - total) : 0
  const cashShort = paymentMethod === 'cash' && cashGivenNum > 0 && cashGivenNum < total

  const isPreOrder = cart.orderType === 'pre_order'
  const minPickup = useMemo(() => nowPlusMinutesIso(15), [])

  const placeOrder = (e) => {
    e?.preventDefault()
    setError('')

    if (!name.trim() || name.trim().length < 2) return setError('Enter your name')
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) return setError('Enter a valid phone number')
    if (isPreOrder && !pickupTime) return setError('Pick a pickup time')
    if (!isPreOrder && !cart.tableNumber && cart.orderType !== 'takeaway') {
      return setError('Table number missing — scan the QR code first')
    }
    if (paymentMethod === 'cash' && cashShort) {
      return setError(`Cash given is less than total ($${total.toFixed(2)})`)
    }

    setSubmitting(true)
    try {
      // Persist name + phone for future orders
      localStorage.setItem('feaster:name', name.trim())
      localStorage.setItem('feaster:phone', phone.trim())

      // Save order to local history
      const orderId = 'F' + Math.random().toString(36).slice(2, 8).toUpperCase()
      const order = {
        id: orderId,
        created_at: new Date().toISOString(),
        status: 'pending',
        order_type: cart.orderType,
        table_number: cart.tableNumber,
        pickup_time: isPreOrder ? new Date(pickupTime).toISOString() : null,
        payment_method: paymentMethod,
        cash_given: paymentMethod === 'cash' && cashGivenNum > 0 ? cashGivenNum : null,
        change_due: paymentMethod === 'cash' && change > 0 ? change : null,
        customer: { name: name.trim(), phone: phone.trim() },
        restaurant: {
          slug: cart.restaurantSlug,
          name: restaurant?.name || cart.restaurantSlug,
          city: restaurant?.city,
        },
        items: cart.items.map(i => ({
          name: i.name,
          size: i.size || 'regular',
          quantity: i.quantity,
          price: Number(i.price),
          notes: i.notes || '',
          line_total: Number(i.price) * i.quantity,
        })),
        subtotal,
        total,
      }

      const orders = JSON.parse(localStorage.getItem('feaster:orders') || '[]')
      orders.unshift(order)
      localStorage.setItem('feaster:orders', JSON.stringify(orders.slice(0, 50)))

      cart.clear()
      cart.setPickupTime?.(null)
      navigate(`/app/order/${orderId}`, { replace: true })
    } catch (err) {
      setError(err?.message || 'Failed to place order')
      setSubmitting(false)
    }
  }

  if (!cart.items.length) return null

  return (
    <div className="min-h-[100dvh] bg-white pb-32 page-fade-in">
      {/* Top bar */}
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/app/cart')}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-2xl font-black text-black tracking-tight">Checkout</h1>
      </header>

      <form onSubmit={placeOrder} className="px-5 space-y-5">
        {/* Order context */}
        <div className="bg-black text-white rounded-2xl p-4 flex items-center gap-3">
          <Utensils className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/60">
              {ORDER_LABEL[cart.orderType] || 'Order'}
            </p>
            <p className="text-sm font-bold truncate">
              {restaurant?.name || cart.restaurantSlug}
              {cart.tableNumber && <span className="text-white/70"> · Table {cart.tableNumber}</span>}
            </p>
          </div>
        </div>

        {/* Customer info */}
        <section>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-black/55 mb-3">
            Your details
          </h2>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full h-14 pl-11 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-2xl text-base font-bold text-black placeholder-black/40 focus:outline-none transition-colors"
                required
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 77 123 4567"
                className="w-full h-14 pl-11 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-2xl text-base font-bold text-black placeholder-black/40 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>
        </section>

        {/* Pickup time (pre-order only) */}
        {isPreOrder && (
          <section>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-black/55 mb-3">
              Pickup time
            </h2>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="datetime-local"
                value={pickupTime}
                min={minPickup}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full h-14 pl-11 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-2xl text-base font-bold text-black focus:outline-none transition-colors"
                required
              />
            </div>
            <p className="text-[11px] text-black/45 font-medium mt-2">
              Earliest pickup is 15 minutes from now.
            </p>
          </section>
        )}

        {/* Payment */}
        <section>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-black/55 mb-3">
            Payment
          </h2>
          <ul className="space-y-2">
            {PAYMENT_METHODS.map(p => {
              const active = paymentMethod === p.key
              const Icon = p.icon
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(p.key)}
                    className={`w-full flex items-center gap-3 px-4 h-16 rounded-2xl border-2 transition-all ${
                      active ? 'bg-black text-white border-black' : 'bg-white text-black border-black/15 hover:border-black'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      active ? 'bg-white text-black' : 'bg-[#F4F4F4] text-black'
                    }`}>
                      <Icon className="w-4 h-4" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-sm">{p.label}</p>
                      <p className={`text-[11px] font-medium truncate ${active ? 'text-white/65' : 'text-black/55'}`}>
                        {p.sub}
                      </p>
                    </div>
                    {active && <span className="w-3 h-3 rounded-full bg-white shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Cash-with-change calculator */}
          {paymentMethod === 'cash' && (
            <div className="mt-3 bg-[#F4F4F4] rounded-2xl p-4 space-y-3 animate-[fadeSlide_0.25s_ease]">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 block mb-2">
                  Paying with (so they bring the right change)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-black/55">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder={`e.g. ${Math.ceil(total / 5) * 5}.00`}
                    className="w-full h-14 pl-9 pr-4 bg-white border-2 border-black/15 focus:border-black rounded-2xl text-base font-bold text-black focus:outline-none transition-colors"
                  />
                </div>

                {/* Quick presets */}
                <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                  {CASH_PRESETS.filter(v => v >= total).slice(0, 5).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCashGiven(String(v))}
                      className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold transition-all ${
                        Number(cashGiven) === v
                          ? 'bg-black text-white'
                          : 'bg-white text-black border border-black/15 hover:border-black'
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashGiven(String(total.toFixed(2)))}
                    className={`shrink-0 h-9 px-3 rounded-full text-xs font-bold transition-all ${
                      Number(cashGiven) === total
                        ? 'bg-black text-white'
                        : 'bg-white text-black border border-black/15 hover:border-black'
                    }`}
                  >
                    Exact (${total.toFixed(2)})
                  </button>
                </div>
              </div>

              {/* Change display */}
              {cashGivenNum > 0 && (
                <div
                  className={`rounded-xl px-4 py-3 flex items-center justify-between transition-all ${
                    cashShort
                      ? 'bg-red-50 border border-red-200'
                      : change > 0
                        ? 'bg-black text-white'
                        : 'bg-green-50 border border-green-200 text-green-800'
                  }`}
                >
                  <div className="text-xs font-extrabold uppercase tracking-wider">
                    {cashShort ? 'Short' : change > 0 ? 'Change owed' : 'Exact change'}
                  </div>
                  <div className="text-lg font-extrabold tabular-nums">
                    {cashShort
                      ? `–$${(total - cashGivenNum).toFixed(2)}`
                      : `$${change.toFixed(2)}`}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-black/55 font-medium leading-relaxed">
                Tells the restaurant exactly what bill you're paying with — they'll bring change to your table or have it ready at pickup.
              </p>
            </div>
          )}
        </section>

        {/* Items summary */}
        <section className="bg-[#F4F4F4] rounded-2xl p-4 space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-black/55 mb-2">
            {cart.itemCount} item{cart.itemCount > 1 ? 's' : ''}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {cart.items.map((it, idx) => (
              <li key={idx} className="flex justify-between gap-2">
                <span className="text-black/75 truncate">
                  {it.quantity}× {it.name} <span className="text-black/45 capitalize">· {it.size || 'regular'}</span>
                </span>
                <span className="font-bold text-black tabular-nums shrink-0">
                  ${(Number(it.price) * it.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-black/10 pt-2 flex justify-between text-base">
            <span className="font-extrabold text-black">Total</span>
            <span className="font-extrabold text-black tabular-nums">${total.toFixed(2)}</span>
          </div>
        </section>

        {error && (
          <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}

        {/* Place order */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/5 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={submitting}
            className="max-w-md mx-auto w-full h-14 rounded-full bg-black text-white font-extrabold flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {submitting ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                Place Order · ${total.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
