import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Clock, DollarSign, Users, ChefHat,
  Bell, Check, Package, LogOut, Printer, Hash, CreditCard, Banknote,
  Smartphone, MapPin, ArrowRight, RefreshCw, Search, Filter, QrCode, Download, Store, UtensilsCrossed,
  BookOpen, Plus, Pencil, Trash2, X as XIcon, Eye, EyeOff, Upload, Image, Link2, Loader
} from 'lucide-react'
import QRCodeLib from 'qrcode'
import { getRestaurantBySlug, subscribeToKitchenOrders, updateOrderStatus, getOrdersByRestaurant, getTables, getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem, uploadImage } from '../../lib/services'
import { getAuthInstance } from '../../lib/firebase'
import { formatDistanceToNow, formatDate } from '../../lib/dates'
import { buildQRPrintHTML, downloadQRImage } from '../../lib/qr-print'

const NEXT_STATUS = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed' }
const STATUS_CONFIG = {
  pending: { label: 'New Order', color: 'bg-yellow-500', border: 'border-yellow-500/30', action: 'Confirm Order', actionColor: 'bg-blue-600 hover:bg-blue-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500', border: 'border-blue-500/30', action: 'Start Preparing', actionColor: 'bg-purple-600 hover:bg-purple-700' },
  preparing: { label: 'Preparing', color: 'bg-purple-500', border: 'border-purple-500/30', action: 'Mark Ready', actionColor: 'bg-green-600 hover:bg-green-700' },
  ready: { label: 'Ready', color: 'bg-green-500', border: 'border-green-500/30', action: 'Complete', actionColor: 'bg-gray-600 hover:bg-gray-700' },
  completed: { label: 'Completed', color: 'bg-gray-500', border: 'border-gray-500/30' },
}
const ORDER_TYPE_LABELS = { dine_in: 'Dine In', pre_order: 'Pre-Order', takeout: 'Takeout' }
const PAYMENT_ICONS = { cash: Banknote, ecocash: Smartphone, innbucks: Smartphone, card: CreditCard }

export default function POSDashboard() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [activeOrders, setActiveOrders] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [qrTab, setQrTab] = useState('restaurant')
  const [tables, setTables] = useState([])
  const [qrCodes, setQrCodes] = useState({})
  const [restaurantQR, setRestaurantQR] = useState(null)
  const prevCount = useRef(0)
  const audioRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        setRestaurant(rest || { id: 'demo', slug, name: slug })

        if (rest) {
          // Fetch orders and tables in parallel — not one after another
          const [orders, t] = await Promise.all([
            getOrdersByRestaurant(rest.id),
            getTables(rest.id),
          ])
          setAllOrders(orders)
          t.sort((a, b) => {
            const na = parseInt(a.table_number, 10)
            const nb = parseInt(b.table_number, 10)
            if (!isNaN(na) && !isNaN(nb)) return na - nb
            return a.table_number.localeCompare(b.table_number)
          })
          setTables(t)
        }
      } catch {
        setRestaurant({ id: 'demo', slug, name: slug })
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Generate restaurant QR
  useEffect(() => {
    async function gen() {
      try {
        setRestaurantQR(await QRCodeLib.toDataURL(`${window.location.origin}/${slug}`, {
          width: 400, margin: 2, color: { dark: '#1f2937', light: '#ffffff' },
        }))
      } catch {}
    }
    gen()
  }, [slug])

  // Generate table QR codes
  useEffect(() => {
    if (tables.length === 0) return
    async function gen() {
      const codes = {}
      for (const table of tables) {
        const url = `${window.location.origin}/${slug}/table/${table.table_number}`
        try {
          codes[table.id] = await QRCodeLib.toDataURL(url, {
            width: 400, margin: 2,
            color: { dark: '#1f2937', light: '#ffffff' },
          })
        } catch {}
      }
      setQrCodes(codes)
    }
    gen()
  }, [tables, slug])

  useEffect(() => {
    if (!restaurant?.id) return

    if (restaurant.id === 'demo') {
      setActiveOrders(DEMO_ORDERS)
      setAllOrders(DEMO_ORDERS)
      const demoTables = [1,2,3,4,5,6].map(n => ({ id: `dt${n}`, table_number: String(n) }))
      setTables(demoTables)
      return
    }

    const unsubscribe = subscribeToKitchenOrders(restaurant.id, (orders) => {
      if (orders.length > prevCount.current) {
        try { audioRef.current?.play() } catch {}
      }
      prevCount.current = orders.length
      setActiveOrders(orders)
    })
    return unsubscribe
  }, [restaurant])

  const handleStatusUpdate = async (orderId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus]
    if (!next) return

    if (orderId.startsWith('demo-')) {
      if (next === 'completed') {
        setActiveOrders(prev => prev.filter(o => o.id !== orderId))
      } else {
        setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o))
      }
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next } : o))
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: next }))
      return
    }

    try {
      await updateOrderStatus(orderId, next)
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  const stats = {
    active: activeOrders.filter(o => o.status !== 'completed').length,
    pending: activeOrders.filter(o => o.status === 'pending').length,
    todayRevenue: allOrders
      .filter(o => {
        const d = o.created_at?.toDate?.()
        return d && d.toDateString() === new Date().toDateString()
      })
      .reduce((s, o) => s + (o.total || 0), 0),
    todayOrders: allOrders.filter(o => {
      const d = o.created_at?.toDate?.()
      return d && d.toDateString() === new Date().toDateString()
    }).length,
  }

  const filteredOrders = activeOrders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (searchQuery && !o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !o.table_id?.includes(searchQuery)) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-orange-400 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Audio */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjyLwdvRfSwSN4O81NWDNggqc7nU2I4+BS1xtdfakUMFLHC11dqTRQQucLXV2pRFBC5wtdXalEUELnC11dqURQ==" type="audio/wav" />
      </audio>

      {/* Top Bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm capitalize">{restaurant?.name}</h1>
            <p className="text-[10px] text-gray-500">Feaster POS System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowMenu(!showMenu); if (!showMenu) setShowQR(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showMenu ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>
          <button
            onClick={() => { setShowQR(!showQR); if (!showQR) setShowMenu(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showQR ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Codes</span>
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Live</span>
          </div>
          <button
            onClick={() => navigate('/system/login')}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 lg:px-6 py-3 shrink-0">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[
            { label: 'Active Orders', value: stats.active, icon: ShoppingBag, color: 'text-orange-400' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: stats.pending > 0 ? 'text-yellow-400' : 'text-gray-500' },
            { label: "Today's Orders", value: stats.todayOrders, icon: Hash, color: 'text-blue-400' },
            { label: "Today's Revenue", value: `$${stats.todayRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-4 py-2.5 min-w-fit">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Panel */}
        {showMenu && (
          <POSMenuPanel restaurant={restaurant} />
        )}

        {/* QR Codes Panel */}
        {showQR && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit mb-6">
              <button
                onClick={() => setQrTab('restaurant')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  qrTab === 'restaurant' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" />
                Restaurant QR
              </button>
              <button
                onClick={() => setQrTab('tables')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  qrTab === 'tables' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                Dine-In Tables ({tables.length})
              </button>
            </div>

            {qrTab === 'restaurant' ? (
              /* Restaurant QR */
              <div className="max-w-sm mx-auto text-center">
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8">
                  <div className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4">
                    <Store className="w-3 h-3" />
                    RESTAURANT
                  </div>
                  {restaurantQR ? (
                    <div className="bg-white rounded-xl p-3 inline-block">
                      <img src={restaurantQR} alt="Restaurant QR" className="w-44 h-44" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 mx-auto flex items-center justify-center bg-gray-700 rounded-xl">
                      <QrCode className="w-14 h-14 text-gray-500" />
                    </div>
                  )}
                  <h3 className="text-lg font-bold mt-4">{restaurant?.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">Scan to view menu & order</p>
                  <p className="text-xs text-gray-600 font-mono mt-2">{window.location.origin}/{slug}</p>
                  <div className="flex gap-3 mt-5 justify-center">
                    <button
                      onClick={() => downloadQRImage(restaurantQR, `${slug}-restaurant-qr.png`)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-600"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        const html = buildQRPrintHTML({
                          restaurantName: restaurant?.name || slug,
                          type: 'restaurant',
                          items: [{ qrDataUrl: restaurantQR, label: restaurant?.name || slug, sublabel: 'Scan to view menu & order', url: `${window.location.origin}/${slug}` }],
                        })
                        const pw = window.open('', '_blank')
                        pw.document.write(html)
                        pw.document.close()
                        pw.print()
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 rounded-xl text-sm font-medium text-white hover:bg-orange-700"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Use this QR on flyers, posters, or at the entrance for customers to browse & order.
                </p>
              </div>
            ) : (
              /* Table QR Codes */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    {tables.length} table{tables.length !== 1 ? 's' : ''} — each QR activates dine-in with table number
                  </p>
                  {tables.length > 0 && (
                    <button
                      onClick={() => {
                        const items = tables.map(t => ({
                          qrDataUrl: qrCodes[t.id],
                          label: `Table ${t.table_number}`,
                          sublabel: 'Scan to order — Dine In',
                          url: `${window.location.origin}/${slug}/table/${t.table_number}`,
                        }))
                        const html = buildQRPrintHTML({ restaurantName: restaurant?.name || slug, type: 'table', items })
                        const pw = window.open('', '_blank')
                        pw.document.write(html)
                        pw.document.close()
                        pw.print()
                      }}
                      className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100"
                    >
                      <Printer className="w-4 h-4" />
                      Print All (4 per A4)
                    </button>
                  )}
                </div>
                {tables.length === 0 ? (
                  <div className="text-center py-16">
                    <QrCode className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500">No tables configured</p>
                    <p className="text-sm text-gray-600 mt-1">Add tables from the Admin Panel or Platform Dashboard</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {tables.map(table => (
                      <div key={table.id} className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-3 flex justify-center bg-white rounded-t-xl">
                          {qrCodes[table.id] ? (
                            <img src={qrCodes[table.id]} alt={`Table ${table.table_number}`} className="w-28 h-28" />
                          ) : (
                            <div className="w-28 h-28 flex items-center justify-center">
                              <QrCode className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 text-center">
                          <span className="inline-block bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide mb-1">DINE IN</span>
                          <p className="font-bold text-sm">Table {table.table_number}</p>
                          <button
                            onClick={() => downloadQRImage(qrCodes[table.id], `${slug}-table-${table.table_number}-qr.png`)}
                            className="mt-2 flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-gray-700 rounded-lg text-xs font-medium text-gray-300 hover:bg-gray-600"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Orders List (left panel) */}
        {!showQR && !showMenu && <>
        <div className="w-full lg:w-[420px] xl:w-[480px] border-r border-gray-800 flex flex-col shrink-0">
          {/* Filter bar */}
          <div className="px-4 py-3 border-b border-gray-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or table..."
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'New' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'preparing', label: 'Preparing' },
                { key: 'ready', label: 'Ready' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === f.key ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="ml-1">({activeOrders.filter(o => o.status === f.key).length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Orders */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No orders</p>
              </div>
            ) : (
              filteredOrders.map(order => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const isSelected = selectedOrder?.id === order.id
                const timeAgo = order.created_at?.toDate ? formatDistanceToNow(order.created_at.toDate()) : ''

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${
                      isSelected ? 'bg-gray-800 border-l-2 border-l-orange-500' : ''
                    } ${order.status === 'pending' ? 'bg-yellow-500/5' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.color}`} />
                        <span className="font-semibold text-sm">{order.customer_name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {order.table_id && (
                        <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                          T{order.table_id}
                        </span>
                      )}
                      <span className="bg-gray-800 px-1.5 py-0.5 rounded">
                        {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                      </span>
                      <span>{order.items?.length} items</span>
                      <span className="ml-auto font-medium text-white">${order.total?.toFixed(2)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Order Detail (right panel) */}
        <div className="hidden lg:flex flex-1 flex-col">
          {selectedOrder ? (
            <OrderDetail
              order={selectedOrder}
              onStatusUpdate={handleStatusUpdate}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600">Select an order to view details</p>
              </div>
            </div>
          )}
        </div>
        </>}
      </div>
    </div>
  )
}

function OrderDetail({ order, onStatusUpdate }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const PaymentIcon = PAYMENT_ICONS[order.payment_method] || Banknote
  const timeAgo = order.created_at?.toDate ? formatDistanceToNow(order.created_at.toDate()) : ''
  const orderTime = order.created_at?.toDate ? formatDate(order.created_at.toDate(), 'h:mm a') : ''

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Order header */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">{order.customer_name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Order #{order.id?.slice(-8).toUpperCase()} — {orderTime} ({timeAgo})
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${config.color} text-white`}>
            {config.label}
          </span>
        </div>

        {/* Order meta */}
        <div className="flex flex-wrap gap-2">
          {order.table_id && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium">
              <MapPin className="w-3.5 h-3.5" />
              Table {order.table_id}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium">
            <ShoppingBag className="w-3.5 h-3.5" />
            {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium capitalize">
            <PaymentIcon className="w-3.5 h-3.5" />
            {order.payment_method}
          </div>
          {order.customer_phone && (
            <div className="flex items-center gap-1.5 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium">
              <Smartphone className="w-3.5 h-3.5" />
              {order.customer_phone}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-6 py-4 flex-1">
        <h3 className="text-sm font-medium text-gray-400 mb-3">ORDER ITEMS</h3>
        <div className="space-y-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-start justify-between bg-gray-800/50 rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 bg-orange-600/20 text-orange-400 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                  {item.quantity}x
                </span>
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.notes && (
                    <p className="text-xs text-yellow-400 mt-0.5">Note: {item.notes}</p>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Special instructions */}
        {order.notes && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-400 font-medium mb-1">SPECIAL INSTRUCTIONS</p>
            <p className="text-sm text-yellow-200">{order.notes}</p>
          </div>
        )}

        {/* Payment summary */}
        <div className="mt-6 bg-gray-800/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">PAYMENT</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span>${order.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Payment Method</span>
              <span className="capitalize">{order.payment_method}</span>
            </div>
            {order.payment_method === 'cash' && order.cash_amount && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Customer Paying</span>
                  <span className="text-green-400">${order.cash_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-yellow-400">Change Due</span>
                  <span className="text-yellow-400">${(order.cash_amount - order.total).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-700 font-bold text-lg">
              <span>Total</span>
              <span className="text-green-400">${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      {config.action && (
        <div className="px-6 py-4 border-t border-gray-800">
          <button
            onClick={() => onStatusUpdate(order.id, order.status)}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${config.actionColor}`}
          >
            {config.action}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── POS Menu Panel ───────────────────────────────────────────
function POSMenuPanel({ restaurant }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const imageRef = useRef()

  useEffect(() => {
    if (!restaurant?.id || restaurant.id === 'demo') {
      setItems([
        { id: 'm1', name: 'Classic Burger', description: 'Beef patty, lettuce, tomato', price: 8.50, category: 'Mains', is_available: true },
        { id: 'm2', name: 'Chicken Wings (6pc)', description: 'Crispy fried wings', price: 6.00, category: 'Starters', is_available: true },
      ])
      setLoading(false)
      return
    }
    getMenuItems(restaurant.id)
      .then(data => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [restaurant])

  const categories = [...new Set(items.map(i => i.category))]

  const [uploadError, setUploadError] = useState('')

  const handleImageUpload = async (file) => {
    if (!file) return
    setUploadError('')

    try {
      const auth = await getAuthInstance()
      if (!auth.currentUser) {
        setUploadError('Please log in to upload images')
        return
      }
    } catch {}

    setUploading(true)
    setUploadProgress(0)
    try {
      const path = `menu/${restaurant.slug || restaurant.id}/${Date.now()}.${file.name.split('.').pop()}`
      const url = await uploadImage(path, file, {
        forMenu: true,
        onProgress: setUploadProgress,
      })
      setForm(f => ({ ...f, image_url: url }))
    } catch (err) {
      console.error('Image upload failed:', err)
      setUploadError('Upload failed — check your connection and try again')
    }
    setUploading(false)
    setUploadProgress(0)
  }

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) return
    setSaving(true)
    const data = { name: form.name, description: form.description, price: parseFloat(form.price), category: form.category, image_url: form.image_url || null, restaurant_id: restaurant.id }

    try {
      if (editItem === 'new') {
        if (restaurant.id === 'demo') {
          setItems(prev => [...prev, { ...data, id: 'new-' + Date.now(), is_available: true }])
        } else {
          const docRef = await addMenuItem(data)
          setItems(prev => [...prev, { ...data, id: docRef.id, is_available: true }])
        }
      } else {
        if (!editItem.id.startsWith('m') && !editItem.id.startsWith('new')) await updateMenuItem(editItem.id, data)
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i))
      }
    } catch {
      if (editItem === 'new') setItems(prev => [...prev, { ...data, id: 'new-' + Date.now(), is_available: true }])
      else setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i))
    }
    setEditItem(null)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return
    try { if (!id.startsWith('m') && !id.startsWith('new')) await deleteMenuItem(id) } catch {}
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const toggleAvail = async (item) => {
    const v = !item.is_available
    try { if (!item.id.startsWith('m') && !item.id.startsWith('new')) await updateMenuItem(item.id, { is_available: v }) } catch {}
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: v } : i))
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader className="w-8 h-8 text-orange-400 animate-spin" /></div>

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">Menu Management</h2>
          <p className="text-sm text-gray-500">{items.length} items across {categories.length} categories</p>
        </div>
        <button
          onClick={() => { setEditItem('new'); setForm({ name: '', description: '', price: '', category: '', image_url: '' }) }}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16">
          <Image className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No menu items yet</p>
          <p className="text-sm text-gray-600 mt-1">Add your first item with name, price, and photo</p>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{cat}</h3>
          <div className="space-y-2">
            {items.filter(i => i.category === cat).map(item => (
              <div key={item.id} className={`flex items-center gap-3 bg-gray-800/50 px-4 py-3 rounded-xl border border-gray-700 ${!item.is_available ? 'opacity-40' : ''}`}>
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-gray-700 shrink-0 flex items-center justify-center">
                    <Image className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                </div>
                <span className="text-sm font-bold text-orange-400 shrink-0">${item.price.toFixed(2)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleAvail(item)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-500">
                    {item.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { setEditItem(item); setForm({ name: item.name, description: item.description || '', price: item.price.toString(), category: item.category, image_url: item.image_url || '' }) }} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-500">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add/Edit Modal */}
      {editItem !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h3 className="font-semibold">{editItem === 'new' ? 'Add Menu Item' : 'Edit Menu Item'}</h3>
              <button onClick={() => setEditItem(null)} className="p-1 hover:bg-gray-700 rounded"><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Item Photo</label>
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="" className="w-full h-36 rounded-xl object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"><XIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div onClick={() => !uploading && imageRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 w-3/4">
                        <Loader className="w-6 h-6 text-orange-500 animate-spin" />
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{uploadProgress}%</span>
                      </div>
                    ) : <><Upload className="w-6 h-6 text-gray-500 mb-1" /><span className="text-sm text-gray-500">Upload photo</span></>}
                  </div>
                )}
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files[0])} />
                {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
                {!form.image_url && (
                  <div className="flex items-center gap-2 mt-2">
                    <Link2 className="w-4 h-4 text-gray-500 shrink-0" />
                    <input type="url" value={form.image_url || ''} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Or paste image URL..." />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Grilled Chicken" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="Short description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">Price (USD) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">Category *</label>
                  <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Mains" />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-700 flex gap-3">
              <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.price || !form.category} className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Demo orders for testing without Firebase
const DEMO_ORDERS = [
  {
    id: 'demo-pos-1', customer_name: 'Tafadzwa M.', customer_phone: '0771234567',
    table_id: '5', order_type: 'dine_in', status: 'pending', payment_method: 'cash',
    cash_amount: 30.00, total: 23.00, notes: 'Extra napkins please',
    items: [
      { name: 'Classic Burger', quantity: 2, price: 8.50, notes: 'No onions on one' },
      { name: 'Fresh Juice', quantity: 2, price: 3.00, notes: 'Mango' },
    ],
    created_at: { toDate: () => new Date(Date.now() - 60000) },
  },
  {
    id: 'demo-pos-2', customer_name: 'Chiedza N.', customer_phone: '0782345678',
    table_id: null, order_type: 'takeout', status: 'confirmed', payment_method: 'ecocash',
    total: 19.50, notes: '',
    items: [
      { name: 'Fish & Chips', quantity: 1, price: 12.00, notes: '' },
      { name: 'Caesar Salad', quantity: 1, price: 7.50, notes: 'Extra dressing' },
    ],
    created_at: { toDate: () => new Date(Date.now() - 300000) },
  },
  {
    id: 'demo-pos-3', customer_name: 'Kudakwashe P.', customer_phone: '',
    table_id: '12', order_type: 'dine_in', status: 'preparing', payment_method: 'card',
    total: 25.00,
    items: [
      { name: 'Grilled T-Bone Steak', quantity: 1, price: 18.00, notes: 'Medium rare' },
      { name: 'Castle Lager', quantity: 2, price: 3.50, notes: '' },
    ],
    created_at: { toDate: () => new Date(Date.now() - 600000) },
  },
  {
    id: 'demo-pos-4', customer_name: 'Rudo S.', customer_phone: '0713456789',
    table_id: '3', order_type: 'dine_in', status: 'ready', payment_method: 'innbucks',
    total: 15.00,
    items: [
      { name: 'Chicken Wings (6pc)', quantity: 1, price: 6.00, notes: '' },
      { name: 'Nachos', quantity: 1, price: 7.00, notes: 'Extra cheese' },
      { name: 'Coca-Cola', quantity: 1, price: 2.00, notes: '' },
    ],
    created_at: { toDate: () => new Date(Date.now() - 900000) },
  },
]
