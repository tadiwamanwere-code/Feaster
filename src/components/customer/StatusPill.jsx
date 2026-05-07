import { getOrderStatus } from '../../lib/orders'

/**
 * Small status pill showing the order's current step.
 * 'Ready' shows green with a pulsing dot.
 *
 *   <StatusPill order={order} now={Date.now()} />
 */
export default function StatusPill({ order, now = Date.now() }) {
  const { step } = getOrderStatus(order, now)
  const isReady = step.key === 'ready'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
        isReady ? 'bg-green-600 text-white' : 'bg-black text-white'
      }`}
    >
      {isReady && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
      {step.label}
    </span>
  )
}
