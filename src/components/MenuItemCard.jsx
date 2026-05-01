import { Plus, Minus } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function MenuItemCard({ item }) {
  const { cart, dispatch } = useCart()
  const cartItem = cart.items.find(i => i.id === item.id)
  const quantity = cartItem?.quantity || 0

  if (!item.is_available) {
    return (
      <div className="flex gap-4 p-4 bg-white rounded-2xl border border-canvas-200 opacity-50">
        <div className="flex-1">
          <h3 className="font-semibold text-ink-900">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-ink-500 mt-1 line-clamp-2">{item.description}</p>
          )}
          <p className="text-sm font-semibold text-ink-400 mt-2">Unavailable</p>
        </div>
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-4 p-4 bg-white rounded-2xl border border-canvas-200 hover:border-orange-200 hover:shadow-soft transition-all">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-ink-900">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-ink-500 mt-1 line-clamp-2">{item.description}</p>
        )}
        <p className="text-base font-bold text-ink-900 mt-2 tabular-nums">${item.price.toFixed(2)}</p>
      </div>
      <div className="flex flex-col items-end justify-between">
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
        )}
        <div className="flex items-center gap-2 mt-2">
          {quantity > 0 ? (
            <>
              <button
                onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: quantity - 1 })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-semibold text-ink-900 tabular-nums">{quantity}</span>
              <button
                onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: quantity + 1 })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-pop"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => dispatch({ type: 'ADD_ITEM', item: { id: item.id, name: item.name, price: item.price } })}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-pop"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
