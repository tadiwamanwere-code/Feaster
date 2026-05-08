import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Clock, Plus } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../../lib/services'
import { useCart } from '../../context/CartContext'
import OrderContextBanner from '../../components/customer/OrderContextBanner'

export default function CustomerRestaurant() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState(null)

  // Sync table number from query string into cart (for QR-arrived users)
  useEffect(() => {
    const t = params.get('table')
    if (t && cart.tableNumber !== t) cart.setTable?.(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await getRestaurantBySlug(slug)
        if (cancelled) return
        if (!r) return navigate('/app', { replace: true })
        setRestaurant(r)
        if (cart.restaurantSlug !== r.slug) cart.setRestaurant?.(r.slug, r.id)
        const items = await getMenuItems(r.id)
        if (!cancelled) setMenu(items.filter(i => i.is_available))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, navigate])

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
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    )
  }
  if (!restaurant) return null

  return (
    <div className="bg-white min-h-[100dvh] pb-32">
      {/* Cover */}
      <div className="relative h-56 bg-[#F4F4F4]">
        {restaurant.cover_photo_url ? (
          <img src={restaurant.cover_photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />

        <button
          onClick={() => navigate('/app')}
          aria-label="Back"
          className="absolute top-5 left-5 w-11 h-11 rounded-full bg-white/95 backdrop-blur flex items-center justify-center active:scale-95 transition-transform shadow-md"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      <div className="mx-5 -mt-3 relative z-10">
        <OrderContextBanner
          orderType={cart.orderType}
          tableNumber={cart.tableNumber}
          pickupTime={cart.pickupTime}
        />
      </div>

      {/* Restaurant info card */}
      <div className="relative mt-3 mx-5 bg-white rounded-3xl border border-black/10 p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F4F4F4] shrink-0 border-2 border-white shadow-md">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-black tracking-tight truncate">{restaurant.name}</h1>
            <p className="text-xs text-black/55 font-semibold mt-0.5 truncate">{restaurant.cuisine_type}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
              {restaurant.rating && (
                <span className="inline-flex items-center gap-0.5 text-black">
                  <Star className="w-3 h-3 fill-black" />
                  {Number(restaurant.rating).toFixed(1)}
                </span>
              )}
              {restaurant.city && (
                <span className="inline-flex items-center gap-0.5 text-black/55">
                  <MapPin className="w-3 h-3" /> {restaurant.city}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-black/55">
                <Clock className="w-3 h-3" /> 25 min
              </span>
            </div>
          </div>
        </div>
        {restaurant.description && (
          <p className="text-sm text-black/70 mt-3 leading-relaxed">{restaurant.description}</p>
        )}
      </div>

      {/* Sticky category chips */}
      {sections.length > 1 && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur pt-4 pb-2 mt-3">
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
                    active ? 'bg-black text-white' : 'bg-white text-black/70 border border-black/15'
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
          <div className="bg-white rounded-3xl p-8 text-center border border-black/10">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm font-bold text-black">Menu coming soon</p>
            <p className="text-xs text-black/45 mt-1">This restaurant hasn't added items yet</p>
          </div>
        )}

        {sections.map(([cat, items]) => (
          <section key={cat} id={`cat-${cat}`}>
            <h2 className="font-extrabold text-black mb-3 text-lg tracking-tight">{cat}</h2>
            <ul className="grid grid-cols-2 gap-3">
              {items.map(item => (
                <DishCard
                  key={item.id}
                  item={item}
                  slug={restaurant.slug}
                  onAdd={() => {
                    if (cart.restaurantSlug !== restaurant.slug) {
                      cart.setRestaurant(restaurant.slug, restaurant.id)
                    }
                    cart.addItem({
                      id: item.id,
                      name: item.name,
                      price: Number(item.price),
                      base_price: Number(item.price),
                      size: 'regular',
                      quantity: 1,
                      notes: '',
                      image_url: item.image_url,
                    })
                  }}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Cart FAB — blue accent, slides up when first item added */}
      {cart.itemCount > 0 && (
        <div className="fixed bottom-24 inset-x-0 z-30 px-5 pointer-events-none">
          <button
            onClick={() => navigate('/app/cart')}
            className="max-w-md mx-auto w-full h-14 rounded-full bg-[var(--color-cart)] text-white font-extrabold flex items-center justify-between gap-3 px-5 active:scale-[0.98] transition-transform pointer-events-auto"
            style={{ boxShadow: '0 14px 32px -8px rgba(37, 99, 235, 0.55)' }}
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-[var(--color-cart)] text-xs font-extrabold">
              {cart.itemCount}
            </span>
            <span className="flex-1 text-left">View cart</span>
            <span className="tabular-nums">${cart.total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── DishCard ─────────────────────────────────────────────────────
// Card itself navigates to /dish/:id for size/notes customisation.
// The "+" button in the corner adds a default unit straight to the cart,
// no confirmation, with a tap-pop + a "+1" ghost particle that flies down.
function DishCard({ item, slug, onAdd }) {
  const btnRef = useRef(null)
  const [particles, setParticles] = useState([])

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()

    onAdd()

    // Tap-pop on the button
    if (btnRef.current) {
      btnRef.current.classList.remove('tap-pop')
      // force reflow so animation restarts
      void btnRef.current.offsetWidth
      btnRef.current.classList.add('tap-pop')
    }

    // Spawn a +1 ghost particle that flies toward the cart tab (bottom-center)
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const startX = rect.left + rect.width / 2
      const startY = rect.top + rect.height / 2
      const endX = window.innerWidth / 2 - 60   // approx cart tab x
      const endY = window.innerHeight - 40
      const id = Date.now() + Math.random()
      setParticles(p => [...p, { id, x: startX, y: startY, dx: endX - startX, dy: endY - startY }])
      setTimeout(() => setParticles(p => p.filter(q => q.id !== id)), 650)
    }
  }

  return (
    <li className="relative">
      <Link
        to={`/app/r/${slug}/dish/${item.id}`}
        className="block bg-white rounded-2xl overflow-hidden border border-black/10 hover:border-black active:scale-[0.98] transition-all"
      >
        <div className="aspect-square bg-[#F4F4F4] relative">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
          )}

          {/* Add button — stops Link nav, adds straight to cart */}
          <button
            ref={btnRef}
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${item.name} to cart`}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[var(--color-cart)] text-white flex items-center justify-center active:scale-90 transition-transform z-10"
            style={{ boxShadow: '0 6px 16px -2px rgba(37, 99, 235, 0.5)' }}
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-bold text-black truncate">{item.name}</h3>
          {item.description && (
            <p className="text-[11px] text-black/55 mt-0.5 line-clamp-2 leading-tight">
              {item.description}
            </p>
          )}
          <div className="mt-2 text-sm font-extrabold text-black">
            ${Number(item.price).toFixed(2)}
          </div>
        </div>
      </Link>

      {/* Fly-to-cart ghost particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className="fixed z-50 pointer-events-none w-7 h-7 rounded-full bg-[var(--color-cart)] text-white text-xs font-extrabold flex items-center justify-center fly-to-cart"
          style={{
            left: p.x - 14,
            top:  p.y - 14,
            // Tailwind arbitrary values can't take CSS vars dynamically — use inline style
            ['--fly-end']: `translate(${p.dx}px, ${p.dy}px)`,
          }}
        >
          +1
        </span>
      ))}
    </li>
  )
}
