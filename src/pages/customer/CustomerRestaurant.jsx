import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ShoppingBag, ChevronRight } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../../lib/services'
import { useCart } from '../../context/CartContext'

export default function CustomerRestaurant() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const cart = useCart()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await getRestaurantBySlug(slug)
        if (cancelled) return
        if (!r) return navigate('/app', { replace: true })
        setRestaurant(r)
        const items = await getMenuItems(r.id)
        if (!cancelled) setMenu(items.filter(i => i.is_available))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, navigate])

  // Switch cart to this restaurant if different
  useEffect(() => {
    if (restaurant && cart.restaurantSlug !== restaurant.slug) {
      cart.setRestaurant?.(restaurant.slug)
    }
  }, [restaurant]) // eslint-disable-line

  const sections = useMemo(() => {
    const grouped = {}
    for (const item of menu) {
      const cat = item.category || 'Menu'
      grouped[cat] = grouped[cat] || []
      grouped[cat].push(item)
    }
    return Object.entries(grouped)
  }, [menu])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  const cartItemCount = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <div>
      {restaurant.cover_photo_url && (
        <div className="h-44 bg-gray-100 relative">
          <img
            src={restaurant.cover_photo_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => navigate('/app')}
            className="absolute top-3 left-3 w-9 h-9 bg-black/40 rounded-full text-white flex items-center justify-center backdrop-blur"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-4 bg-white border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
        <p className="text-sm text-gray-500">{restaurant.cuisine_type}</p>
        {restaurant.description && (
          <p className="text-sm text-gray-600 mt-2">{restaurant.description}</p>
        )}
      </div>

      <div className="p-4 space-y-6">
        {sections.map(([cat, items]) => (
          <section key={cat}>
            <h2 className="font-semibold text-gray-900 mb-2">{cat}</h2>
            <ul className="space-y-2">
              {items.map(item => {
                const inCart = cart.items?.find(c => c.item_id === item.id)
                return (
                  <li key={item.id} className="bg-white rounded-2xl border border-ink-200/30 p-3 flex gap-3 shadow-soft">
                    <Link
                      to={`/app/r/${restaurant.slug}/item/${item.id}`}
                      className="contents"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-20 h-20 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-cream-100 flex items-center justify-center text-3xl shrink-0">🍽️</div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/app/r/${restaurant.slug}/item/${item.id}`} className="block">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-ink-900 truncate">{item.name}</h3>
                          <ChevronRight className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                        </div>
                        {item.description && (
                          <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                      </Link>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-orange-600">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => cart.decrement(item.id)}
                              aria-label="Decrease"
                              className="w-9 h-9 bg-cream-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                            ><Minus className="w-4 h-4" /></button>
                            <span className="text-sm font-bold w-5 text-center">{inCart.quantity}</span>
                            <button
                              onClick={() => cart.increment(item.id)}
                              aria-label="Increase"
                              className="w-9 h-9 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-pop active:scale-90 transition-transform"
                            ><Plus className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              cart.addItem({
                                item_id: item.id,
                                name: item.name,
                                price: Number(item.price),
                                quantity: 1,
                                notes: '',
                              })
                            }
                            className="px-4 py-2 bg-orange-600 text-white rounded-full text-xs font-bold shadow-pop active:scale-95 transition-transform"
                          >Add +</button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {cartItemCount > 0 && (
        <div className="fixed bottom-16 inset-x-0 px-4 z-20">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/app/cart')}
              className="w-full bg-orange-600 text-white rounded-full py-3 px-4 flex items-center justify-between text-sm font-semibold shadow-lg"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {cartItemCount} item{cartItemCount > 1 ? 's' : ''} in cart
              </span>
              <span>View cart →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
