import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, Clock } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../../lib/services'

export default function CustomerRestaurant() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState(null)

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
    <div className="bg-white min-h-[100dvh]">
      {/* Cover */}
      <div className="relative h-56 bg-[#F4F4F4]">
        {restaurant.cover_photo_url ? (
          <img
            src={restaurant.cover_photo_url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
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

      {/* Restaurant info card */}
      <div className="relative -mt-12 mx-5 bg-white rounded-3xl border border-black/10 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Circular logo */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F4F4F4] shrink-0 border-2 border-white shadow-md">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-black tracking-tight truncate">
              {restaurant.name}
            </h1>
            <p className="text-xs text-black/55 font-semibold mt-0.5 truncate">
              {restaurant.cuisine_type}
            </p>

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
          <p className="text-sm text-black/70 mt-3 leading-relaxed">
            {restaurant.description}
          </p>
        )}
      </div>

      {/* Sticky category chips */}
      {sections.length > 1 && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur pt-4 pb-2 border-b border-black/5">
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
                      : 'bg-white text-black/70 border border-black/15'
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
      <div className="px-5 pt-4 pb-32 space-y-7">
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
                <li key={item.id}>
                  <Link
                    to={`/app/r/${restaurant.slug}/dish/${item.id}`}
                    className="block bg-white rounded-2xl overflow-hidden border border-black/10 hover:border-black active:scale-[0.98] transition-all"
                  >
                    <div className="aspect-square bg-[#F4F4F4]">
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
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
