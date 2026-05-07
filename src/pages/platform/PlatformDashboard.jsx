import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, ShoppingBag, DollarSign, Users, TrendingUp,
  ArrowRight, QrCode, PlusCircle, Bike, Activity,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getRestaurants } from '../../lib/services'

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

export default function PlatformDashboard() {
  const [restaurants, setRestaurants] = useState([])
  const [orders, setOrders] = useState([])
  const [customerCount, setCustomerCount] = useState(null)
  const [driverCount, setDriverCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      try {
        const [rs, ord, custCount, drvCount] = await Promise.all([
          getRestaurants({ activeOnly: false }),
          supabase
            .from('orders')
            .select('id, total, status, created_at, order_type, restaurant_id')
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('drivers').select('id', { count: 'exact', head: true }),
        ])

        if (cancelled) return
        setRestaurants(rs)
        setOrders(ord.data || [])
        setCustomerCount(custCount.count ?? 0)
        setDriverCount(drvCount.count ?? 0)
      } catch (err) {
        console.error('Platform stats failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const today = startOfDay()
    const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
    const completedToday = todayOrders.filter(o =>
      ['confirmed', 'preparing', 'ready', 'completed'].includes(o.status)
    )
    const gmvToday = completedToday.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const gmvAll = orders
      .filter(o => ['confirmed', 'preparing', 'ready', 'completed'].includes(o.status))
      .reduce((s, o) => s + (Number(o.total) || 0), 0)
    const activeOrders = orders.filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    ).length
    const activeRestaurants = restaurants.filter(r => r.is_active).length

    return {
      activeRestaurants,
      totalRestaurants: restaurants.length,
      todayOrders: todayOrders.length,
      gmvToday,
      gmvAll,
      activeOrders,
      customers: customerCount ?? 0,
      drivers: driverCount ?? 0,
    }
  }, [orders, restaurants, customerCount, driverCount])

  // Top restaurants by completed-order revenue
  const topRestaurants = useMemo(() => {
    const tally = new Map()
    for (const o of orders) {
      if (!['confirmed', 'preparing', 'ready', 'completed'].includes(o.status)) continue
      const r = restaurants.find(x => x.id === o.restaurant_id)
      if (!r) continue
      const cur = tally.get(r.id) || { name: r.name, slug: r.slug, orders: 0, revenue: 0 }
      cur.orders += 1
      cur.revenue += Number(o.total) || 0
      tally.set(r.id, cur)
    }
    return Array.from(tally.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [orders, restaurants])

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[#F4F4F4] rounded-2xl" />)}
        </div>
        <div className="h-72 bg-[#F4F4F4] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/45">
          Platform Overview
        </p>
        <h1 className="text-3xl font-black text-black tracking-tight mt-1">Dashboard</h1>
        <p className="text-sm text-black/55 mt-1">Live snapshot of every restaurant on Feaster.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Building2}
          label="Restaurants"
          value={stats.activeRestaurants}
          sub={`of ${stats.totalRestaurants} total`}
          accent
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders today"
          value={stats.todayOrders}
          sub={`${stats.activeOrders} active`}
        />
        <StatCard
          icon={DollarSign}
          label="GMV today"
          value={`$${stats.gmvToday.toFixed(2)}`}
          sub={`$${stats.gmvAll.toFixed(0)} all time`}
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={stats.customers}
          sub={`${stats.drivers} drivers`}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ActionCard
          icon={PlusCircle}
          title="Add restaurant"
          desc="Create a new restaurant manually"
          to="/platform/add"
        />
        <ActionCard
          icon={QrCode}
          title="QR codes"
          desc="Generate, print, download table QRs"
          to="/platform/qr-codes"
        />
        <ActionCard
          icon={Activity}
          title="Live orders"
          desc="See orders across all restaurants"
          to="/platform/orders"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top restaurants */}
        <section className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <header className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/45">
                Top revenue
              </p>
              <h2 className="text-base font-extrabold text-black mt-0.5">Best restaurants</h2>
            </div>
            <Link
              to="/platform/restaurants"
              className="text-xs font-extrabold text-black/55 hover:text-black inline-flex items-center gap-1"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </header>
          {topRestaurants.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-black/45 font-medium">
              No completed orders yet.
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {topRestaurants.map((r, i) => (
                <li key={r.slug}>
                  <Link
                    to={`/admin/${r.slug}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-black/[.03] transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-black text-white font-extrabold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">{r.name}</p>
                      <p className="text-[11px] text-black/45 font-semibold">{r.orders} orders</p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums text-black">
                      ${r.revenue.toFixed(2)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <header className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-black/45">
                Recent
              </p>
              <h2 className="text-base font-extrabold text-black mt-0.5">Latest orders</h2>
            </div>
            <Link
              to="/platform/orders"
              className="text-xs font-extrabold text-black/55 hover:text-black inline-flex items-center gap-1"
            >
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </header>
          {orders.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-black/45 font-medium">
              No orders yet.
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {orders.slice(0, 6).map(o => {
                const r = restaurants.find(x => x.id === o.restaurant_id)
                return (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-full bg-[#F4F4F4] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black truncate">
                        {r?.name || 'Restaurant'}
                      </p>
                      <p className="text-[11px] text-black/45 font-semibold capitalize">
                        {o.order_type?.replace('_', ' ')} · {o.status}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums text-black">
                      ${Number(o.total || 0).toFixed(2)}
                    </span>
                  </li>
                )
              })}
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

function ActionCard({ icon: Icon, title, desc, to }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-black/10 hover:border-black hover:-translate-y-0.5 transition-all"
    >
      <div className="w-11 h-11 rounded-xl bg-[#F4F4F4] flex items-center justify-center group-hover:bg-black transition-colors">
        <Icon className="w-5 h-5 text-black group-hover:text-white transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-black">{title}</p>
        <p className="text-xs text-black/55 truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}
