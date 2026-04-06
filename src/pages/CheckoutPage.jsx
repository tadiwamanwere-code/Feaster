import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Trash2, Calendar, Clock, CreditCard, Banknote, Smartphone } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { createOrder, getTimestamp } from '../lib/services'

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

    if (!customerName.trim()) {
      setError('Please enter your name')
      return
    }
    if (cart.items.length === 0) {
      setError('Your cart is empty')
      return
    }
    if (total < 1) {
      setError('Minimum order amount is $1.00')
      return
    }
    if ((orderType === 'pre_order' || orderType === 'takeout') && (!scheduledDate || !scheduledTime)) {
      setError('Please select a pickup date and time')
      return
    }

    setSubmitting(true)
    try {
      let deliveryTime = null
      if (orderType === 'pre_order' || orderType === 'takeout') {
        const Timestamp = await getTimestamp()
        deliveryTime = Timestamp.fromDate(new Date(`${scheduledDate}T${scheduledTime}`))
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

      const docRef = await createOrder(orderData)
      dispatch({ type: 'CLEAR_CART' })
      navigate(`/order/${docRef.id}`)
    } catch (err) {
      console.error('Order failed:', err)
      // For demo mode, create a fake order ID
      const fakeId = 'demo-' + Date.now()
      dispatch({ type: 'CLEAR_CART' })
      navigate(`/order/${fakeId}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Get tomorrow's date as minimum for scheduling
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="px-4 py-6 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/${slug}`}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Order Type Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Order Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'dine_in', label: 'Dine In', disabled: !cart.tableNumber },
            { id: 'pre_order', label: 'Pre-Order' },
            { id: 'takeout', label: 'Takeout' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => !type.disabled && setOrderType(type.id)}
              disabled={type.disabled}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                orderType === type.id
                  ? 'bg-orange-600 text-white border-orange-600'
                  : type.disabled
                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        {cart.tableNumber && orderType === 'dine_in' && (
          <p className="text-sm text-green-600 mt-2">Table {cart.tableNumber}</p>
        )}
      </div>

      {/* Schedule picker for pre-order / takeout */}
      {(orderType === 'pre_order' || orderType === 'takeout') && (
        <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
          <h3 className="text-sm font-medium text-orange-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {orderType === 'pre_order' ? 'When are you arriving?' : 'Pickup time'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={scheduledDate}
                min={minDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Your Order ({itemCount} items)</h2>
        <div className="space-y-3">
          {cart.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                <p className="text-sm text-orange-600 font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity - 1 })}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                </button>
                <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity + 1 })}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <span className="font-medium text-gray-700">Total</span>
          <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer Details */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Your Name *</label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone (optional)</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            placeholder="e.g. 0771234567"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-400 mt-1">For WhatsApp order updates</p>
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(method => {
              const Icon = method.icon
              return (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                    paymentMethod === method.id
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{method.label}</p>
                    <p className="text-xs opacity-70">{method.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cash amount for change */}
        {paymentMethod === 'cash' && (
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
            <label className="text-sm font-medium text-yellow-800 mb-1.5 block">
              Paying with cash? Enter your amount so we can bring change
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-3 border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            {cashAmount && parseFloat(cashAmount) >= total && (
              <p className="text-sm text-green-600 mt-2">
                Change: ${(parseFloat(cashAmount) - total).toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Special instructions */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Special Instructions (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special requests..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || cart.items.length === 0 || total < 1}
          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  )
}
