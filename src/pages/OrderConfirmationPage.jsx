import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Clock, ChefHat, Bell, Package, Home, XCircle, Timer, ClipboardList } from 'lucide-react'
import { subscribeToOrder, updateOrderStatus } from '../lib/services'
import StatusBadge from '../components/StatusBadge'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock, description: 'Waiting for confirmation' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, description: 'Restaurant accepted your order' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Your food is being prepared' },
  { key: 'ready', label: 'Ready', icon: Bell, description: 'Your order is ready!' },
  { key: 'completed', label: 'Completed', icon: Package, description: 'Order complete' },
]

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'completed']

// Cancellation window in milliseconds (2 minutes)
const CANCEL_WINDOW_MS = 2 * 60 * 1000

// Estimated prep time per item (minutes)
const BASE_PREP_MIN = 10
const PER_ITEM_MIN = 3

export default function OrderConfirmationPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelTimeLeft, setCancelTimeLeft] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeToOrder(orderId, (orderData) => {
      setOrder(orderData)
      setLoading(false)
    })

    return unsubscribe
  }, [orderId])

  // Cancellation countdown timer
  useEffect(() => {
    if (!order || order.status === 'cancelled') return
    const createdAt = order.created_at ? new Date(order.created_at) : null
    if (!createdAt) return

    const tick = () => {
      const elapsed = Date.now() - createdAt.getTime()
      const remaining = Math.max(0, CANCEL_WINDOW_MS - elapsed)
      setCancelTimeLeft(remaining)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [order?.created_at, order?.status])

  // Can cancel if within window AND still pending
  const canCancel = order?.status === 'pending' && cancelTimeLeft > 0

  const handleCancel = async () => {
    if (!canCancel) return
    setCancelling(true)
    try {
      await updateOrderStatus(orderId, 'cancelled')
    } catch (err) {
      console.error('Cancel failed:', err)
    }
    setCancelling(false)
  }

  // Estimated prep time based on item count
  const estimatedMinutes = useMemo(() => {
    if (!order?.items) return BASE_PREP_MIN
    const totalItems = order.items.reduce((sum, i) => sum + (i.quantity || 1), 0)
    return BASE_PREP_MIN + Math.ceil(totalItems * PER_ITEM_MIN)
  }, [order?.items])

  if (loading) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4">Loading order...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-gray-500">Order not found</p>
        <Link to="/" className="text-orange-600 font-medium mt-2 inline-block">Go home</Link>
      </div>
    )
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isCancelled
            ? 'bg-red-100'
            : order.status === 'ready'
              ? 'bg-green-100'
              : order.status === 'preparing'
                ? 'bg-purple-100'
                : 'bg-orange-100'
        }`}>
          {isCancelled ? (
            <XCircle className="w-8 h-8 text-red-600" />
          ) : order.status === 'ready' ? (
            <Bell className="w-8 h-8 text-green-600" />
          ) : order.status === 'preparing' ? (
            <ChefHat className="w-8 h-8 text-purple-600" />
          ) : (
            <CheckCircle className="w-8 h-8 text-orange-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isCancelled ? 'Order Cancelled' : order.status === 'ready' ? 'Order Ready!' : 'Order Placed'}
        </h1>
        <p className="text-gray-500 mt-1">
          Order #{orderId?.slice(-8).toUpperCase()}
        </p>
      </div>

      {/* Estimated Prep Time */}
      {!isCancelled && ['pending', 'confirmed', 'preparing'].includes(order.status) && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-900">
              Estimated ready in ~{estimatedMinutes} min
            </p>
            <p className="text-xs text-orange-600/70">
              Based on {order.items?.reduce((s, i) => s + (i.quantity || 1), 0)} item{order.items?.reduce((s, i) => s + (i.quantity || 1), 0) !== 1 ? 's' : ''} in your order
            </p>
          </div>
        </div>
      )}

      {/* Cancel Order Button */}
      {canCancel && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Changed your mind?</p>
              <p className="text-xs text-red-600/70">
                Cancel within {Math.ceil(cancelTimeLeft / 1000)}s
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
          {/* Countdown bar */}
          <div className="mt-3 h-1 bg-red-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(cancelTimeLeft / CANCEL_WINDOW_MS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6 text-center">
          <p className="text-sm text-red-700 font-medium">This order has been cancelled</p>
          <p className="text-xs text-red-500 mt-1">No charges will be applied</p>
        </div>
      )}

      {/* Live Status Tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="space-y-4">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = step.key === order.status
              const isDone = idx < currentStatusIndex
              const isFuture = idx > currentStatusIndex
              const Icon = step.icon

              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-orange-600 text-white ring-4 ring-orange-100'
                        : isDone
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`w-0.5 h-6 mt-1 ${
                        isDone ? 'bg-green-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                  <div className={`pt-1 ${isFuture ? 'opacity-40' : ''}`}>
                    <p className={`text-sm font-medium ${isActive ? 'text-orange-600' : isDone ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Order Details</h2>

        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={order.status} />
          <span className="text-xs text-gray-400">
            {order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'pre_order' ? 'Pre-Order' : 'Takeout'}
          </span>
          {order.table_id && (
            <span className="text-xs text-gray-400">Table {order.table_id}</span>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between py-2.5">
              <div>
                <p className="text-sm text-gray-900">{item.quantity}x {item.name}</p>
                {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
              </div>
              <p className="text-sm font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-3 mt-1 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-gray-900">${order.total?.toFixed(2)}</span>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Payment: {order.payment_method?.charAt(0).toUpperCase() + order.payment_method?.slice(1)}
          {order.cash_amount && ` — Paying $${order.cash_amount.toFixed(2)}, change: $${(order.cash_amount - order.total).toFixed(2)}`}
        </p>
      </div>

      {/* PWA install nudge */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white mb-6">
        <h3 className="font-semibold mb-1">Add Feaster to your home screen</h3>
        <p className="text-sm text-orange-100">
          Get quick access to menus and pre-ordering. Tap your browser's share button and select "Add to Home Screen".
        </p>
      </div>

      <div className="space-y-3">
        <Link
          to="/my-orders"
          className="flex items-center justify-center gap-2 w-full py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          My Orders
        </Link>
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
        >
          <Home className="w-4 h-4" />
          Browse Restaurants
        </Link>
      </div>
    </div>
  )
}
