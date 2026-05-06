import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ShoppingBag, Star, Check } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems } from '../../lib/services'
import { useCart } from '../../context/CartContext'

const SIZES = [
  { key: 'small',   label: 'Small',   mult: 0.85 },
  { key: 'regular', label: 'Regular', mult: 1.00 },
  { key: 'large',   label: 'Large',   mult: 1.20 },
]

export default function CustomerDish() {
  const { slug, itemId } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [size, setSize] = useState('regular')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await getRestaurantBySlug(slug)
        if (cancelled || !r) return navigate('/app', { replace: true })
        setRestaurant(r)
        const items = await getMenuItems(r.id)
        if (cancelled) return
        const found = items.find(i => i.id === itemId)
        if (!found) return navigate(`/app/r/${slug}`, { replace: true })
        setItem(found)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, itemId, navigate])

  const sizeMult = useMemo(() => SIZES.find(s => s.key === size)?.mult || 1, [size])
  const unitPrice = item ? Number(item.price) * sizeMult : 0
  const total = unitPrice * qty

  const addToCart = () => {
    if (!item || !restaurant) return
    if (cart.restaurantSlug !== restaurant.slug) {
      cart.setRestaurant(restaurant.slug, restaurant.id)
    }
    cart.addItem({
      id: item.id,
      name: item.name,
      price: unitPrice,
      base_price: Number(item.price),
      size,
      quantity: qty,
      notes,
      image_url: item.image_url,
    })
    setAdded(true)
    setTimeout(() => navigate(`/app/r/${slug}`), 700)
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    )
  }
  if (!item) return null

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      {/* Hero image */}
      <div className="relative aspect-square max-h-[60vh] bg-[#F4F4F4]">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-9xl">🍽️</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />

        <button
          onClick={() => navigate(`/app/r/${slug}`)}
          aria-label="Back"
          className="absolute top-5 left-5 w-11 h-11 rounded-full bg-white/95 backdrop-blur flex items-center justify-center active:scale-95 transition-transform shadow-md"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Content */}
      <div className="relative -mt-6 bg-white rounded-t-[28px] px-5 pt-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">{item.name}</h1>
          <Link
            to={`/app/r/${slug}`}
            className="mt-1 inline-flex items-center gap-1 text-xs text-black/55 font-semibold"
          >
            from <span className="font-bold text-black">{restaurant?.name}</span>
          </Link>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-black">
            <Star className="w-3.5 h-3.5 fill-black" />
            {Number(restaurant?.rating || 4.8).toFixed(1)}
            <span className="text-black/40 ml-1">· {item.category || 'Menu'}</span>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-black/70 leading-relaxed">{item.description}</p>
        )}

        {/* Size */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
            Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map(s => {
              const active = size === s.key
              const sPrice = Number(item.price) * s.mult
              return (
                <button
                  key={s.key}
                  onClick={() => setSize(s.key)}
                  className={`flex flex-col items-center justify-center h-16 rounded-2xl text-sm font-bold transition-all ${
                    active
                      ? 'bg-black text-white'
                      : 'bg-white text-black border-2 border-black/15'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-[11px] font-semibold mt-0.5 ${active ? 'text-white/75' : 'text-black/45'}`}>
                    ${sPrice.toFixed(2)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
            Special instructions
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. no onions, extra spicy"
            className="w-full h-12 px-4 bg-[#F4F4F4] rounded-2xl text-sm font-medium text-black placeholder-black/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-black/65">
            Quantity
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              aria-label="Decrease"
              className="w-10 h-10 rounded-full bg-[#F4F4F4] flex items-center justify-center active:scale-90 transition-transform"
            >
              <Minus className="w-4 h-4 text-black" />
            </button>
            <span className="text-lg font-extrabold tabular-nums w-8 text-center text-black">
              {qty}
            </span>
            <button
              onClick={() => setQty(q => q + 1)}
              aria-label="Increase"
              className="w-10 h-10 rounded-full bg-black flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Add to cart bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/5 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto">
          <button
            onClick={addToCart}
            disabled={added}
            className={`w-full h-14 rounded-full font-extrabold flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
              added ? 'bg-green-600 text-white' : 'bg-black text-white'
            }`}
          >
            {added ? (
              <><Check className="w-4 h-4" /> Added to cart</>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
                <span className="ml-auto pl-2 border-l border-white/25">${total.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
