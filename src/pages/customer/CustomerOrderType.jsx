import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Utensils, ShoppingBag, Clock } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const TYPES = [
  {
    key: 'in_house',
    title: 'Dine In',
    desc: 'Eat at the restaurant — scan your table QR to order',
    icon: Utensils,
    needsScan: true,
  },
  {
    key: 'takeaway',
    title: 'Take Away',
    desc: 'Order at the restaurant, take it with you',
    icon: ShoppingBag,
    needsScan: true,
  },
  {
    key: 'pre_order',
    title: 'Pre-Order',
    desc: 'Order ahead and pick it up at a chosen time',
    icon: Clock,
    needsScan: false,
  },
]

export default function CustomerOrderType() {
  const navigate = useNavigate()
  const cart = useCart()

  const choose = (t) => {
    cart.setOrderType?.(t.key)
    if (t.needsScan) navigate('/app/scan')
    else navigate('/app')
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col px-6 pt-12 pb-8 max-w-md mx-auto page-fade-in">
      {/* Top bar */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/welcome')}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Heading */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/45">
          How are you ordering?
        </p>
        <h1 className="text-3xl font-black text-black tracking-tight mt-2">
          Pick your way.
        </h1>
        <p className="text-sm text-black/60 mt-2 max-w-xs">
          Eat at the restaurant, take it with you, or schedule a pickup time.
        </p>
      </div>

      {/* Options */}
      <ul className="mt-8 space-y-3">
        {TYPES.map(t => (
          <li key={t.key}>
            <button
              onClick={() => choose(t)}
              className="group w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-black/10 hover:border-black active:scale-[0.99] transition-all bg-white text-left"
            >
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center shrink-0">
                <t.icon className="w-5 h-5 text-white" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-black text-base">{t.title}</h3>
                <p className="text-xs text-black/55 mt-0.5 leading-relaxed">{t.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <p className="text-center text-[11px] text-black/40 font-medium">
        You can change this anytime from the cart.
      </p>
    </div>
  )
}
