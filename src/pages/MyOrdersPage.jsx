import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, ChefHat, Bell, Package, XCircle, ShoppingBag, Receipt, ArrowLeft, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getSavedOrders } from '../lib/order-store'

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  ready: { label: 'Ready', icon: Bell, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
  completed: { label: 'Completed', icon: Package, color: 'text-gray-400', bg: 'bg-gray-100 border-gray-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
}

const ORDER_TYPE_LABELS = { dine_in: 'Dine In', pre_order: 'Pre-Order', takeout: 'Takeout' }

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function OrderReceipt({ order }) {
  const [copied, setCopied] = useState(false)
  const orderId = order.id?.slice(-8).toUpperCase()

  const copyReceipt = () => {
    const text = [
      `FEASTER — ORDER RECEIPT`,
      `Order #${orderId}`,
      `Date: ${new Date(order.created_at).toLocaleString()}`,
      `Type: ${ORDER_TYPE_LABELS[order.order_type] || order.order_type}`,
      order.table_id ? `Table: ${order.table_id}` : null,
      ``,
      `--- ITEMS ---`,
      ...(order.items || []).map(i => `${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}`),
      ``,
      `TOTAL: $${order.total?.toFixed(2)}`,
      `Payment: ${order.payment_method?.charAt(0).toUpperCase()}${order.payment_method?.slice(1)}`,
      order.cash_amount ? `Paid: $${order.cash_amount.toFixed(2)} | Change: $${(order.cash_amount - order.total).toFixed(2)}` : null,
      `Status: ${order.status}`,
      ``,
      `Powered by Feaster`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Receipt header */}
      <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Receipt</span>
        </div>
        <button
          onClick={copyReceipt}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Order info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Order #{orderId}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
            {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
          </span>
        </div>

        {order.table_id && (
          <p className="text-xs text-gray-500">Table {order.table_id}</p>
        )}

        {/* Items */}
        <div className="border-t border-dashed border-gray-200 pt-3">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex justify-between py-1.5">
              <span className="text-sm text-gray-700">{item.quantity}x {item.name}</span>
              <span className="text-sm text-gray-900 font-medium tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-3 flex justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-gray-900">${order.total?.toFixed(2)}</span>
        </div>

        {/* Payment info */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>Payment: {order.payment_method?.charAt(0).toUpperCase()}{order.payment_method?.slice(1)}</p>
          {order.cash_amount && (
            <p>Paid: ${order.cash_amount.toFixed(2)} — Change: ${(order.cash_amount - order.total).toFixed(2)}</p>
          )}
          {order.customer_name && <p>Customer: {order.customer_name}</p>}
        </div>
      </div>
    </div>
  )
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    async function load() {
      const saved = getSavedOrders()
      if (saved.length === 0) {
        setLoading(false)
        return
      }

      const ids = saved.map(o => o.id)
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    }
    load()

    // Subscribe to realtime updates for active orders
    const saved = getSavedOrders()
    const activeIds = saved.map(o => o.id)
    if (activeIds.length === 0) return

    const channel = supabase
      .channel('my-orders')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          if (activeIds.includes(payload.new.id)) {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
  const pastOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status))

  if (loading) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4 text-sm">Loading your orders...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/explore"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
          <p className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''} on this device</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Your orders will appear here after you place one</p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 mt-4 text-sm text-orange-600 font-semibold hover:text-orange-700"
          >
            Browse Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                Active Orders
              </h2>
              <div className="space-y-3">
                {activeOrders.map(order => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                  const Icon = config.icon
                  const isExpanded = expandedId === order.id

                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="w-full px-4 py-4 flex items-center gap-3 text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${config.bg}`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              #{order.id?.slice(-8).toUpperCase()}
                            </p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · ${order.total?.toFixed(2)} · {formatTime(order.created_at)}
                          </p>
                        </div>
                        <Link
                          to={`/order/${order.id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-orange-600 font-semibold hover:text-orange-700 mr-2"
                        >
                          Track
                        </Link>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                          <OrderReceipt order={order} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past Orders */}
          {pastOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Order History</h2>
              <div className="space-y-3">
                {pastOrders.map(order => {
                  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.completed
                  const Icon = config.icon
                  const isExpanded = expandedId === order.id

                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="w-full px-4 py-4 flex items-center gap-3 text-left"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            #{order.id?.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(order.created_at)} · ${order.total?.toFixed(2)} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                          <OrderReceipt order={order} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
