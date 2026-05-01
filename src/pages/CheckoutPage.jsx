import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Minus, Plus, Trash2, Calendar, CreditCard, Banknote, Smartphone } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { createOrder } from '../lib/services'
import { saveOrder } from '../lib/order-store'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, description: 'Pay when food arrives' },
  { id: 'ecocash', label: 'EcoCash', icon: Smartphone, description: 'Pay via EcoCash' },
  { id: 'innbucks', label: 'InnBucks', icon: Smartphone, description: 'Pay via InnBucks' },
  { id: 'card', label: 'Card', icon: CreditCard, description: 'Pay at counter' },
]

export default function CheckoutPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { cart, dispatch, total, itemCount } = useCart()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [orderType, setOrderType] = useState(cart.tableNumber ? 'dine_in' : 'pre_order')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) { setError('Please enter your name'); return }
    if (cart.items.length === 0) { setError('Your cart is empty'); return }
    if (total < 1) { setError('Minimum order amount is $1.00'); return }
    if ((orderType === 'pre_order' || orderType === 'takeout') && (!scheduledDate || !scheduledTime)) {
      setError('Please select a pickup date and time')
      return
    }

    setSubmitting(true)
    try {
      let deliveryTime = null
      if (orderType === 'pre_order' || orderType === 'takeout') {
        deliveryTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const orderData = {
        restaurant_id: cart.restaurantId,
        table_id: cart.tableNumber || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        items: cart.items.map(i => ({
          item_id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          notes: i.notes || '',
        })),
        order_type: orderType,
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'cash' && cashAmount ? parseFloat(cashAmount) : null,
        delivery_time: deliveryTime,
        total,
        notes: notes.trim() || null,
      }

      const data = await createOrder(orderData)
      saveOrder(data.id, { restaurant: slug, total })
      dispatch({ type: 'CLEAR_CART' })
      navigate(`/order/${data.id}`)
    } catch (err) {
      console.error('Order failed:', err)
      setError('Failed to place order. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="lg:overflow-y-auto thin-scrollbar lg:h-[calc(100vh-3rem)]">
      <div className="px-5 lg:px-8 pt-5 lg:pt-7 pb-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <Link
            to={`/${slug}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-canvas-200 text-ink-500 hover:text-ink-900 hover:bg-canvas-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">Checkout</h1>
            <p className="text-xs text-ink-500 mt-0.5">{itemCount} item{itemCount !== 1 ? 's' : ''} · ${total.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Type */}
            <section className="bg-white rounded-3xl border border-canvas-200 p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Order type</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dine_in', label: 'Dine In', disabled: !cart.tableNumber },
                  { id: 'pre_order', label: 'Pre-Order' },
                  { id: 'takeout', label: 'Takeout' },
                ].map(type => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => !type.disabled && setOrderType(type.id)}
                    disabled={type.disabled}
                    className={`py-2.5 px-3 rounded-2xl text-sm font-semibold border transition-all ${
                      orderType === type.id
                        ? 'bg-ink-900 text-white border-ink-900'
                        : type.disabled
                          ? 'bg-canvas-50 text-ink-300 border-canvas-100 cursor-not-allowed'
                          : 'bg-white text-ink-700 border-canvas-200 hover:border-ink-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {cart.tableNumber && orderType === 'dine_in' && (
                <p className="text-sm text-emerald-600 font-medium mt-3">Table {cart.tableNumber}</p>
              )}

              {(orderType === 'pre_order' || orderType === 'takeout') && (
                <div className="mt-5 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {orderType === 'pre_order' ? 'When are you arriving?' : 'Pickup time'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-ink-500 mb-1.5 block font-medium">Date</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        min={minDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-orange-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-ink-500 mb-1.5 block font-medium">Time</label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-orange-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Customer details */}
            <section className="bg-white rounded-3xl border border-canvas-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-ink-900">Your details</h2>
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1.5 block">Your name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-canvas-50 border border-canvas-200 rounded-2xl text-sm focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1.5 block">Phone (optional)</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full px-4 py-3 bg-canvas-50 border border-canvas-200 rounded-2xl text-sm focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
                />
                <p className="text-xs text-ink-400 mt-1.5">For WhatsApp order updates</p>
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white rounded-3xl border border-canvas-200 p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Payment method</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon
                  const active = paymentMethod === method.id
                  return (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        active
                          ? 'bg-orange-50 border-orange-300 text-orange-900'
                          : 'bg-white border-canvas-200 text-ink-700 hover:border-canvas-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? 'bg-orange-500 text-white shadow-pop' : 'bg-canvas-100 text-ink-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{method.label}</p>
                        <p className="text-[11px] opacity-70 truncate">{method.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {paymentMethod === 'cash' && (
                <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <label className="text-xs font-semibold text-amber-900 mb-2 block">
                    Paying with cash? Enter your amount so we can bring change
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cashAmount}
                      onChange={e => setCashAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                  {cashAmount && parseFloat(cashAmount) >= total && (
                    <p className="text-sm text-emerald-600 font-semibold mt-2">
                      Change: ${(parseFloat(cashAmount) - total).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Notes */}
            <section className="bg-white rounded-3xl border border-canvas-200 p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Special instructions <span className="font-normal text-ink-400">(optional)</span></h2>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special requests..."
                rows={3}
                className="w-full px-4 py-3 bg-canvas-50 border border-canvas-200 rounded-2xl text-sm focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 resize-none transition-all"
              />
            </section>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || cart.items.length === 0 || total < 1}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-pop"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Placing order...
                </span>
              ) : total < 1 ? (
                'Minimum order $1.00'
              ) : (
                `Place Order — $${total.toFixed(2)}`
              )}
            </button>
          </form>

          {/* Order summary sidebar */}
          <aside className="lg:sticky lg:top-6 self-start">
            <div className="bg-white rounded-3xl border border-canvas-200 p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-4">
                Your order <span className="text-ink-400 font-normal">({itemCount})</span>
              </h2>
              <div className="space-y-3 mb-5">
                {cart.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{item.name}</p>
                      <p className="text-xs text-ink-400 mt-0.5 tabular-nums">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity - 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-canvas-100 hover:bg-canvas-200 text-ink-700"
                      >
                        {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity + 1 })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-canvas-200 space-y-2">
                <div className="flex justify-between text-sm text-ink-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-ink-900 pt-2 border-t border-canvas-100">
                  <span>Total</span>
                  <span className="tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
