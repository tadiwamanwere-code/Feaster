import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DollarSign, ShoppingBag, Clock, TrendingUp, ArrowRight,
  BookOpen, QrCode, ChefHat, Utensils, Star,
} from 'lucide-react'
import { getOrdersByRestaurant, getRestaurantBySlug, getMenuItems } from '../../lib/services'

const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed:  'bg-blue-100 text-blue-800 border-blue-300',
  preparing:  'bg-purple-100 text-purple-800 border-purple-300',
  ready:      'bg-emerald-100 text-emerald-800 border-emerald-300',
  completed:  'bg-black/5 text-black/60 border-black/15',
  cancelled:  'bg-red-100 text-red-800 border-red-300',
}

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

export default function AdminDashboard() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [orders, setOrders] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (!rest) { setNotFound(true); return }
        setRestaurant(rest)
        const [ord, items] = await Promise.all([
          getOrdersByRestaurant(rest.id),
          getMenuItems(rest.id),
        ])
        setOrders(ord)
        setMenuItems(items)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const stats = useMemo(() => {
    const today = startOfDay()
    const todayOrders = orders.filter(o => o.created_at && new Date(o.created_at) >= today)
    const todayRevenue = todayOrders
      .filter(o => ['confirmed', 'preparing', 'ready', 'completed'].includes(o.status))
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    const totalRevenue = orders
      .filter(o => ['confirmed', 'preparing', 'ready', 'completed'].includes(o.status))
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    const activeOrders = orders.filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    )
    return {
      todayCount: todayOrders.length,
      todayRevenue,
      totalRevenue,
      active: activeOrders.length,
      totalOrders: orders.length,
      menuItems: menuItems.length,
    }
  }, [orders, menuItems])

  const topDishes = useMemo(() => {
    const tally = new Map()
    for (const o of orders) {
      if (!['confirmed', 'preparing', 'ready', 'completed'].includes(o.status)) continue
      const items = Array.isArray(o.items) ? o.items : []
      for (const it of items) {
        const key = it.name || it.item_id || 'Item'
        const cur = tally.get(key) || { name: key, count: 0, revenue: 0 }
        cur.count += Number(it.quantity || 1)
        cur.revenue += Number(it.price || 0) * Number(it.quantity || 1)
        tally.set(key, cur)
      }
    }
    return Array.from(tally.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [orders])

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-xl font-extrabold text-black">Restaurant not found</h2>
          <p className="text-sm text-black/55 mt-2">
            Couldn't find <span className="font-mono font-bold text-black">/{slug}</span>.
          </p>
          <Link to="/platform" className="inline-flex items-center gap-2 mt-6 px-5 h-11 bg-black text-white rounded-full text-sm font-extrabold active:scale-95 transition-transform">
            Back to Platform
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[#F4F4F4] rounded-2xl" />)}
        </div>
        <div className="h-72 bg-[#F4F4F4] rounded-2xl" />
      </div>
    )
  }

  const quickLinks = [
    { to: `/admin/${slug}/menu`,    label: 'Manage Menu',    desc: 'Add or edit dishes', icon: BookOpen },
    { to: `/admin/${slug}/tables`,  label: 'QR Codes',       desc: 'Tables & QR setup',  icon: QrCode },
    { to: `/kitchen/${slug}`,       label: 'Kitchen Display',desc: 'Live order view',    icon: ChefHat },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/45">
          {restaurant?.cuisine_type || 'Restaurant'} · {restaurant?.city || '—'}
        </p>
        <h1 className="text-3xl font-black text-black tracking-tight mt-1">
          {restaurant?.name || 'Dashboard'}
        </h1>
        <p className="text-sm text-black/55 mt-1 font-medium">Today's snapshot.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShoppingBag} label="Today's orders" value={stats.todayCount} sub={`${stats.totalOrders} all time`} accent />
        <StatCard icon={DollarSign}  label="Today's revenue" value={`$${stats.todayRevenue.toFixed(2)}`} sub={`$${stats.totalRevenue.toFixed(0)} all time`} />
        <StatCard icon={Clock}       label="Active now"      value={stats.active} sub="Pending + preparing" />
        <StatCard icon={TrendingUp}  label="Menu items"      value={stats.menuItems} sub="Available now" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {quickLinks.map(link => {
          const Icon = link.icon
          return (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-black/10 hover:border-black hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-[#F4F4F4] flex items-center justify-center group-hover:bg-black transition-colors">
                <Icon className="w-5 h-5 text-black group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-black">{link.label}</p>
                <p className="text-xs text-black/55 truncate">{link.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <header className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-black/45" />
              <h2 className="font-extrabold text-black text-sm">Recent orders</h2>
            </div>
            <Link to={`/admin/${slug}/orders`} className="text-xs font-extrabold text-black/55 hover:text-black inline-flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </header>

          {orders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ShoppingBag className="w-10 h-10 text-black/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-black">No orders yet</p>
              <p className="text-xs text-black/45 mt-1">Orders appear here when customers start ordering</p>
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {orders.slice(0, 6).map(o => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-black/[.02]">
                  <div className="w-9 h-9 rounded-full bg-[#F4F4F4] flex items-center justify-center shrink-0 text-xs font-extrabold text-black">
                    {(o.customer_name || 'C')[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-black truncate">
                      {o.customer_name || 'Customer'}
                      {o.table_number && <span className="text-black/45"> · Table {o.table_number}</span>}
                    </p>
                    <p className="text-[11px] text-black/45 font-semibold">
                      {o.order_type?.replace('_', ' ')}
                      {o.created_at && ` · ${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-block text-[10px] font-extrabold uppercase tracking-wider border rounded-full px-2 py-0.5 ${STATUS_BADGE[o.status] || STATUS_BADGE.completed}`}>
                    {o.status}
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-black w-16 text-right">
                    ${Number(o.total || 0).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <header className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-black/45" />
              <h2 className="font-extrabold text-black text-sm">Top dishes</h2>
            </div>
            <Link to={`/admin/${slug}/menu`} className="text-xs font-extrabold text-black/55 hover:text-black inline-flex items-center gap-1">
              Menu <ArrowRight className="w-3 h-3" />
            </Link>
          </header>
          {topDishes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Star className="w-10 h-10 text-black/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-black">No data yet</p>
              <p className="text-xs text-black/45 mt-1">Top sellers appear after orders are completed</p>
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {topDishes.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-7 h-7 rounded-full bg-black text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-black truncate">{d.name}</p>
                    <p className="text-[11px] text-black/45 font-semibold">{d.count} sold</p>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums text-black">
                    ${d.revenue.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl p-5 border-2 ${
      accent ? 'bg-black text-white border-black' : 'bg-white border-black/10'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        accent ? 'bg-white/15' : 'bg-[#F4F4F4]'
      }`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-white' : 'text-black'}`} />
      </div>
      <p className={`mt-4 text-2xl font-black tracking-tight ${accent ? 'text-white' : 'text-black'}`}>
        {value}
      </p>
      <p className={`text-[11px] font-bold mt-1 ${accent ? 'text-white/70' : 'text-black/55'}`}>
        {label}
      </p>
      {sub && (
        <p className={`text-[10px] mt-0.5 font-semibold ${accent ? 'text-white/55' : 'text-black/40'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}
