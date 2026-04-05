import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Filter, Download } from 'lucide-react'
import { getRestaurantBySlug, getOrdersByRestaurant } from '../../lib/services'
import StatusBadge from '../../components/StatusBadge'
import { formatDate } from '../../lib/dates'

const DEMO_ORDERS = [
  { id: 'o1', customer_name: 'Tafadzwa M.', customer_phone: '0771234567', order_type: 'dine_in', table_id: '5', status: 'completed', total: 23.00, payment_method: 'cash', items: [{ name: 'Classic Burger', quantity: 2, price: 8.50 }, { name: 'Fresh Juice', quantity: 2, price: 3.00 }], created_at: { toDate: () => new Date() } },
  { id: 'o2', customer_name: 'Chiedza N.', customer_phone: '0782345678', order_type: 'takeout', table_id: null, status: 'completed', total: 19.50, payment_method: 'ecocash', items: [{ name: 'Fish & Chips', quantity: 1, price: 12.00 }, { name: 'Caesar Salad', quantity: 1, price: 7.50 }], created_at: { toDate: () => new Date(Date.now() - 3600000) } },
  { id: 'o3', customer_name: 'Kudakwashe P.', customer_phone: '', order_type: 'dine_in', table_id: '12', status: 'preparing', total: 25.00, payment_method: 'card', items: [{ name: 'T-Bone Steak', quantity: 1, price: 18.00 }, { name: 'Castle Lager', quantity: 2, price: 3.50 }], created_at: { toDate: () => new Date(Date.now() - 7200000) } },
  { id: 'o4', customer_name: 'Rudo S.', customer_phone: '0713456789', order_type: 'pre_order', table_id: null, status: 'pending', total: 35.00, payment_method: 'innbucks', items: [{ name: 'Mozambican Prawns', quantity: 1, price: 22.00 }, { name: 'Chocolate Brownie', quantity: 2, price: 5.50 }, { name: 'Coca-Cola', quantity: 1, price: 2.00 }], created_at: { toDate: () => new Date(Date.now() - 86400000) } },
]

export default function OrderHistory() {
  const { slug } = useParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          const allOrders = await getOrdersByRestaurant(rest.id)
          setOrders(allOrders.length > 0 ? allOrders : DEMO_ORDERS)
        } else {
          setOrders(DEMO_ORDERS)
        }
      } catch {
        setOrders(DEMO_ORDERS)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (typeFilter !== 'all' && o.order_type !== typeFilter) return false
    if (search && !o.customer_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalRevenue = filtered.reduce((s, o) => s + (o.total || 0), 0)

  if (loading) {
    return <div className="animate-pulse space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Order History</h2>
          <p className="text-sm text-gray-500">{filtered.length} orders — ${totalRevenue.toFixed(2)} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Types</option>
          <option value="dine_in">Dine In</option>
          <option value="pre_order">Pre-Order</option>
          <option value="takeout">Takeout</option>
        </select>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => (
                <>
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      {order.table_id && <p className="text-xs text-gray-400">Table {order.table_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {order.order_type?.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{order.payment_method}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">${order.total?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {order.created_at?.toDate ? formatDate(order.created_at.toDate(), 'MMM d, h:mm a') : '-'}
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-details`}>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50">
                        <div className="space-y-1">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.quantity}x {item.name}</span>
                              <span className="text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}
