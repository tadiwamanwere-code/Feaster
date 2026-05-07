import { useEffect, useMemo, useState } from 'react'
import { ShoppingBag, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getRestaurants } from '../../lib/services'

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']
const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed:  'bg-blue-100 text-blue-800 border-blue-300',
  preparing:  'bg-purple-100 text-purple-800 border-purple-300',
  ready:      'bg-emerald-100 text-emerald-800 border-emerald-300',
  completed:  'bg-black/5 text-black/60 border-black/15',
  cancelled:  'bg-red-100 text-red-800 border-red-300',
}

export default function PlatformOrders() {
  const [orders, setOrders] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [restaurantFilter, setRestaurantFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase
        .from('orders')
        .select('id, total, status, created_at, order_type, restaurant_id, customer_name, table_number, scheduled_for')
        .order('created_at', { ascending: false })
        .limit(200),
      getRestaurants({ activeOnly: false }),
    ]).then(([ord, rs]) => {
      if (cancelled) return
      setOrders(ord.data || [])
      setRestaurants(rs)
    }).finally(() => { if (!cancelled) setLoading(false) })

    // Realtime subscribe to all order changes
    const channel = supabase
      .channel('platform-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data } = await supabase
          .from('orders')
          .select('id, total, status, created_at, order_type, restaurant_id, customer_name, table_number, scheduled_for')
          .order('created_at', { ascending: false })
          .limit(200)
        if (!cancelled) setOrders(data || [])
      })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (restaurantFilter !== 'all' && o.restaurant_id !== restaurantFilter) return false
      return true
    })
  }, [orders, statusFilter, restaurantFilter])

  const totalGmv = filtered.reduce((s, o) => s + Number(o.total || 0), 0)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/45">
          Live
        </p>
        <h1 className="text-3xl font-black text-black tracking-tight mt-1">All orders</h1>
        <p className="text-sm text-black/55 mt-1">Realtime feed across every restaurant.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-black/55">
          <Filter className="w-3.5 h-3.5" /> Filter
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-full bg-white border border-black/15 text-sm font-bold text-black focus:outline-none focus:border-black"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All status' : s}</option>
          ))}
        </select>
        <select
          value={restaurantFilter}
          onChange={(e) => setRestaurantFilter(e.target.value)}
          className="h-10 px-3 rounded-full bg-white border border-black/15 text-sm font-bold text-black focus:outline-none focus:border-black"
        >
          <option value="all">All restaurants</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <span className="ml-auto inline-flex items-center gap-2 px-3 h-10 rounded-full bg-black text-white text-sm font-extrabold">
          {filtered.length} orders · ${totalGmv.toFixed(2)}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-[#F4F4F4] rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/10 p-10 text-center">
          <ShoppingBag className="w-10 h-10 text-black/25 mx-auto mb-3" />
          <p className="text-sm font-bold text-black">No orders match these filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F4F4] text-[11px] font-extrabold uppercase tracking-wider text-black/55">
              <tr>
                <th className="text-left px-4 py-3">Restaurant</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.map(o => {
                const r = restaurants.find(x => x.id === o.restaurant_id)
                return (
                  <tr key={o.id} className="hover:bg-black/[.02]">
                    <td className="px-4 py-3 font-bold text-black">{r?.name || '—'}</td>
                    <td className="px-4 py-3 text-black/75">
                      {o.customer_name || '—'}
                      {o.table_number && <span className="block text-[11px] text-black/45">Table {o.table_number}</span>}
                    </td>
                    <td className="px-4 py-3 capitalize text-black/65 text-xs">
                      {o.order_type?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider border rounded-full px-2 py-0.5 ${STATUS_BADGE[o.status] || 'bg-black/5 border-black/10 text-black/60'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold tabular-nums text-black">
                      ${Number(o.total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-black/45 tabular-nums">
                      {new Date(o.created_at).toLocaleString([], {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
