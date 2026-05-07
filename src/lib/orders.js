// Single source of truth for order-related constants + helpers.
// All customer screens import from here — do not duplicate this logic.

import { Utensils, ShoppingBag, Clock, Bell, ChefHat, CheckCircle2 } from 'lucide-react'

const STORAGE_KEY = 'feaster:orders'
const MAX_HISTORY = 50

// ─── Order types ────────────────────────────────────────────────

export const ORDER_TYPES = [
  {
    key: 'in_house',
    label: 'Dine In',
    icon: Utensils,
    sub: 'Eat at the restaurant — scan your table QR to order',
    needsScan: true,
  },
  {
    key: 'takeaway',
    label: 'Take Away',
    icon: ShoppingBag,
    sub: 'Order at the restaurant, take it with you',
    needsScan: true,
  },
  {
    key: 'pre_order',
    label: 'Pre-Order',
    icon: Clock,
    sub: 'Order ahead and pick it up at a chosen time',
    needsScan: false,
  },
]

// Map: 'in_house' → 'Dine In', etc.
export const ORDER_LABEL = ORDER_TYPES.reduce((m, t) => ({ ...m, [t.key]: t.label }), {})

// Map: 'in_house' → Utensils icon, etc.
export const ORDER_ICON = ORDER_TYPES.reduce((m, t) => ({ ...m, [t.key]: t.icon }), {})

// ─── Status timeline ────────────────────────────────────────────

// `at` is seconds after order creation when this step auto-advances.
export const STATUS_STEPS = [
  { key: 'placed',     label: 'Placed',                   icon: ShoppingBag,  at: 0 },
  { key: 'confirmed',  label: 'Confirmed',                icon: Bell,         at: 45 },
  { key: 'preparing',  label: 'Preparing',                icon: ChefHat,      at: 120 },
  { key: 'ready',      label: 'Ready',                    icon: CheckCircle2, at: 480 },
]

// Long labels for the timeline view.
export const STATUS_LONG_LABEL = {
  placed:     'Order placed',
  confirmed:  'Restaurant confirmed',
  preparing:  'Preparing your food',
  ready:      'Ready for you',
}

/**
 * Returns the current status step (0..3) and the step object for this order at time `now`.
 * Pre-orders are gated on pickup time. Dine-in / takeaway advance on elapsed seconds.
 */
export function getOrderStatus(order, now = Date.now()) {
  if (!order) return { index: 0, step: STATUS_STEPS[0] }
  const elapsedSec = (now - new Date(order.created_at).getTime()) / 1000

  let idx = 0
  for (let i = 0; i < STATUS_STEPS.length; i++) {
    if (elapsedSec >= STATUS_STEPS[i].at) idx = i
  }

  // For pre-order, gate progression on pickup time
  if (order.order_type === 'pre_order' && order.pickup_time) {
    const minutesToPickup = (new Date(order.pickup_time).getTime() - now) / 60000
    if (minutesToPickup > 30)      idx = 0
    else if (minutesToPickup > 15) idx = Math.min(idx, 1)
    else if (minutesToPickup > 0)  idx = Math.min(idx, 2)
    else                           idx = 3
  }

  return { index: idx, step: STATUS_STEPS[idx] }
}

// ─── Time helpers ───────────────────────────────────────────────

/** Returns ISO datetime-local format (YYYY-MM-DDTHH:mm) for `now + mins` minutes. */
export function nowPlusMinutesIso(mins) {
  const d = new Date(Date.now() + mins * 60_000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/** Generates a short, readable order ID like 'F7A3B2'. */
export function generateOrderId() {
  return 'F' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

// ─── localStorage persistence ───────────────────────────────────

export function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function getOrder(id) {
  return loadOrders().find(o => o.id === id) || null
}

export function saveOrder(order) {
  const orders = loadOrders()
  orders.unshift(order)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_HISTORY)))
  } catch {}
  return order
}

export function clearOrders() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}
