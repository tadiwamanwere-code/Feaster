import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, ChefHat, Bell, Package, XCircle, ShoppingBag, Receipt, ChevronLeft, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getSavedOrders } from '../lib/order-store'

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  ready: { label: 'Ready', icon: Bell, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  completed: { label: 'Completed', icon: Package, color: 'text-ink-500', bg: 'bg-canvas-100 border-canvas-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
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
    <div className="bg-canvas-50/50 rounded-2xl border border-canvas-200 overflow-hidden">
      <div className="bg-white px-5 py-3 border-b border-canvas-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-ink-400" />
          <span className="text-sm font-semibold text-ink-900">Receipt</span>
        </div>
        <button
          onClick={copyReceipt}
          className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-orange-600 transition-colors font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-400">Order #{orderId}</p>
            <p className="text-xs text-ink-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span className="text-xs font-semibold text-ink-700 bg-white border border-canvas-200 px-2.5 py-1 rounded-lg">
            {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
          </span>
        </div>

        {order.table_id && <p className="text-xs text-ink-500">Table {order.table_id}</p>}

        <div className="border-t border-dashed border-canvas-300 pt-3">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex justify-between py-1.5">
              <span className="text-sm text-ink-700">{item.quantity}× {item.name}</span>
              <span className="text-sm text-ink-900 font-semibold tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-canvas-200 pt-3 flex justify-between">
          <span className="font-semibold text-ink-900">Total</span>
          <span className="font-bold text-lg text-ink-900 tabular-nums">${order.total?.toFixed(2)}</span>
        </div>

        <div className="text-xs text-ink-400 space-y-1">
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
      <div className="px-4 py-20 text-center">
        <div className="w-9 h-9 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin mx-auto" />
        <p className="text-ink-500 mt-4 text-sm">Loading your orders...</p>
      </div>
    )
  }

  return (
    <div className="lg:overflow-y-auto thin-scrollbar lg:h-[calc(100vh-3rem)]">
      <div className="px-5 lg:px-8 pt-5 lg:pt-7 pb-10 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-7">
          <Link
            to="/explore"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-canvas-200 text-ink-500 hover:text-ink-900 hover:bg-canvas-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">My Orders</h1>
            <p className="text-xs text-ink-500 mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} on this device</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-canvas-200">
            <div className="w-14 h-14 rounded-2xl bg-canvas-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7 text-ink-400" />
            </div>
            <p className="text-ink-900 font-semibold">No orders yet</p>
            <p className="text-sm text-ink-500 mt-1">Your orders will appear here after you place one</p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-2xl shadow-pop hover:from-orange-600 hover:to-orange-700"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-ink-900 mb-3 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                  </span>
                  Active Orders
                </h2>
                <div className="space-y-3">
                  {activeOrders.map(order => {
                    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                    const Icon = config.icon
                    const isExpanded = expandedId === order.id

                    return (
                      <div key={order.id} className="bg-white rounded-3xl border border-canvas-200 overflow-hidden hover:shadow-soft transition-shadow">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          className="w-full px-4 py-4 flex items-center gap-3 text-left"
                        >
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${config.bg}`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-ink-900">
                                #{order.id?.slice(-8).toUpperCase()}
                              </p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${config.bg} ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                            <p className="text-xs text-ink-400 mt-0.5">
                              {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · ${order.total?.toFixed(2)} · {formatTime(order.created_at)}
                            </p>
                          </div>
                          <Link
                            to={`/order/${order.id}`}
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-orange-600 font-bold hover:text-orange-700 mr-2"
                          >
                            Track
                          </Link>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-canvas-200 pt-3">
                            <OrderReceipt order={order} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {pastOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-ink-900 mb-3">Order History</h2>
                <div className="space-y-3">
                  {pastOrders.map(order => {
                    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.completed
                    const Icon = config.icon
                    const isExpanded = expandedId === order.id

                    return (
                      <div key={order.id} className="bg-white rounded-3xl border border-canvas-200 overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          className="w-full px-4 py-4 flex items-center gap-3 text-left"
                        >
                          <div className="w-11 h-11 bg-canvas-100 rounded-2xl flex items-center justify-center">
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink-700">
                              #{order.id?.slice(-8).toUpperCase()}
                            </p>
                            <p className="text-xs text-ink-400 mt-0.5">
                              {formatDate(order.created_at)} · ${order.total?.toFixed(2)} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-400 ml-2" /> : <ChevronDown className="w-4 h-4 text-ink-400 ml-2" />}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-canvas-200 pt-3">
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
    </div>
  )
}
