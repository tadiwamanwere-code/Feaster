import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { ORDER_LABEL, ORDER_ICON, loadOrders } from '../../lib/orders'
import StatusPill from '../../components/customer/StatusPill'

export default function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => { setOrders(loadOrders()) }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(t)
  }, [])

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
          {orders.map(o => {
            const Icon = ORDER_ICON[o.order_type] || ClipboardList
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
                        #{o.id} · {ORDER_LABEL[o.order_type] || o.order_type} ·{' '}
                        {new Date(o.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                      <StatusPill order={o} now={now} />
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
