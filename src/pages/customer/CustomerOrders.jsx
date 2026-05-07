import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Utensils, Clock, ShoppingBag, ChevronRight } from 'lucide-react'

const ICONS = {
  in_house: Utensils,
  takeaway: ShoppingBag,
  pre_order: Clock,
}

const TYPE_LABELS = {
  in_house: 'Dine In',
  takeaway: 'Take Away',
  pre_order: 'Pre-Order',
}

const STATUS_AT = [
  { key: 'placed',     label: 'Placed',     at: 0 },
  { key: 'confirmed',  label: 'Confirmed',  at: 45 },
  { key: 'preparing',  label: 'Preparing',  at: 120 },
  { key: 'ready',      label: 'Ready',      at: 480 },
]

function liveStatus(order, now) {
  const elapsedSec = (now - new Date(order.created_at).getTime()) / 1000
  if (order.order_type === 'pre_order' && order.pickup_time) {
    const minutesToPickup = (new Date(order.pickup_time).getTime() - now) / 60000
    if (minutesToPickup > 30) return STATUS_AT[0]
    if (minutesToPickup > 15) return STATUS_AT[1]
    if (minutesToPickup > 0)  return STATUS_AT[2]
    return STATUS_AT[3]
  }
  let cur = STATUS_AT[0]
  for (const s of STATUS_AT) if (elapsedSec >= s.at) cur = s
  return cur
}

export default function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    try {
      setOrders(JSON.parse(localStorage.getItem('feaster:orders') || '[]'))
    } catch {
      setOrders([])
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(t)
  }, [])

  const enriched = useMemo(
    () => orders.map(o => ({ ...o, _status: liveStatus(o, now) })),
    [orders, now]
  )

  return (
    <div className="min-h-[100dvh] bg-white px-5 pt-7 page-fade-in">
      <h1 className="text-2xl font-black text-black tracking-tight">Orders</h1>
      <p className="text-sm text-black/55 mt-1 font-medium">Your order history.</p>

      {orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#F4F4F4] flex items-center justify-center mb-4">
            <ClipboardList className="w-9 h-9 text-black/30" />
          </div>
          <h2 className="text-lg font-extrabold text-black">No orders yet</h2>
          <p className="text-sm text-black/50 mt-1 max-w-xs">
            When you place an order, it'll show up here so you can track and re-order.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {enriched.map(o => {
            const Icon = ICONS[o.order_type] || ClipboardList
            const isReady = o._status.key === 'ready'
            return (
              <li key={o.id}>
                <Link
                  to={`/app/order/${o.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-black/10 hover:border-black p-4 active:scale-[0.99] transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-extrabold text-black truncate">
                        {o.restaurant?.name || 'Order'}
                      </p>
                      <span className="text-sm font-extrabold text-black tabular-nums shrink-0">
                        ${Number(o.total).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[11px] font-bold text-black/55 truncate">
                        #{o.id} · {TYPE_LABELS[o.order_type] || o.order_type} ·{' '}
                        {new Date(o.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isReady
                            ? 'bg-green-600 text-white'
                            : 'bg-black text-white'
                        }`}
                      >
                        {isReady && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                        {o._status.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
