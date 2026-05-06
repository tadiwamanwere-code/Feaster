import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check, Utensils, Clock, Receipt, Home } from 'lucide-react'

const ORDER_LABEL = {
  in_house: 'Dine In',
  takeaway: 'Take Away',
  pre_order: 'Pre-Order',
}

export default function CustomerOrderSuccess() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)

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

  if (!order) return null

  return (
    <div className="min-h-[100dvh] bg-white pb-12">
      {/* Hero */}
      <div className="bg-black text-white px-6 pt-14 pb-12 text-center rounded-b-[40px]">
        <div className="w-20 h-20 mx-auto rounded-full bg-white text-black flex items-center justify-center animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">
          <Check className="w-10 h-10" strokeWidth={3} />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight">Order placed!</h1>
        <p className="mt-2 text-sm text-white/70">
          We've sent your order to <span className="font-bold text-white">{order.restaurant.name}</span>.
        </p>
        <div className="mt-5 inline-block bg-white/10 backdrop-blur rounded-full px-4 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
            Order ID
          </p>
          <p className="text-xl font-black tracking-wider mt-0.5">#{order.id}</p>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 -mt-4">
        <div className="bg-white rounded-3xl border border-black/10 p-5 space-y-4">
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
            <Home className="w-4 h-4" /> Back to Home
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
        @keyframes popIn {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Row({ icon: Icon, label, value, capitalize }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#F4F4F4] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-black/45 font-extrabold">{label}</p>
        <p className={`text-sm font-bold text-black truncate ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
