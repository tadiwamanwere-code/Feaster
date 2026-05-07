import { Link } from 'react-router-dom'
import { Utensils } from 'lucide-react'
import { ORDER_LABEL, ORDER_ICON } from '../../lib/orders'

/**
 * Black banner showing the active order's type + table/pickup context.
 * Renders nothing if no orderType + no tableNumber + no pickupTime.
 *
 *   <OrderContextBanner cart={cart} pickupTime={pickupTime} changeTo="/app/order-type" />
 */
export default function OrderContextBanner({
  orderType,
  tableNumber,
  pickupTime,
  showChange = true,
  className = '',
}) {
  if (!orderType && !tableNumber && !pickupTime) return null

  const Icon = (orderType && ORDER_ICON[orderType]) || Utensils
  const typeLabel = ORDER_LABEL[orderType] || 'Order'

  let detail
  if (tableNumber) {
    detail = `Table ${tableNumber}`
  } else if (pickupTime) {
    const d = new Date(pickupTime)
    const opts = { weekday: 'short', hour: 'numeric', minute: '2-digit' }
    detail = `Pickup ${d.toLocaleString([], opts)}`
  } else if (orderType === 'pre_order') {
    detail = 'Pickup time set at checkout'
  } else {
    detail = '—'
  }

  return (
    <div className={`bg-black text-white rounded-2xl px-4 py-3 flex items-center gap-3 ${className}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/60">
          {typeLabel}
        </p>
        <p className="text-sm font-bold truncate">{detail}</p>
      </div>
      {showChange && (
        <Link
          to="/app/order-type"
          className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-white/70 hover:text-white"
        >
          Change
        </Link>
      )}
    </div>
  )
}
