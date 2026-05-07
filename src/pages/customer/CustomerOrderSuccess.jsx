import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check, Utensils, Clock, Receipt, Home as HomeIcon, Banknote, Coins, ChefHat, Bell, ShoppingBag, CheckCircle2 } from 'lucide-react'

const ORDER_LABEL = {
  in_house: 'Dine In',
  takeaway: 'Take Away',
  pre_order: 'Pre-Order',
}

// Auto-progressing status timeline.
// Each step's `at` is seconds after order creation when it auto-advances.
const STATUS_STEPS = [
  { key: 'placed',     label: 'Order placed',         icon: ShoppingBag, at: 0 },
  { key: 'confirmed',  label: 'Restaurant confirmed', icon: Bell,        at: 45 },
  { key: 'preparing',  label: 'Preparing your food',  icon: ChefHat,     at: 120 },
  { key: 'ready',      label: 'Ready for you',        icon: CheckCircle2, at: 480 },
]

function activeStepIndex(order, now) {
  if (!order) return 0
  const elapsedSec = (now - new Date(order.created_at).getTime()) / 1000
  let idx = 0
  for (let i = 0; i < STATUS_STEPS.length; i++) {
    if (elapsedSec >= STATUS_STEPS[i].at) idx = i
  }
  // For pre-order, only progress when within 30 min of pickup time
  if (order.order_type === 'pre_order' && order.pickup_time) {
    const pickup = new Date(order.pickup_time).getTime()
    const minutesToPickup = (pickup - now) / 60000
    if (minutesToPickup > 30) return 0  // too early — only "placed"
    if (minutesToPickup > 15) return Math.min(idx, 1)
    if (minutesToPickup > 0)  return Math.min(idx, 2)
    return 3  // pickup time reached
  }
  return idx
}

export default function CustomerOrderSuccess() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    try {
      const orders = JSON.parse(localStorage.getItem('feaster:orders') || '[]')
      const found = orders.find(o => o.id === id)
      if (!found) navigate('/app', { replace: true })
      else setOrder(found)
    } catch {
      navigate('/app', { replace: true })
    }
  }, [id, navigate])

  // Tick every 5s to advance status
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  const stepIdx = useMemo(() => activeStepIndex(order, now), [order, now])

  if (!order) return null

  const isPreOrder = order.order_type === 'pre_order'
  const minutesUntilPickup = isPreOrder && order.pickup_time
    ? Math.max(0, Math.floor((new Date(order.pickup_time).getTime() - now) / 60000))
    : null

  return (
    <div className="min-h-[100dvh] bg-white pb-12">
      {/* Hero */}
      <div className="bg-black text-white px-6 pt-14 pb-10 text-center rounded-b-[40px] page-fade-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-white text-black flex items-center justify-center" style={{ animation: 'pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
          <Check className="w-10 h-10" strokeWidth={3} />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight">Order placed!</h1>
        <p className="mt-2 text-sm text-white/70 max-w-xs mx-auto">
          We've sent your order to <span className="font-bold text-white">{order.restaurant.name}</span>.
          {isPreOrder && minutesUntilPickup != null && (
            <span className="block mt-1 text-white/70">
              Pickup in <span className="font-bold text-white">
                {minutesUntilPickup < 60 ? `${minutesUntilPickup} min` : new Date(order.pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
          )}
        </p>
        <div className="mt-5 inline-block bg-white/10 backdrop-blur rounded-full px-4 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
            Order ID
          </p>
          <p className="text-xl font-black tracking-wider mt-0.5">#{order.id}</p>
        </div>
      </div>

      {/* Status timeline */}
      <div className="px-5 -mt-4">
        <div className="bg-white rounded-3xl border border-black/10 p-5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-black/55 mb-4">
            Live status
          </h3>
          <ol className="space-y-4">
            {STATUS_STEPS.map((step, i) => {
              const Icon = step.icon
              const done = i < stepIdx
              const current = i === stepIdx
              const pending = i > stepIdx
              return (
                <li key={step.key} className="flex items-center gap-3 relative">
                  {/* Connector line */}
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`absolute left-[18px] top-9 w-0.5 h-7 ${done ? 'bg-black' : 'bg-black/10'}`} />
                  )}
                  <div
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      done || current ? 'bg-black text-white' : 'bg-[#F4F4F4] text-black/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2.4} />
                    {current && (
                      <span className="absolute inset-0 rounded-full ring-2 ring-black/30" style={{ animation: 'pulse 1.5s ease infinite' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${pending ? 'text-black/35' : 'text-black'}`}>
                      {step.label}
                    </p>
                    {current && (
                      <p className="text-[11px] text-black/55 font-medium">In progress…</p>
                    )}
                    {done && (
                      <p className="text-[11px] text-black/45 font-medium inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Complete
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Order details */}
        <div className="mt-4 bg-white rounded-3xl border border-black/10 p-5 space-y-4">
          <Row icon={Utensils} label="Order type" value={ORDER_LABEL[order.order_type] || order.order_type} />
          {order.table_number && (
            <Row icon={Receipt} label="Table" value={order.table_number} />
          )}
          {order.pickup_time && (
            <Row
              icon={Clock}
              label="Pickup time"
              value={new Date(order.pickup_time).toLocaleString([], {
                weekday: 'short', hour: 'numeric', minute: '2-digit',
              })}
            />
          )}
          <Row icon={Receipt} label="Payment" value={order.payment_method} capitalize />
          {order.cash_given && (
            <Row
              icon={Banknote}
              label="Cash paying with"
              value={`$${Number(order.cash_given).toFixed(2)}`}
            />
          )}
          {order.change_due > 0 && (
            <Row
              icon={Coins}
              label="Change owed"
              value={`$${Number(order.change_due).toFixed(2)}`}
              highlight
            />
          )}
        </div>

        {/* Items */}
        <div className="mt-4 bg-[#F4F4F4] rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-black/55">
            Order summary
          </h3>
          <ul className="space-y-1.5 text-sm">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-black/75 truncate">
                  {it.quantity}× {it.name}{' '}
                  <span className="text-black/45 capitalize">· {it.size}</span>
                </span>
                <span className="font-bold text-black tabular-nums shrink-0">
                  ${Number(it.line_total).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-black/10 pt-2 flex justify-between text-base">
            <span className="font-extrabold text-black">Total</span>
            <span className="font-extrabold text-black tabular-nums">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Link
            to="/app"
            className="w-full h-14 rounded-full bg-black text-white font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <HomeIcon className="w-4 h-4" /> Back to Home
          </Link>
          <Link
            to="/app/orders"
            className="w-full h-14 rounded-full bg-white border-2 border-black/15 text-black font-bold flex items-center justify-center gap-2 hover:border-black transition-colors"
          >
            View all orders
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.18); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function Row({ icon: Icon, label, value, capitalize, highlight }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        highlight ? 'bg-black text-white' : 'bg-[#F4F4F4] text-black'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-black/45 font-extrabold">{label}</p>
        <p className={`text-sm font-bold text-black truncate ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
