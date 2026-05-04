import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export default function CustomerCart() {
  const navigate = useNavigate()
  const cart = useCart()
  const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  if (!cart.items.length) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mt-1">Browse restaurants and add items</p>
          <button
            onClick={() => navigate('/app')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black"
          >Browse</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Your cart</h1>
      <ul className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
        {cart.items.map(item => {
          const id = item.id || item.item_id
          return (
            <li key={id} className="p-3 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500">${Number(item.price).toFixed(2)} each</p>
                <input
                  type="text"
                  value={item.notes || ''}
                  onChange={(e) => cart.updateNotes(id, e.target.value)}
                  placeholder="Notes (e.g. no onions)"
                  className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-semibold text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cart.decrement(id)}
                    className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"
                  ><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-sm w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => cart.increment(id)}
                    className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center"
                  ><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <button
                  onClick={() => cart.removeItem(id)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                ><Trash2 className="w-3 h-3" /> remove</button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">Subtotal</span>
        <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
      </div>

      <button
        onClick={() => navigate('/app/checkout')}
        className="w-full bg-black text-white py-3 rounded-xl text-sm font-semibold hover:bg-black"
      >Checkout</button>
    </div>
  )
}
