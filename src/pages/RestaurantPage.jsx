import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, MapPin, ShoppingBag, ArrowLeft } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../lib/services'
import { useCart } from '../context/CartContext'
import MenuItemCard from '../components/MenuItemCard'

// Demo menu used when Firebase is not configured
const DEMO_MENU = [
  { id: 'm1', name: 'Classic Burger', description: 'Beef patty, lettuce, tomato, special sauce', price: 8.50, category: 'Mains', is_available: true, sort_order: 0 },
  { id: 'm2', name: 'Chicken Wings (6pc)', description: 'Crispy fried wings with peri-peri sauce', price: 6.00, category: 'Starters', is_available: true, sort_order: 1 },
  { id: 'm3', name: 'Fish & Chips', description: 'Beer battered hake with hand-cut chips', price: 12.00, category: 'Mains', is_available: true, sort_order: 2 },
  { id: 'm4', name: 'Caesar Salad', description: 'Romaine lettuce, croutons, parmesan, caesar dressing', price: 7.50, category: 'Starters', is_available: true, sort_order: 3 },
  { id: 'm5', name: 'Grilled T-Bone Steak', description: '400g T-bone with mushroom sauce and sides', price: 18.00, category: 'Mains', is_available: true, sort_order: 4 },
  { id: 'm6', name: 'Mozambican Prawns', description: 'Grilled prawns in garlic butter and peri-peri', price: 22.00, category: 'Mains', is_available: true, sort_order: 5 },
  { id: 'm7', name: 'Coca-Cola', description: '330ml can', price: 2.00, category: 'Drinks', is_available: true, sort_order: 6 },
  { id: 'm8', name: 'Castle Lager', description: '500ml bottle', price: 3.50, category: 'Drinks', is_available: true, sort_order: 7 },
  { id: 'm9', name: 'Fresh Juice', description: 'Orange, mango or pineapple', price: 3.00, category: 'Drinks', is_available: true, sort_order: 8 },
  { id: 'm10', name: 'Chocolate Brownie', description: 'Warm brownie with vanilla ice cream', price: 5.50, category: 'Desserts', is_available: true, sort_order: 9 },
]

export default function RestaurantPage() {
  const { slug, tableNumber } = useParams()
  const { cart, dispatch, itemCount, total } = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          setRestaurant(rest)
          dispatch({ type: 'SET_RESTAURANT', restaurantId: rest.id, slug: rest.slug })
          const items = await getMenuItems(rest.id)
          setMenuItems(items.length > 0 ? items : DEMO_MENU)
        } else {
          // Use demo data
          setRestaurant({
            id: 'demo',
            slug,
            name: slug.charAt(0).toUpperCase() + slug.slice(1),
            cuisine_type: 'Restaurant',
            city: 'Harare',
          })
          dispatch({ type: 'SET_RESTAURANT', restaurantId: 'demo', slug })
          setMenuItems(DEMO_MENU)
        }
      } catch {
        setRestaurant({
          id: 'demo',
          slug,
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          cuisine_type: 'Restaurant',
          city: 'Harare',
        })
        dispatch({ type: 'SET_RESTAURANT', restaurantId: 'demo', slug })
        setMenuItems(DEMO_MENU)
      }
      setLoading(false)
    }
    load()
  }, [slug, dispatch])

  useEffect(() => {
    if (tableNumber) {
      dispatch({ type: 'SET_TABLE', tableNumber })
      dispatch({ type: 'SET_ORDER_TYPE', orderType: 'dine_in' })
    }
  }, [tableNumber, dispatch])

  const categories = [...new Set(menuItems.map(i => i.category))]

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0])
    }
  }, [categories, activeCategory])

  if (loading) {
    return (
      <div className="px-4 py-8 space-y-4 animate-pulse">
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="space-y-3 mt-8">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* Restaurant Header */}
      <div className="relative">
        <div className="h-44 bg-gradient-to-br from-orange-500 to-orange-700">
          {restaurant?.cover_photo_url && (
            <img src={restaurant.cover_photo_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <Link
          to="/"
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
      </div>

      <div className="px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-orange-600">{restaurant?.name?.[0]}</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{restaurant?.name}</h1>
              <p className="text-sm text-gray-500">{restaurant?.cuisine_type}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {restaurant?.city}
                </span>
                {restaurant?.opening_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Open
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Order type indicator */}
          {tableNumber && (
            <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                Dine-in — Table {tableNumber}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-14 z-40 bg-gray-50 pt-4 pb-2 px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-2 space-y-6">
        {categories.map(cat => (
          <div key={cat} id={`cat-${cat}`} className={activeCategory && activeCategory !== cat ? 'hidden' : ''}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{cat}</h2>
            <div className="space-y-2">
              {menuItems
                .filter(i => i.category === cat)
                .map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-50">
          <Link
            to={`/${slug}/checkout`}
            className="flex items-center justify-between w-full bg-orange-600 text-white px-6 py-4 rounded-2xl hover:bg-orange-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-semibold">
                {itemCount} item{itemCount > 1 ? 's' : ''}
              </span>
            </div>
            <span className="font-bold">${total.toFixed(2)}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
