import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DollarSign, ShoppingBag, Clock, TrendingUp, ArrowRight, BookOpen, QrCode, ChefHat, Utensils } from 'lucide-react'
import { getOrdersByRestaurant, getRestaurantBySlug } from '../../lib/services'

const STATUS_COLORS = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  preparing: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  ready: 'bg-green-500/15 text-green-400 border-green-500/20',
  completed: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function AdminDashboard() {
  const { slug } = useParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          const [allOrders] = await Promise.all([getOrdersByRestaurant(rest.id)])
          setOrders(allOrders)
        } else {
          setOrders([
            { id: '1', total: 23.00, status: 'completed', order_type: 'dine_in', customer_name: 'Tatenda M.', created_at: new Date().toISOString() },
            { id: '2', total: 19.50, status: 'preparing', order_type: 'takeout', customer_name: 'Sarah K.', created_at: new Date().toISOString() },
            { id: '3', total: 45.00, status: 'completed', order_type: 'dine_in', customer_name: 'James N.', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: '4', total: 32.00, status: 'completed', order_type: 'pre_order', customer_name: 'Linda C.', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: '5', total: 15.00, status: 'pending', order_type: 'dine_in', customer_name: 'Mike T.', created_at: new Date().toISOString() },
          ])
        }
      } catch {
        setOrders([])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const todayOrders = orders.filter(o => {
    const d = o.created_at ? new Date(o.created_at) : null
    return d && d.toDateString() === new Date().toDateString()
  })
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0)
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status))

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20' },
    { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, icon: DollarSign, gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20' },
    { label: 'Active Orders', value: activeOrders.length, icon: Clock, gradient: 'from-orange-500 to-orange-600', glow: 'shadow-orange-500/20' },
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp, gradient: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/20' },
  ]

  const quickLinks = [
    { to: `/admin/${slug}/menu`, label: 'Manage Menu', desc: 'Add or edit dishes', icon: BookOpen, color: 'text-orange-400' },
    { to: `/admin/${slug}/tables`, label: 'QR Codes', desc: 'Tables & QR setup', icon: QrCode, color: 'text-blue-400' },
    { to: `/kitchen/${slug}`, label: 'Kitchen Display', desc: 'Live order view', icon: ChefHat, color: 'text-purple-400' },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-gray-800/50 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-800/50 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your restaurant</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-gray-700 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow} mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map(link => {
          const Icon = link.icon
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-4 p-4 bg-gray-900 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all group"
            >
              <div className="w-11 h-11 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-gray-750 transition-colors">
                <Icon className={`w-5 h-5 ${link.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{link.label}</p>
                <p className="text-xs text-gray-500">{link.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          )
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-white text-sm">Recent Orders</h2>
          </div>
          <Link to={`/admin/${slug}/orders`} className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            View All
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No orders yet</p>
            <p className="text-xs text-gray-600 mt-1">Orders will appear here when customers start ordering</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {orders.slice(0, 6).map(order => (
              <div key={order.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-800/30 transition-colors">
                <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-400">
                    {(order.customer_name || 'C')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {order.customer_name || 'Customer'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {order.order_type?.replace('_', ' ')}
                    {order.created_at && ` \u00b7 ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.completed}`}>
                  {order.status}
                </span>
                <span className="text-sm font-bold text-white tabular-nums w-16 text-right">${order.total?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
