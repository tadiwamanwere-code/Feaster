import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader, Check, AlertCircle } from 'lucide-react'
import { signupRestaurant, isSlugAvailable } from '../lib/services'

const CITIES = [
  'Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe',
  'Masvingo', 'Chitungwiza', 'Victoria Falls', 'Bindura',
  'Marondera', 'Chinhoyi', 'Kadoma', 'Hwange', 'Beitbridge',
]

const CUISINES = [
  'African', 'Local', 'BBQ', 'Pizza', 'Burgers', 'Chicken',
  'Sushi', 'Indian', 'Chinese', 'Italian', 'Seafood',
  'Vegan', 'Cafe', 'Desserts', 'Fast Food',
]

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
}

export default function RestaurantSignup() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [city, setCity] = useState('Harare')
  const [cuisine, setCuisine] = useState('African')
  const [whatsapp, setWhatsapp] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')

  const [slugStatus, setSlugStatus] = useState({ checking: false, available: null })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-derive slug from name unless user has manually edited it
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus({ checking: false, available: null })
      return
    }
    const t = setTimeout(async () => {
      setSlugStatus({ checking: true, available: null })
      try {
        const ok = await isSlugAvailable(slug)
        setSlugStatus({ checking: false, available: ok })
      } catch {
        setSlugStatus({ checking: false, available: null })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [slug])

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (name.trim().length < 2)        return setError('Restaurant name is required')
    if (slug.length < 3)               return setError('URL handle must be at least 3 chars')
    if (slugStatus.available === false) return setError('That URL handle is taken')
    if (!city)                         return setError('Pick a city')
    if (!cuisine)                       return setError('Pick a cuisine')
    if (whatsapp.replace(/\D/g, '').length < 9) return setError('Valid WhatsApp number required')
    if (pin.length < 4)                 return setError('Kitchen PIN must be at least 4 digits')
    if (pin !== pinConfirm)             return setError('PINs do not match')

    setSubmitting(true)
    try {
      await signupRestaurant({
        name: name.trim(),
        slug,
        city,
        cuisine_type: cuisine,
        whatsapp_number: whatsapp.trim(),
        kitchen_pin: pin,
        // Sensible defaults — owner can edit later in the admin
        opening_hours: {
          mon: '11:00-22:00', tue: '11:00-22:00', wed: '11:00-22:00',
          thu: '11:00-22:00', fri: '11:00-23:00', sat: '11:00-23:00',
          sun: '12:00-21:00',
        },
        payment_methods: ['cash', 'ecocash'],
        subscription_tier: 'pro',
        table_count: 0,
      })
      navigate('/system/login', {
        replace: true,
        state: { signupSlug: slug, signupMessage: 'Restaurant created — sign in with your kitchen PIN.' },
      })
    } catch (err) {
      setError(err?.message || 'Failed to create restaurant')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Top bar */}
      <header className="px-10 py-6 flex items-center justify-between max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-black/65 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span
          className="text-2xl text-black"
          style={{ fontFamily: 'Pacifico, cursive' }}
        >
          Feaster
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-10 pb-20">
        <div className="text-center mb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-black/45">
            New restaurant
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-black text-black tracking-tight">
            List your restaurant.
          </h1>
          <p className="mt-3 text-base text-black/60 leading-relaxed max-w-md mx-auto">
            Takes about 60 seconds. You can fill in the rest (menu, photos, etc.) after signing in.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Name */}
          <Field label="Restaurant name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nair Nosh"
              className="input-pill"
              required
              autoFocus
            />
          </Field>

          {/* Slug */}
          <Field label="URL handle">
            <div className="flex items-center gap-2 bg-white border-2 border-black/15 focus-within:border-black rounded-2xl h-14 px-4 transition-colors">
              <span className="text-sm font-bold text-black/45 select-none">feaster.app/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true) }}
                placeholder="nair-nosh"
                className="flex-1 bg-transparent text-base font-bold text-black focus:outline-none placeholder-black/30"
                required
              />
              {slugStatus.checking && <Loader className="w-4 h-4 text-black/40 animate-spin" />}
              {slugStatus.available === true && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                  <Check className="w-3.5 h-3.5" /> Available
                </span>
              )}
              {slugStatus.available === false && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                  <AlertCircle className="w-3.5 h-3.5" /> Taken
                </span>
              )}
            </div>
          </Field>

          {/* City + Cuisine */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-pill"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Cuisine">
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="input-pill"
              >
                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {/* WhatsApp number */}
          <Field label="WhatsApp number">
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+263 77 123 4567"
              className="input-pill"
              required
            />
            <p className="text-[11px] text-black/45 font-medium mt-2">
              How customers reach you. You can edit it after sign-in.
            </p>
          </Field>

          {/* Kitchen PIN */}
          <div className="bg-[#F4F4F4] rounded-2xl p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-1">
              Kitchen PIN
            </h3>
            <p className="text-xs text-black/55 mb-3 leading-relaxed">
              4–6 digits. You'll use this to log into the POS / kitchen dashboard.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="PIN"
                className="input-pill text-center text-xl tracking-[0.3em]"
                required
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Confirm"
                className="input-pill text-center text-xl tracking-[0.3em]"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || slugStatus.available === false}
            className="w-full h-14 rounded-full bg-black text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {submitting ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>Create Restaurant <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="text-center text-xs text-black/55 font-medium">
            Already have one?{' '}
            <Link to="/system/login" className="font-extrabold text-black underline">
              Sign in
            </Link>
          </p>
        </form>
      </main>

      <style>{`
        .input-pill {
          width: 100%;
          height: 56px;
          padding: 0 1.25rem;
          background: white;
          border: 2px solid rgba(0,0,0,0.15);
          border-radius: 1rem;
          color: black;
          font-weight: 700;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-pill:focus { border-color: black; }
        .input-pill::placeholder { color: rgba(0,0,0,0.3); }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
        {label}
      </label>
      {children}
    </div>
  )
}
