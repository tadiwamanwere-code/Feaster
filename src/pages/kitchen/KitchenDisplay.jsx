import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { UtensilsCrossed, Clock, Users, ShoppingBag, ChefHat, Bell, Check, Volume2 } from 'lucide-react'
import { getRestaurantBySlug, subscribeToKitchenOrders, updateOrderStatus } from '../../lib/services'
import StatusBadge from '../../components/StatusBadge'
import { formatDistanceToNow } from '../../lib/dates'

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

const STATUS_ACTIONS = {
  pending: { label: 'Confirm', color: 'bg-blue-600 hover:bg-blue-700' },
  confirmed: { label: 'Start Preparing', color: 'bg-purple-600 hover:bg-purple-700' },
  preparing: { label: 'Mark Ready', color: 'bg-green-600 hover:bg-green-700' },
  ready: { label: 'Complete', color: 'bg-gray-600 hover:bg-gray-700' },
}

const ORDER_TYPE_LABELS = {
  dine_in: 'Dine In',
  pre_order: 'Pre-Order',
  takeout: 'Takeout',
}

export default function KitchenDisplay() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [pin, setPin] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const prevOrderCount = useRef(0)
  const audioRef = useRef(null)

  const [pinError, setPinError] = useState('')

  const handlePinSubmit = (e) => {
    e.preventDefault()
    if (!restaurant?.kitchen_pin) {
      setPinError('No kitchen PIN configured. Set one in restaurant settings.')
      return
    }
    if (pin === restaurant.kitchen_pin) {
      setAuthenticated(true)
    } else {
      setPinError('Incorrect PIN')
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) setRestaurant(rest)
      } catch (err) {
        console.error('Failed to load restaurant:', err)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!restaurant?.id || !authenticated) return

    const unsubscribe = subscribeToKitchenOrders(restaurant.id, (ordersList) => {
      if (ordersList.length > prevOrderCount.current) {
        // Play notification sound for new orders
        try { audioRef.current?.play() } catch {}
      }
      prevOrderCount.current = ordersList.length
      setOrders(ordersList)
    })

    return unsubscribe
  }, [restaurant, authenticated])

  const handleStatusUpdate = async (orderId, currentStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus]
    if (!nextStatus) return


    try {
      await updateOrderStatus(orderId, nextStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-orange-400 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-sm mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
            <p className="text-gray-400 mt-1">{restaurant?.name}</p>
          </div>
          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter kitchen PIN"
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
            >
              Enter Kitchen
            </button>
            {pinError && <p className="text-red-400 text-xs text-center mt-3">{pinError}</p>}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Notification sound */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjyLwdvRfSwSN4O81NWDNggqc7nU2I4+BS1xtdfakUMFLHC11dqTRQQucLXV2pRFBC5wtdXalEUELnC11dqURQQucLXV2pRFBC1wtdXalEUELXC11dqURQQtcLXV2pRFBC1wtdXalEUE" type="audio/wav" />
      </audio>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{restaurant?.name} — Kitchen</h1>
              <p className="text-xs text-gray-400">{orders.length} active order{orders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Live</span>
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'preparing', label: 'Preparing' },
          { key: 'ready', label: 'Ready' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1.5 text-xs">
                ({orders.filter(o => o.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <ChefHat className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No active orders</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const action = STATUS_ACTIONS[order.status]
            const timeAgo = order.created_at?.toDate
              ? formatDistanceToNow(order.created_at.toDate(), { addSuffix: true })
              : ''

            return (
              <div
                key={order.id}
                className={`bg-gray-800 rounded-xl border overflow-hidden ${
                  order.status === 'pending'
                    ? 'border-yellow-500/50 animate-pulse'
                    : order.status === 'ready'
                      ? 'border-green-500/50'
                      : 'border-gray-700'
                }`}
              >
                {/* Order header */}
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {order.table_id ? (
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                        Table {order.table_id}
                      </span>
                    ) : (
                      <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded">
                        {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                      </span>
                    )}
                    <span className="text-sm font-medium">{order.customer_name}</span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm">
                          <span className="font-bold text-orange-400">{item.quantity}x</span>{' '}
                          {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-yellow-400 mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    <p>{timeAgo}</p>
                    <p className="text-gray-500">${order.total?.toFixed(2)} — {order.payment_method}</p>
                  </div>
                  {action && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, order.status)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${action.color}`}
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
