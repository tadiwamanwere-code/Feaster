import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, Bike, Utensils } from 'lucide-react'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { supabase } from '../../lib/supabase'

const ORDER_TYPE_ICONS = {
  dine_in: Utensils,
  pre_order: Clock,
  delivery: Bike,
  takeout: Package,
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function CustomerOrders() {
  const { profile } = useCustomerAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select('id, restaurant_id, order_type, status, total, created_at, scheduled_for, restaurants(name, slug, logo_url)')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!cancelled) {
        if (!error) setOrders(data || [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`customer-orders-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${profile.id}`,
      }, load)
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [profile])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900">No orders yet</h2>
          <p className="text-sm text-gray-500 mt-1">Place your first order to see it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-gray-900">Your orders</h1>
      <ul className="space-y-3">
        {orders.map(o => {
          const Icon = ORDER_TYPE_ICONS[o.order_type] || Package
          const restaurant = o.restaurants
          return (
            <li key={o.id}>
              <Link
                to={`/app/track/${o.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {restaurant?.logo_url && (
                    <img src={restaurant.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {restaurant?.name || 'Order'}
                      </h3>
                      <span className="text-sm font-bold text-gray-900">${Number(o.total).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Icon className="w-3.5 h-3.5" /> {o.order_type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
