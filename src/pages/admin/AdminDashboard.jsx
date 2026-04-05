import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DollarSign, ShoppingBag, Users, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { getOrdersByRestaurant, getRestaurantBySlug } from '../../lib/services'

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
          // Demo data
          setOrders([
            { id: '1', total: 23.00, status: 'completed', order_type: 'dine_in', created_at: { toDate: () => new Date() } },
            { id: '2', total: 19.50, status: 'preparing', order_type: 'takeout', created_at: { toDate: () => new Date() } },
            { id: '3', total: 45.00, status: 'completed', order_type: 'dine_in', created_at: { toDate: () => new Date(Date.now() - 86400000) } },
            { id: '4', total: 32.00, status: 'completed', order_type: 'pre_order', created_at: { toDate: () => new Date(Date.now() - 86400000) } },
            { id: '5', total: 15.00, status: 'pending', order_type: 'dine_in', created_at: { toDate: () => new Date() } },
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
    const d = o.created_at?.toDate?.()
    return d && d.toDateString() === new Date().toDateString()
  })
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0)
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0)
  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status))

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Active Orders', value: activeOrders.length, icon: Clock, color: 'bg-orange-50 text-orange-600' },
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ]

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`/admin/${slug}/menu`}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 transition-colors group"
        >
          <span className="font-medium text-gray-900">Manage Menu</span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600" />
        </Link>
        <Link
          to={`/admin/${slug}/tables`}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 transition-colors group"
        >
          <span className="font-medium text-gray-900">QR Codes & Tables</span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600" />
        </Link>
        <Link
          to={`/kitchen/${slug}`}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-200 transition-colors group"
        >
          <span className="font-medium text-gray-900">Open Kitchen Display</span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600" />
        </Link>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to={`/admin/${slug}/orders`} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.customer_name || 'Customer'}
                </p>
                <p className="text-xs text-gray-400">
                  {order.order_type?.replace('_', ' ')} — {order.status}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900">${order.total?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
