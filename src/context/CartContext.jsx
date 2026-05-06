import { createContext, useContext, useEffect, useReducer, useMemo } from 'react'

const CartContext = createContext()
const STORAGE_KEY = 'feaster:cart'

function cartReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.state }

    case 'ADD_ITEM': {
      const incoming = action.item
      const matchKey = (i) =>
        (i.id || i.item_id) === (incoming.id || incoming.item_id) &&
        (i.size || 'regular') === (incoming.size || 'regular') &&
        (i.notes || '') === (incoming.notes || '')

      const existing = state.items.find(matchKey)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i => matchKey(i)
            ? { ...i, quantity: i.quantity + (incoming.quantity || 1) }
            : i
          ),
        }
      }
      const itemId = incoming.id || incoming.item_id
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: itemId,
            item_id: itemId,
            name: incoming.name,
            price: incoming.price,         // effective unit price (after size mult)
            base_price: incoming.base_price ?? incoming.price,
            size: incoming.size || 'regular',
            quantity: incoming.quantity || 1,
            notes: incoming.notes || '',
            image_url: incoming.image_url || null,
          },
        ],
      }
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((_, i) => i !== action.index) }

    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((_, i) => i !== action.index) }
      }
      return {
        ...state,
        items: state.items.map((i, idx) => idx === action.index ? { ...i, quantity: action.quantity } : i),
      }

    case 'UPDATE_NOTES':
      return {
        ...state,
        items: state.items.map((i, idx) => idx === action.index ? { ...i, notes: action.notes } : i),
      }

    case 'CLEAR_CART':
      return { ...state, items: [] }

    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.orderType }

    case 'SET_TABLE':
      return { ...state, tableNumber: action.tableNumber }

    case 'SET_PICKUP_TIME':
      return { ...state, pickupTime: action.pickupTime }

    case 'SET_RESTAURANT': {
      const sameSlug = state.restaurantSlug === action.slug
      return {
        ...state,
        items: sameSlug ? state.items : [],
        restaurantId: action.restaurantId,
        restaurantSlug: action.slug,
      }
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

const initialState = {
  items: [],
  orderType: null,           // 'in_house' | 'takeaway' | 'pre_order'
  tableNumber: null,         // for in_house / takeaway
  pickupTime: null,          // ISO string for pre_order
  restaurantId: null,
  restaurantSlug: null,
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw)
    return { ...initialState, ...parsed }
  } catch {
    return initialState
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState, loadInitial)

  // Persist to localStorage on any change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)) } catch {}
  }, [cart])

  const total = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  const helpers = useMemo(() => ({
    items: cart.items,
    orderType: cart.orderType,
    tableNumber: cart.tableNumber,
    pickupTime: cart.pickupTime,
    restaurantSlug: cart.restaurantSlug,
    restaurantId: cart.restaurantId,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    removeItem: (index) => dispatch({ type: 'REMOVE_ITEM', index }),
    updateQuantity: (index, quantity) => dispatch({ type: 'UPDATE_QUANTITY', index, quantity }),
    updateNotes: (index, notes) => dispatch({ type: 'UPDATE_NOTES', index, notes }),
    increment: (index) => {
      const it = cart.items[index]
      if (it) dispatch({ type: 'UPDATE_QUANTITY', index, quantity: it.quantity + 1 })
    },
    decrement: (index) => {
      const it = cart.items[index]
      if (it) dispatch({ type: 'UPDATE_QUANTITY', index, quantity: Math.max(0, it.quantity - 1) })
    },
    clear: () => dispatch({ type: 'CLEAR_CART' }),
    reset: () => dispatch({ type: 'RESET' }),
    setOrderType: (orderType) => dispatch({ type: 'SET_ORDER_TYPE', orderType }),
    setTable: (tableNumber) => dispatch({ type: 'SET_TABLE', tableNumber }),
    setPickupTime: (pickupTime) => dispatch({ type: 'SET_PICKUP_TIME', pickupTime }),
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
