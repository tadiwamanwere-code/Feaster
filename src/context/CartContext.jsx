import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext()

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.item.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: 1, notes: '' }] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.id !== action.id) }
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      }
    case 'UPDATE_NOTES':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, notes: action.notes } : i
        ),
      }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.orderType }
    case 'SET_TABLE':
      return { ...state, tableNumber: action.tableNumber }
    case 'SET_RESTAURANT':
      return { ...state, restaurantId: action.restaurantId, restaurantSlug: action.slug }
    default:
      return state
  }
}

const initialState = {
  items: [],
  orderType: 'dine_in',
  tableNumber: null,
  restaurantId: null,
  restaurantSlug: null,
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState)

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, dispatch, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
