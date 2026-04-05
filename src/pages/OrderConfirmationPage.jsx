import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Clock, ChefHat, Bell, Package, ArrowLeft, Home } from 'lucide-react'
import { subscribeToOrder, getOrder } from '../lib/services'
import StatusBadge from '../components/StatusBadge'

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock, description: 'Waiting for confirmation' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, description: 'Restaurant accepted your order' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Your food is being prepared' },
  { key: 'ready', label: 'Ready', icon: Bell, description: 'Your order is ready!' },
  { key: 'completed', label: 'Completed', icon: Package, description: 'Order complete' },
]

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'completed']

export default function OrderConfirmationPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const isDemo = orderId?.startsWith('demo-')

  useEffect(() => {
    if (isDemo) {
      setOrder({
        id: orderId,
        customer_name: 'Demo Customer',
        items: [
          { name: 'Classic Burger', quantity: 2, price: 8.50 },
          { name: 'Fresh Juice', quantity: 1, price: 3.00 },
        ],
        order_type: 'dine_in',
        status: 'pending',
        total: 20.00,
        payment_method: 'cash',
        created_at: { toDate: () => new Date() },
      })
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToOrder(orderId, (orderData) => {
      setOrder(orderData)
      setLoading(false)
    })

    return unsubscribe
  }, [orderId, isDemo])

  // Simulate status changes in demo mode
  useEffect(() => {
    if (!isDemo || !order) return
    const statuses = ['pending', 'confirmed', 'preparing', 'ready']
    const currentIdx = statuses.indexOf(order.status)
    if (currentIdx < statuses.length - 1) {
      const timer = setTimeout(() => {
        setOrder(prev => ({ ...prev, status: statuses[currentIdx + 1] }))
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isDemo, order?.status])

  if (loading) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="w-10 h-10 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
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

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
          order.status === 'ready'
            ? 'bg-green-100'
            : order.status === 'preparing'
              ? 'bg-purple-100'
              : 'bg-orange-100'
        }`}>
          {order.status === 'ready' ? (
            <Bell className="w-8 h-8 text-green-600" />
          ) : order.status === 'preparing' ? (
            <ChefHat className="w-8 h-8 text-purple-600" />
          ) : (
            <CheckCircle className="w-8 h-8 text-orange-600" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {order.status === 'ready' ? 'Order Ready!' : 'Order Placed'}
        </h1>
        <p className="text-gray-500 mt-1">
          Order #{orderId?.slice(-8).toUpperCase()}
        </p>
      </div>

      {/* Live Status Tracker */}
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

      <Link
        to="/"
        className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
      >
        <Home className="w-4 h-4" />
        Browse Restaurants
      </Link>
    </div>
  )
}
