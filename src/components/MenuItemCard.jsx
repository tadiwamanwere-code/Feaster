import { Plus, Minus } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function MenuItemCard({ item }) {
  const { cart, dispatch } = useCart()
  const cartItem = cart.items.find(i => i.id === item.id)
  const quantity = cartItem?.quantity || 0

  if (!item.is_available) {
    return (
      <div className="flex gap-4 p-4 bg-white rounded-xl opacity-50">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
          <p className="text-sm font-semibold text-gray-400 mt-2">Unavailable</p>
        </div>
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-orange-200 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
        )}
        <p className="text-sm font-bold text-orange-600 mt-2">${item.price.toFixed(2)}</p>
      </div>
      <div className="flex flex-col items-end justify-between">
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
        )}
        <div className="flex items-center gap-2 mt-2">
          {quantity > 0 ? (
            <>
              <button
                onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: quantity - 1 })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-semibold text-gray-900">{quantity}</span>
              <button
                onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: quantity + 1 })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => dispatch({ type: 'ADD_ITEM', item: { id: item.id, name: item.name, price: item.price } })}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
