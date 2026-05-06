import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Utensils } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const ORDER_LABEL = {
  in_house: 'Dine In',
  takeaway: 'Take Away',
  pre_order: 'Pre-Order',
}

export default function CustomerCart() {
  const navigate = useNavigate()
  const cart = useCart()
  const subtotal = cart.total

  if (!cart.items.length) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#F4F4F4] flex items-center justify-center mb-4">
          <ShoppingBag className="w-9 h-9 text-black/30" />
        </div>
        <h2 className="text-xl font-extrabold text-black">Your cart is empty</h2>
        <p className="text-sm text-black/55 mt-1 max-w-xs">
          Pick some food and it'll show up here.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="mt-8 w-full max-w-xs h-12 rounded-full bg-black text-white font-bold text-sm active:scale-[0.97] transition-transform"
        >
          Browse restaurants
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      {/* Top bar */}
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <h1 className="text-2xl font-black text-black tracking-tight">Your cart</h1>
      </header>

      {/* Order context */}
      {(cart.orderType || cart.tableNumber) && (
        <div className="mx-5 mb-3 bg-black text-white rounded-2xl px-4 py-3 flex items-center gap-3">
          <Utensils className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/60">
              {ORDER_LABEL[cart.orderType] || 'Order'}
            </p>
            <p className="text-sm font-bold truncate">
              {cart.tableNumber
                ? `Table ${cart.tableNumber}`
                : cart.pickupTime
                  ? `Pickup ${new Date(cart.pickupTime).toLocaleString()}`
                  : 'Set details at checkout'}
            </p>
          </div>
          <Link
            to="/app/order-type"
            className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-white/70 hover:text-white"
          >
            Change
          </Link>
        </div>
      )}

      {/* Restaurant link */}
      {cart.restaurantSlug && (
        <Link
          to={`/app/r/${cart.restaurantSlug}`}
          className="mx-5 mb-3 inline-flex items-center text-xs font-bold text-black/55 hover:text-black"
        >
          + Add more from this restaurant
        </Link>
      )}

      {/* Items */}
      <ul className="px-5 space-y-3">
        {cart.items.map((item, idx) => (
          <li key={idx} className="flex gap-3 bg-white rounded-2xl border border-black/10 p-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F4F4F4] shrink-0">
              {item.image_url ? (
                <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold text-black truncate">{item.name}</h3>
                <button
                  onClick={() => cart.removeItem(idx)}
                  aria-label="Remove"
                  className="shrink-0 w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-black/40 hover:text-black"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-black/55 font-semibold capitalize mt-0.5">
                {item.size || 'regular'}
                {item.notes && <span className="block truncate text-black/45 italic">"{item.notes}"</span>}
              </p>

              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-extrabold text-black">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cart.decrement(idx)}
                    aria-label="Decrease"
                    className="w-8 h-8 rounded-full bg-[#F4F4F4] flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus className="w-3.5 h-3.5 text-black" />
                  </button>
                  <span className="text-sm font-extrabold w-5 text-center text-black tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => cart.increment(idx)}
                    aria-label="Increase"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Subtotal box */}
      <div className="mx-5 mt-5 bg-[#F4F4F4] rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-black/65 font-medium">Subtotal</span>
          <span className="font-extrabold text-black">${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-black/45 font-medium">
          Final total calculated at checkout (taxes / service fees apply if any).
        </p>
      </div>

      {/* Checkout bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/5 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          onClick={() => navigate('/app/checkout')}
          className="max-w-md mx-auto w-full h-14 rounded-full bg-black text-white font-extrabold flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
        >
          <span>Checkout</span>
          <span>${subtotal.toFixed(2)}</span>
        </button>
      </div>
    </div>
  )
}
