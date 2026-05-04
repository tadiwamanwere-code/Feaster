import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Star, Plus, Minus, ShoppingBag, Zap } from 'lucide-react'
import { getMenuItemById, getMenuItems } from '../../lib/services'
import { useCart } from '../../context/CartContext'

const SIZE_OPTIONS = [
  { key: 'small', label: 'Small', mult: 0.85 },
  { key: 'half',  label: 'Half',  mult: 1.0 },
  { key: 'full',  label: 'Full',  mult: 1.25 },
]

export default function CustomerItemDetail() {
  const { slug, itemId } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [item, setItem] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [size, setSize] = useState('half')
  const [notes, setNotes] = useState('')
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [favourite, setFavourite] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('feaster:favs') || '[]')).has(itemId) }
    catch { return false }
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMenuItemById(itemId)
      .then(async (it) => {
        if (cancelled || !it) { setLoading(false); return }
        setItem(it)
        const all = await getMenuItems(it.restaurant_id)
        if (cancelled) return
        setSimilar(
          all
            .filter(m => m.id !== it.id && m.is_available)
            .filter(m => !it.category || m.category === it.category)
            .slice(0, 8)
        )
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [itemId])

  const sizeMult = SIZE_OPTIONS.find(s => s.key === size)?.mult || 1
  const unitPrice = useMemo(() => (item ? Number(item.price) * sizeMult : 0), [item, sizeMult])
  const total = unitPrice * qty

  const toggleFav = () => {
    setFavourite(prev => {
      const next = !prev
      try {
        const set = new Set(JSON.parse(localStorage.getItem('feaster:favs') || '[]'))
        if (next) set.add(itemId); else set.delete(itemId)
        localStorage.setItem('feaster:favs', JSON.stringify([...set]))
      } catch {}
      return next
    })
  }

  const ensureRestaurantInCart = () => {
    if (item?.restaurants?.slug && cart.restaurantSlug !== item.restaurants.slug) {
      cart.setRestaurant?.(item.restaurants.slug, item.restaurant_id)
    }
  }

  const addToCart = () => {
    if (!item) return
    ensureRestaurantInCart()
    cart.addItem({
      item_id: item.id,
      name: SIZE_OPTIONS.length > 1 ? `${item.name} (${SIZE_OPTIONS.find(s => s.key === size)?.label})` : item.name,
      price: unitPrice,
      quantity: qty,
      notes,
    })
  }

  const orderNow = () => {
    addToCart()
    navigate('/app/cart')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50">
        <div className="h-72 bg-cream-100 animate-pulse" />
        <div className="p-5 space-y-3">
          <div className="h-6 w-2/3 bg-white rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-white rounded animate-pulse" />
          <div className="h-24 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }
  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 p-6 text-center">
        <div>
          <p className="text-ink-700 font-semibold">Item not found</p>
          <button onClick={() => navigate(-1)} className="mt-3 text-orange-600 font-semibold">Go back</button>
        </div>
      </div>
    )
  }

  const r = item.restaurants
  const desc = item.description || ''
  const longDesc = desc.length > 140
  const shortDesc = longDesc ? desc.slice(0, 140) + '…' : desc

  return (
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Top header overlay */}
      <header className="absolute top-0 inset-x-0 z-20 px-5 pt-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white/95 backdrop-blur shadow-soft flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-ink-900" />
        </button>
        <div className="text-sm font-bold text-ink-900 bg-white/95 backdrop-blur px-4 h-11 rounded-full flex items-center shadow-soft">
          Details
        </div>
        <button
          onClick={toggleFav}
          aria-label="Favourite"
          className="w-11 h-11 rounded-full bg-white/95 backdrop-blur shadow-soft flex items-center justify-center active:scale-95 transition-transform"
        >
          <Heart className={`w-5 h-5 ${favourite ? 'fill-red-500 text-red-500' : 'text-ink-900'}`} />
        </button>
      </header>

      {/* Hero image */}
      <div className="relative aspect-square max-h-[60vh] bg-gradient-to-br from-cream-100 to-cream-200 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-9xl">🍽️</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream-50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-6 bg-cream-50 rounded-t-[28px] px-5 pt-6 space-y-5">
        {/* Title row */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{item.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink-500">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold text-ink-900">{Number(r?.rating || 4.9).toFixed(1)}</span>
            <span className="text-ink-400">(225 reviews)</span>
          </div>
        </div>

        {/* Restaurant + price + qty */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 font-bold">Restaurant</div>
            <Link to={`/app/r/${r?.slug}`} className="text-sm font-bold text-ink-900 truncate block">
              {r?.name}
            </Link>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 font-bold">Price</div>
            <div className="text-base font-bold text-orange-600">${unitPrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 font-bold">Quantity</div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                aria-label="Decrease"
                className="w-8 h-8 rounded-full bg-white border border-ink-200/40 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold tabular-nums text-base w-6 text-center">
                {String(qty).padStart(2, '0')}
              </span>
              <button
                onClick={() => setQty(q => q + 1)}
                aria-label="Increase"
                className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-pop active:scale-90 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Size selector */}
        <div>
          <div className="text-sm font-bold text-ink-900 mb-2">Size</div>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map(s => {
              const active = size === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setSize(s.key)}
                  className={`flex-1 h-11 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? 'bg-orange-600 text-white shadow-pop'
                      : 'bg-white text-ink-700 border border-ink-200/40'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Description */}
        {desc && (
          <div>
            <p className="text-sm text-ink-700 leading-relaxed">
              {showFullDesc || !longDesc ? desc : shortDesc}
              {longDesc && (
                <button
                  onClick={() => setShowFullDesc(s => !s)}
                  className="ml-1 text-orange-600 font-semibold"
                >
                  {showFullDesc ? 'Read less' : 'Read More...'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-bold text-ink-900 mb-2 block">Special instructions</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. no onions, extra spicy"
            className="w-full h-12 px-4 bg-white border border-ink-200/40 rounded-2xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Similar dishes */}
        {similar.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-ink-900 mb-3">Similar Dishes</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {similar.map(s => (
                <Link
                  key={s.id}
                  to={`/app/r/${slug}/item/${s.id}`}
                  className="shrink-0 w-36 bg-white rounded-2xl border border-ink-200/30 overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="aspect-square bg-cream-100">
                    {s.image_url && (
                      <img src={s.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold text-ink-900 truncate">{s.name}</p>
                    <p className="text-[10px] text-ink-500 truncate">{r?.name}</p>
                    <p className="text-xs font-bold text-orange-600 mt-0.5">${Number(s.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-cream-50/95 backdrop-blur border-t border-ink-200/30 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={addToCart}
            className="flex-1 h-13 py-3.5 rounded-full bg-white border-2 border-orange-600 text-orange-600 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <ShoppingBag className="w-4 h-4" /> Add to Cart
          </button>
          <button
            onClick={orderNow}
            className="flex-1 h-13 py-3.5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center gap-2 shadow-pop active:scale-[0.98] transition-transform"
          >
            <Zap className="w-4 h-4" /> Order Now · ${total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
