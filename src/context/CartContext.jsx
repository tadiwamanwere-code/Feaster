import { createContext, useContext, useReducer, useMemo } from 'react'

const CartContext = createContext()

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const itemId = action.item.id || action.item.item_id
      const existing = state.items.find(i => (i.id || i.item_id) === itemId)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            (i.id || i.item_id) === itemId ? { ...i, quantity: i.quantity + (action.item.quantity || 1) } : i
          ),
        }
      }
      return {
        ...state,
        items: [
          ...state.items,
          { id: itemId, item_id: itemId, ...action.item, quantity: action.item.quantity || 1, notes: action.item.notes || '' },
        ],
      }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => (i.id || i.item_id) !== action.id) }
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => (i.id || i.item_id) !== action.id) }
      }
      return {
        ...state,
        items: state.items.map(i =>
          (i.id || i.item_id) === action.id ? { ...i, quantity: action.quantity } : i
        ),
      }
    case 'UPDATE_NOTES':
      return {
        ...state,
        items: state.items.map(i =>
          (i.id || i.item_id) === action.id ? { ...i, notes: action.notes } : i
        ),
      }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.orderType }
    case 'SET_TABLE':
      return { ...state, tableNumber: action.tableNumber }
    case 'SET_RESTAURANT': {
      // Switching restaurants clears existing cart to avoid mixed orders
      const sameSlug = state.restaurantSlug === action.slug
      return {
        ...state,
        items: sameSlug ? state.items : [],
        restaurantId: action.restaurantId,
        restaurantSlug: action.slug,
      }
    }
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

  // Convenience helpers
  const helpers = useMemo(() => ({
    items: cart.items,
    orderType: cart.orderType,
    restaurantSlug: cart.restaurantSlug,
    restaurantId: cart.restaurantId,
    tableNumber: cart.tableNumber,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', id }),
    updateQuantity: (id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', id, quantity }),
    updateNotes: (id, notes) => dispatch({ type: 'UPDATE_NOTES', id, notes }),
    increment: (id) => {
      const it = cart.items.find(i => (i.id || i.item_id) === id)
      dispatch({ type: 'UPDATE_QUANTITY', id, quantity: (it?.quantity || 0) + 1 })
    },
    decrement: (id) => {
      const it = cart.items.find(i => (i.id || i.item_id) === id)
      dispatch({ type: 'UPDATE_QUANTITY', id, quantity: Math.max(0, (it?.quantity || 0) - 1) })
    },
    clear: () => dispatch({ type: 'CLEAR_CART' }),
    setOrderType: (orderType) => dispatch({ type: 'SET_ORDER_TYPE', orderType }),
    setTable: (tableNumber) => dispatch({ type: 'SET_TABLE', tableNumber }),
    setRestaurant: (slug, restaurantId) => dispatch({ type: 'SET_RESTAURANT', slug, restaurantId }),
  }), [cart])

  return (
    <CartContext.Provider value={{ cart, dispatch, total, itemCount, ...helpers }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
