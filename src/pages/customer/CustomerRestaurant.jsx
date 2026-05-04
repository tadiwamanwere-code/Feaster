import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ShoppingBag, ChevronRight, Star, MapPin, Clock, Phone } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../../lib/services'
import { useCart } from '../../context/CartContext'

export default function CustomerRestaurant() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState(null)
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
      cart.setRestaurant?.(restaurant.slug, restaurant.id)
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

  useEffect(() => {
    if (!activeCat && sections[0]) setActiveCat(sections[0][0])
  }, [sections, activeCat])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="w-8 h-8 border-4 border-feaster-yellow border-t-feaster-black rounded-full animate-spin" />
      </div>
    )
  }
  if (!restaurant) return null

  const cartItemCount = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <div className="bg-cream-50 min-h-screen pb-32">
      {/* Hero header card */}
      <div className="relative pt-6 px-5">
        <button
          onClick={() => navigate('/app')}
          aria-label="Back"
          className="absolute top-6 left-5 z-10 w-11 h-11 rounded-full bg-white border-2 border-feaster-black flex items-center justify-center active:scale-95 transition-transform"
          style={{ boxShadow: '3px 3px 0 0 #0A0A0A' }}
        >
          <ArrowLeft className="w-5 h-5 text-feaster-black" />
        </button>

        <div className="bg-feaster-black text-white rounded-[28px] p-6 pt-20 relative overflow-hidden">
          {/* Yellow accent dot */}
          <div className="absolute top-5 right-5 w-3 h-3 rounded-full bg-feaster-yellow" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-feaster-yellow/10" />

          {/* Circular avatar floating */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div
              className="w-24 h-24 rounded-full bg-cream-100 overflow-hidden border-4 border-feaster-yellow"
              style={{ boxShadow: '4px 4px 0 0 #FFD60A' }}
            >
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : restaurant.cover_photo_url ? (
                <img src={restaurant.cover_photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
              )}
            </div>
          </div>

          <div className="text-center relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight">{restaurant.name}</h1>
            <p className="text-sm text-white/70 font-semibold mt-0.5">{restaurant.cuisine_type}</p>

            <div className="flex items-center justify-center gap-2 mt-3">
              {restaurant.rating && (
                <span className="inline-flex items-center gap-1 px-3 h-8 bg-feaster-yellow text-feaster-black rounded-full text-xs font-extrabold">
                  <Star className="w-3.5 h-3.5 fill-feaster-black" />
                  {Number(restaurant.rating).toFixed(1)}
                </span>
              )}
              {restaurant.city && (
                <span className="inline-flex items-center gap-1 px-3 h-8 bg-white/10 rounded-full text-xs font-bold text-white">
                  <MapPin className="w-3.5 h-3.5" /> {restaurant.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-3 h-8 bg-white/10 rounded-full text-xs font-bold text-white">
                <Clock className="w-3.5 h-3.5" /> 25 min
              </span>
            </div>

            {restaurant.description && (
              <p className="text-sm text-white/75 mt-4 leading-relaxed max-w-md mx-auto">
                {restaurant.description}
              </p>
            )}

            {restaurant.whatsapp_number && (
              <a
                href={`https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 h-10 bg-feaster-yellow text-feaster-black rounded-full text-xs font-extrabold active:scale-95 transition-transform"
              >
                <Phone className="w-3.5 h-3.5" /> Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sticky category chips */}
      {sections.length > 1 && (
        <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5">
            {sections.map(([cat]) => {
              const active = activeCat === cat
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCat(cat)
                    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`shrink-0 px-4 h-10 rounded-full text-sm font-bold transition-all ${
                    active
                      ? 'bg-feaster-black text-feaster-yellow'
                      : 'bg-white text-ink-700 border border-ink-200/60'
                  }`}
                  style={active ? { boxShadow: '3px 3px 0 0 #FFD60A' } : undefined}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="px-5 pt-4 space-y-7">
        {sections.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center border-2 border-feaster-black/10">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm font-bold text-feaster-black">Menu coming soon</p>
            <p className="text-xs text-ink-400 mt-1">This restaurant hasn't added items yet</p>
          </div>
        )}

        {sections.map(([cat, items]) => (
          <section key={cat} id={`cat-${cat}`}>
            <h2 className="font-extrabold text-feaster-black mb-3 text-lg">{cat}</h2>
            <ul className="space-y-3">
              {items.map(item => {
                const inCart = cart.items?.find(c => c.item_id === item.id)
                return (
                  <li
                    key={item.id}
                    className="bg-white rounded-2xl border-2 border-feaster-black/10 p-3 flex gap-3 hover:border-feaster-black transition-colors"
                  >
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
                          <h3 className="font-extrabold text-feaster-black truncate">{item.name}</h3>
                          <ChevronRight className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
                        </div>
                        {item.description && (
                          <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                      </Link>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-extrabold text-feaster-black">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => cart.decrement(item.id)}
                              aria-label="Decrease"
                              className="w-9 h-9 bg-cream-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                            ><Minus className="w-4 h-4" /></button>
                            <span className="text-sm font-extrabold w-5 text-center">{inCart.quantity}</span>
                            <button
                              onClick={() => cart.increment(item.id)}
                              aria-label="Increase"
                              className="w-9 h-9 bg-feaster-black text-feaster-yellow rounded-full flex items-center justify-center active:scale-90 transition-transform"
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
                            className="px-4 py-2 bg-feaster-black text-feaster-yellow rounded-full text-xs font-extrabold active:scale-95 transition-transform"
                            style={{ boxShadow: '3px 3px 0 0 #FFD60A' }}
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

      {/* View cart bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-24 inset-x-0 px-4 z-20">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => navigate('/app/cart')}
              className="w-full bg-feaster-black text-feaster-yellow rounded-full py-3.5 px-5 flex items-center justify-between text-sm font-extrabold border-2 border-feaster-yellow active:scale-[0.98] transition-transform"
              style={{ boxShadow: '4px 4px 0 0 #FFD60A' }}
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
