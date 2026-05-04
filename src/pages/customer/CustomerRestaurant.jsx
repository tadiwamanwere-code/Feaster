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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-black rounded-full animate-spin" />
      </div>
    )
  }
  if (!restaurant) return null

  const cartItemCount = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Hero header card */}
      <div className="relative pt-6 px-5">
        <button
          onClick={() => navigate('/app')}
          aria-label="Back"
          className="absolute top-6 left-5 z-10 w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
          style={{ boxShadow: '3px 3px 0 0 #0A0A0A' }}
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>

        <div className="bg-black text-white rounded-[28px] p-6 pt-20 relative overflow-hidden">
          {/* Circular avatar floating */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full bg-white overflow-hidden border-4 border-white">
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
                <span className="inline-flex items-center gap-1 px-3 h-8 bg-white text-black rounded-full text-xs font-extrabold">
                  <Star className="w-3.5 h-3.5 fill-black" />
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
                className="inline-flex items-center gap-2 mt-4 px-4 h-10 bg-white text-black rounded-full text-xs font-extrabold active:scale-95 transition-transform"
              >
                <Phone className="w-3.5 h-3.5" /> Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sticky category chips */}
      {sections.length > 1 && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur pt-3 pb-2">
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
                      ? 'bg-black text-white'
                      : 'bg-white text-black/75 border border-black/15'
                  }`}
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
          <div className="bg-white rounded-3xl p-8 text-center border-2 border-black/10">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm font-bold text-black">Menu coming soon</p>
            <p className="text-xs text-black/40 mt-1">This restaurant hasn't added items yet</p>
          </div>
        )}

        {sections.map(([cat, items]) => (
          <section key={cat} id={`cat-${cat}`}>
            <h2 className="font-extrabold text-black mb-3 text-lg">{cat}</h2>
            <ul className="space-y-3">
              {items.map(item => {
                const inCart = cart.items?.find(c => c.item_id === item.id)
                return (
                  <li
                    key={item.id}
                    className="bg-white rounded-2xl border-2 border-black/10 p-3 flex gap-3 hover:border-black transition-colors"
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
                        <div className="w-20 h-20 rounded-xl bg-[#F4F4F4] flex items-center justify-center text-3xl shrink-0">🍽️</div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/app/r/${restaurant.slug}/item/${item.id}`} className="block">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-black truncate">{item.name}</h3>
                          <ChevronRight className="w-4 h-4 text-black/40 shrink-0 mt-0.5" />
                        </div>
                        {item.description && (
                          <p className="text-xs text-black/55 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                      </Link>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-extrabold text-black">
                          ${Number(item.price).toFixed(2)}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => cart.decrement(item.id)}
                              aria-label="Decrease"
                              className="w-9 h-9 bg-[#F4F4F4] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                            ><Minus className="w-4 h-4" /></button>
                            <span className="text-sm font-extrabold w-5 text-center">{inCart.quantity}</span>
                            <button
                              onClick={() => cart.increment(item.id)}
                              aria-label="Increase"
                              className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
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
                            className="px-4 py-2 bg-black text-white rounded-full text-xs font-extrabold active:scale-95 transition-transform"
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
              className="w-full bg-black text-white rounded-full py-3.5 px-5 flex items-center justify-between text-sm font-extrabold border-2 border-black active:scale-[0.98] transition-transform"
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
