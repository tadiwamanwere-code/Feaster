// Persists order IDs in localStorage so customers can track orders
// across sessions without needing to register or log in.

const STORAGE_KEY = 'feaster_orders'

export function getSavedOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveOrder(orderId, meta = {}) {
  const orders = getSavedOrders()
  // Don't duplicate
  if (orders.some(o => o.id === orderId)) return
  orders.unshift({ id: orderId, savedAt: Date.now(), ...meta })
  // Keep last 50 orders
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, 50)))
}

export function getOrderCount() {
  return getSavedOrders().length
}
