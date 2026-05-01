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
const CANCEL_WINDOW_MS = 2 * 60 * 1000
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

  useEffect(() => {
    if (!order || order.status === 'cancelled') return
    const createdAt = order.created_at ? new Date(order.created_at) : null
    if (!createdAt) return
    const tick = () => {
      const elapsed = Date.now() - createdAt.getTime()
      setCancelTimeLeft(Math.max(0, CANCEL_WINDOW_MS - elapsed))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [order?.created_at, order?.status])

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

  const estimatedMinutes = useMemo(() => {
    if (!order?.items) return BASE_PREP_MIN
    const totalItems = order.items.reduce((sum, i) => sum + (i.quantity || 1), 0)
    return BASE_PREP_MIN + Math.ceil(totalItems * PER_ITEM_MIN)
  }, [order?.items])

  if (loading) {
    return (
      <div className="px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin mx-auto" />
        <p className="text-ink-500 mt-4">Loading order...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-ink-500">Order not found</p>
        <Link to="/" className="text-orange-600 font-semibold mt-2 inline-block">Go home</Link>
      </div>
    )
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  const heroBg = isCancelled
    ? 'bg-red-50 border-red-100'
    : order.status === 'ready'
      ? 'bg-emerald-50 border-emerald-100'
      : order.status === 'preparing'
        ? 'bg-violet-50 border-violet-100'
        : 'bg-orange-50 border-orange-100'

  const heroIconBg = isCancelled
    ? 'bg-red-500'
    : order.status === 'ready'
      ? 'bg-emerald-500'
      : order.status === 'preparing'
        ? 'bg-violet-500'
        : 'bg-orange-500'

  return (
    <div className="lg:overflow-y-auto thin-scrollbar lg:h-[calc(100vh-3rem)]">
      <div className="px-5 lg:px-8 pt-5 lg:pt-7 pb-10 max-w-2xl mx-auto">
        {/* Hero */}
        <div className={`rounded-3xl border p-6 lg:p-8 mb-6 text-center ${heroBg}`}>
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-pop ${heroIconBg}`}>
            {isCancelled ? (
              <XCircle className="w-8 h-8" />
            ) : order.status === 'ready' ? (
              <Bell className="w-8 h-8" />
            ) : order.status === 'preparing' ? (
              <ChefHat className="w-8 h-8" />
            ) : (
              <CheckCircle className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-ink-900 tracking-tight">
            {isCancelled ? 'Order Cancelled' : order.status === 'ready' ? 'Order Ready!' : 'Order Placed'}
          </h1>
          <p className="text-ink-500 mt-1.5 text-sm">
            Order #{orderId?.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Estimated Prep Time */}
        {!isCancelled && ['pending', 'confirmed', 'preparing'].includes(order.status) && (
          <div className="bg-white rounded-3xl border border-canvas-200 p-5 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shrink-0 shadow-pop">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">
                Ready in ~{estimatedMinutes} min
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                Based on {order.items?.reduce((s, i) => s + (i.quantity || 1), 0)} item{order.items?.reduce((s, i) => s + (i.quantity || 1), 0) !== 1 ? 's' : ''} in your order
              </p>
            </div>
          </div>
        )}

        {/* Cancel */}
        {canCancel && (
          <div className="bg-white rounded-3xl border border-red-100 p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-800">Changed your mind?</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Cancel within {Math.ceil(cancelTimeLeft / 1000)}s
                </p>
              </div>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-2xl hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
            <div className="mt-3 h-1 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(cancelTimeLeft / CANCEL_WINDOW_MS) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Tracker */}
        {!isCancelled && (
          <div className="bg-white rounded-3xl border border-canvas-200 p-6 mb-4">
            <h2 className="text-sm font-bold text-ink-900 mb-5">Order progress</h2>
            <div className="space-y-1">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = step.key === order.status
                const isDone = idx < currentStatusIndex
                const isFuture = idx > currentStatusIndex
                const Icon = step.icon

                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white ring-4 ring-orange-100 shadow-pop'
                          : isDone
                            ? 'bg-emerald-500 text-white'
                            : 'bg-canvas-100 text-ink-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-7 mt-1 ${isDone ? 'bg-emerald-300' : 'bg-canvas-200'}`} />
                      )}
                    </div>
                    <div className={`pt-1.5 pb-5 ${isFuture ? 'opacity-40' : ''}`}>
                      <p className={`text-sm font-semibold ${isActive ? 'text-orange-700' : isDone ? 'text-emerald-700' : 'text-ink-500'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-ink-400 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-5 mb-4 text-center">
            <p className="text-sm text-red-700 font-semibold">This order has been cancelled</p>
            <p className="text-xs text-red-500 mt-1">No charges will be applied</p>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-3xl border border-canvas-200 p-6 mb-4">
          <h2 className="text-sm font-bold text-ink-900 mb-4">Order Details</h2>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <StatusBadge status={order.status} />
            <span className="text-xs text-ink-500 bg-canvas-100 px-2 py-1 rounded-md font-medium">
              {order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'pre_order' ? 'Pre-Order' : 'Takeout'}
            </span>
            {order.table_id && (
              <span className="text-xs text-ink-500 bg-canvas-100 px-2 py-1 rounded-md font-medium">Table {order.table_id}</span>
            )}
          </div>

          <div className="divide-y divide-canvas-100">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between py-2.5">
                <div>
                  <p className="text-sm text-ink-900 font-medium">{item.quantity}× {item.name}</p>
                  {item.notes && <p className="text-xs text-ink-400 mt-0.5">{item.notes}</p>}
                </div>
                <p className="text-sm font-semibold text-ink-900 tabular-nums">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 mt-2 border-t border-canvas-200">
            <span className="font-semibold text-ink-900">Total</span>
            <span className="font-bold text-xl text-ink-900 tabular-nums">${order.total?.toFixed(2)}</span>
          </div>

          <p className="text-xs text-ink-400 mt-3">
            Payment: {order.payment_method?.charAt(0).toUpperCase() + order.payment_method?.slice(1)}
            {order.cash_amount && ` — Paying $${order.cash_amount.toFixed(2)}, change: $${(order.cash_amount - order.total).toFixed(2)}`}
          </p>
        </div>

        {/* PWA nudge */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-3xl p-6 text-white mb-6 overflow-hidden shadow-pop">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <h3 className="font-bold text-base relative">Add Feaster to your home screen</h3>
          <p className="text-sm text-white/85 mt-1 relative">
            Get quick access to menus and pre-ordering. Tap your browser's share button and select "Add to Home Screen".
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/my-orders"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-ink-900 text-white rounded-2xl font-semibold hover:bg-ink-700 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            My Orders
          </Link>
          <Link
            to="/explore"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-canvas-200 rounded-2xl text-ink-700 hover:bg-canvas-50 hover:border-canvas-300 font-semibold"
          >
            <Home className="w-4 h-4" />
            Browse Restaurants
          </Link>
        </div>
      </div>
    </div>
  )
}
