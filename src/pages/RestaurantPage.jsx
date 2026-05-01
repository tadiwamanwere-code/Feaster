import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, MapPin, ShoppingBag, ChevronLeft, Search, Bell, ChevronRight, Star } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../lib/services'
import { useCart } from '../context/CartContext'

function CategoryPill({ label, active, onClick, count }) {
  const initial = label?.[0]?.toUpperCase() || '•'
  return (
    <button
      onClick={onClick}
      className={`group relative shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-2xl transition-all ${
        active
          ? 'bg-orange-50/60'
          : 'hover:bg-canvas-50'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
          active
            ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-pop'
            : 'bg-canvas-100 text-ink-500'
        }`}
      >
        {initial}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-orange-700' : 'text-ink-700'}`}>
        {label}
      </span>
      {active && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-orange-500" />
      )}
      {count != null && !active && (
        <span className="text-xs text-ink-400">{count}</span>
      )}
    </button>
  )
}

function FeaturedCard({ item }) {
  const { cart, dispatch } = useCart()
  const cartItem = cart.items.find(i => i.id === item.id)
  const inCart = !!cartItem

  if (!item.is_available) {
    return (
      <div className="relative bg-white rounded-3xl border border-canvas-200 p-5 pt-16 opacity-60">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-canvas-100 flex items-center justify-center overflow-hidden ring-4 ring-white">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-ink-400">{item.name?.[0]}</span>
          )}
        </div>
        <h3 className="text-base font-semibold text-ink-900 text-center">{item.name}</h3>
        <p className="text-xs text-ink-400 mt-1 text-center">Unavailable</p>
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-3xl border border-canvas-200 hover:border-orange-200 hover:shadow-soft transition-all p-5 pt-16">
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-orange-50 to-canvas-100 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-soft">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-orange-500">{item.name?.[0]}</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-ink-900 text-center leading-tight">{item.name}</h3>
      {item.description && (
        <p className="text-xs text-ink-500 mt-1.5 text-center line-clamp-2 min-h-[32px]">{item.description}</p>
      )}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-canvas-100">
        <span className="text-base font-bold text-ink-900 tabular-nums">${item.price.toFixed(2)}</span>
        <button
          onClick={() =>
            inCart
              ? null
              : dispatch({ type: 'ADD_ITEM', item: { id: item.id, name: item.name, price: item.price } })
          }
          className={`text-xs font-semibold transition-colors ${
            inCart ? 'text-emerald-600' : 'text-orange-600 hover:text-orange-700'
          }`}
        >
          {inCart ? '✓ Added to cart' : 'Add to cart'}
        </button>
      </div>
    </div>
  )
}

function ListItem({ item, isNew }) {
  const { cart, dispatch } = useCart()
  const cartItem = cart.items.find(i => i.id === item.id)
  const inCart = !!cartItem

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-canvas-100 last:border-b-0">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-50 to-canvas-100 flex items-center justify-center overflow-hidden shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-base font-bold text-orange-500">{item.name?.[0]}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className="text-sm font-medium text-ink-900 truncate">{item.name}</p>
        {isNew && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
            New
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-ink-900 tabular-nums w-16 text-right">
        ${item.price.toFixed(2)}
      </span>
      <button
        disabled={!item.is_available}
        onClick={() => dispatch({ type: 'ADD_ITEM', item: { id: item.id, name: item.name, price: item.price } })}
        className={`text-xs font-semibold w-20 text-right transition-colors ${
          !item.is_available
            ? 'text-ink-300 cursor-not-allowed'
            : inCart
              ? 'text-emerald-600'
              : 'text-orange-600 hover:text-orange-700'
        }`}
      >
        {!item.is_available ? 'N/A' : inCart ? '✓ Added' : 'Add to cart'}
      </button>
    </div>
  )
}

export default function RestaurantPage() {
  const { slug, tableNumber } = useParams()
  const { cart, dispatch, itemCount, total } = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          setRestaurant(rest)
          dispatch({ type: 'SET_RESTAURANT', restaurantId: rest.id, slug: rest.slug })
          const items = await getMenuItems(rest.id)
          setMenuItems(items)
        }
      } catch (err) {
        console.error('Failed to load restaurant:', err)
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

  const categories = useMemo(() => [...new Set(menuItems.map(i => i.category))], [menuItems])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0])
    }
  }, [categories, activeCategory])

  const visibleItems = useMemo(() => {
    let items = activeCategory ? menuItems.filter(i => i.category === activeCategory) : menuItems
    if (search.trim()) {
      const s = search.toLowerCase()
      items = items.filter(i => i.name.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s))
    }
    return items
  }, [menuItems, activeCategory, search])

  const featured = visibleItems.slice(0, 3)
  const rest = visibleItems.slice(3)

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="h-10 bg-canvas-100 rounded-2xl w-1/2" />
        <div className="h-12 bg-canvas-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-canvas-100 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen lg:min-h-[calc(100vh-3rem)]">
      {/* Center column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top breadcrumb + search */}
        <div className="px-5 lg:px-8 pt-5 lg:pt-7 pb-4 flex items-center gap-3 lg:gap-5">
          <Link
            to="/explore"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-canvas-200 text-ink-500 hover:text-ink-900 hover:bg-canvas-50 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <nav className="hidden sm:flex items-center gap-2 text-sm shrink-0">
            <Link to="/explore" className="text-ink-400 hover:text-ink-700">Restaurants</Link>
            <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
            <span className="text-ink-900 font-semibold truncate max-w-[180px]">{restaurant?.name}</span>
          </nav>
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search here"
              className="w-full pl-10 pr-4 py-2.5 bg-canvas-50 border border-canvas-200 rounded-2xl text-sm placeholder:text-ink-400 focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>
          <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-ink-500 hover:bg-canvas-50 relative shrink-0">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full" />
          </button>
        </div>

        {/* Table indicator */}
        {tableNumber && (
          <div className="mx-5 lg:mx-8 mb-4 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <p className="text-sm text-emerald-700 font-medium">
              Dine-in — Table {tableNumber}
            </p>
          </div>
        )}

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="px-5 lg:px-8 border-b border-canvas-200">
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-3">
              {categories.map(cat => (
                <CategoryPill
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  count={menuItems.filter(i => i.category === cat).length}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 lg:overflow-y-auto thin-scrollbar px-5 lg:px-8 py-6 pb-32 lg:pb-8">
          {visibleItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-ink-500 font-medium">No items found</p>
              {search && (
                <button onClick={() => setSearch('')} className="text-sm text-orange-600 mt-2 font-medium">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-ink-900">
                      Popular {activeCategory}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-12 mt-12">
                    {featured.map(item => (
                      <FeaturedCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}

              {/* Rest as list */}
              {rest.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-ink-900">
                      Regular {activeCategory}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-ink-500">
                      Sort by: <span className="font-semibold text-ink-900">Price</span>
                      <ChevronRight className="w-3 h-3 rotate-90" />
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-canvas-200 px-5 py-1 mt-4">
                    <div className="flex items-center gap-4 py-3 border-b border-canvas-100 text-xs uppercase tracking-wider text-ink-400 font-semibold">
                      <div className="w-11" />
                      <div className="flex-1">Name</div>
                      <div className="w-16 text-right">Price</div>
                      <div className="w-20 text-right" />
                    </div>
                    {rest.map(item => (
                      <ListItem key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right rail — restaurant info + cart preview (desktop only) */}
      <aside className="hidden xl:flex w-80 shrink-0 flex-col border-l border-canvas-200 bg-canvas-50/40">
        <div className="p-6 overflow-y-auto thin-scrollbar flex-1">
          {/* Restaurant card */}
          <div className="flex items-start gap-3 mb-6">
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-pop">
                {restaurant?.name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-ink-900 truncate">{restaurant?.name}</h3>
              <p className="text-xs text-ink-500 mt-0.5">{restaurant?.cuisine_type}</p>
              {restaurant?.rating && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-ink-900">{restaurant.rating}</span>
                  <span className="text-xs text-ink-400">overall rating</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5 pb-6 border-b border-canvas-200">
            {restaurant?.city && (
              <div className="flex items-center gap-2.5 text-xs text-ink-500">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {restaurant.address ? `${restaurant.address}, ${restaurant.city}` : restaurant.city}
              </div>
            )}
            {restaurant?.opening_hours && (
              <div className="flex items-center gap-2.5 text-xs text-ink-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Open now
              </div>
            )}
          </div>

          {/* Cart preview */}
          <div className="pt-6">
            <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">
              Your order
            </h4>
            {cart.items.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-white border border-dashed border-canvas-200">
                <ShoppingBag className="w-8 h-8 text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500 font-medium">Cart is empty</p>
                <p className="text-xs text-ink-400 mt-1">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{item.name}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {item.quantity} × ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-ink-900 tabular-nums">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky checkout CTA */}
        {itemCount > 0 && (
          <div className="p-5 border-t border-canvas-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-ink-500">Total</span>
              <span className="text-xl font-bold text-ink-900 tabular-nums">${total.toFixed(2)}</span>
            </div>
            <Link
              to={`/${slug}/checkout`}
              className="block w-full text-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3.5 rounded-2xl font-semibold text-sm shadow-pop transition-all"
            >
              Checkout · {itemCount} item{itemCount > 1 ? 's' : ''}
            </Link>
          </div>
        )}
      </aside>

      {/* Mobile/tablet cart bar */}
      {itemCount > 0 && (
        <div className="xl:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-canvas-200 z-40">
          <Link
            to={`/${slug}/checkout`}
            className="flex items-center justify-between w-full max-w-md mx-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-3.5 rounded-2xl shadow-pop hover:from-orange-600 hover:to-orange-700 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
            </div>
            <span className="font-bold text-sm tabular-nums">${total.toFixed(2)}</span>
          </Link>
        </div>
      )}

    </div>
  )
}
