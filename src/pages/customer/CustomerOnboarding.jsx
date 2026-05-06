import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MapPin, Home, Bell, Navigation, Check } from 'lucide-react'

const ZIM_CITIES = [
  'Harare',
  'Bulawayo',
  'Mutare',
  'Gweru',
  'Kwekwe',
  'Masvingo',
  'Chitungwiza',
  'Victoria Falls',
  'Bindura',
  'Marondera',
  'Chinhoyi',
  'Kadoma',
  'Hwange',
  'Beitbridge',
]

const STEPS = ['City', 'Home address', 'Notifications', 'Location']

function ProgressDots({ index, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === index ? 'w-8 bg-black'
            : i < index ? 'w-3 bg-black/70'
            : 'w-3 bg-black/15'
          }`}
        />
      ))}
    </div>
  )
}

export default function CustomerOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [city, setCity] = useState(() => localStorage.getItem('feaster:city') || '')
  const [home, setHome] = useState(() => localStorage.getItem('feaster:home') || '')
  const [notifGranted, setNotifGranted] = useState(false)
  const [locGranted, setLocGranted] = useState(false)
  const [busy, setBusy] = useState(false)

  const goBack = () => {
    if (step === 0) navigate('/welcome')
    else setStep(s => s - 1)
  }

  const next = () => {
    if (step === 0) localStorage.setItem('feaster:city', city)
    if (step === 1) localStorage.setItem('feaster:home', home)
    if (step < 3) setStep(s => s + 1)
    else finish()
  }

  const finish = () => {
    localStorage.setItem('feaster:onboarded', 'true')
    navigate('/app', { replace: true })
  }

  const requestNotif = async () => {
    setBusy(true)
    try {
      if ('Notification' in window) {
        const result = await Notification.requestPermission()
        setNotifGranted(result === 'granted')
        localStorage.setItem('feaster:notif', result)
      }
    } catch {}
    setBusy(false)
    setStep(3)
  }

  const requestLoc = () => {
    setBusy(true)
    if (!('geolocation' in navigator)) {
      setBusy(false)
      finish()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocGranted(true)
        localStorage.setItem('feaster:loc', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
        setBusy(false)
        finish()
      },
      () => {
        setBusy(false)
        finish()
      },
      { timeout: 8000 }
    )
  }

  const canNext = step === 0 ? !!city : step === 1 ? home.trim().length >= 5 : true

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col px-6 pt-12 pb-8 max-w-md mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={goBack}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <ProgressDots index={step} total={4} />
        <div className="w-11" />
      </div>

      {/* STEP 0: CITY */}
      {step === 0 && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-black/55 text-xs font-extrabold uppercase tracking-wider mb-2">
            <MapPin className="w-4 h-4" /> Where are you?
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">Pick your city</h1>
          <p className="text-sm text-black/60 mt-2">We'll show restaurants nearby.</p>

          <div className="mt-8 grid grid-cols-2 gap-2">
            {ZIM_CITIES.map(c => {
              const selected = city === c
              return (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`h-12 rounded-full text-sm font-bold transition-all ${
                    selected
                      ? 'bg-black text-white'
                      : 'bg-white text-black border-2 border-black/15 hover:border-black/40'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
          <div className="flex-1" />
          <PrimaryButton onClick={next} disabled={!canNext}>Next</PrimaryButton>
        </div>
      )}

      {/* STEP 1: HOME ADDRESS */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-black/55 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Home className="w-4 h-4" /> Home base
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">Where do you live?</h1>
          <p className="text-sm text-black/60 mt-2">
            Default delivery address. Save now, edit later.
          </p>

          <div className="mt-8">
            <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
              Home address
            </label>
            <input
              type="text"
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder={`House #, Street, ${city || 'Suburb'}`}
              className="w-full h-14 px-5 bg-white border-2 border-black rounded-2xl text-base font-bold text-black placeholder-black/30 focus:outline-none"
              autoFocus
            />
            <p className="text-xs text-black/50 mt-2 font-medium">
              City: <span className="font-bold text-black">{city}</span>
            </p>
          </div>
          <div className="flex-1" />
          <PrimaryButton onClick={next} disabled={!canNext}>Next</PrimaryButton>
        </div>
      )}

      {/* STEP 2: NOTIFICATIONS */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-black/55 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Bell className="w-4 h-4" /> Stay updated
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">Allow notifications?</h1>
          <p className="text-sm text-black/60 mt-2">
            Get pinged when your order is confirmed, ready, or on the way.
          </p>

          <div className="mt-10 flex justify-center">
            <div className="w-32 h-32 rounded-full bg-black flex items-center justify-center">
              <Bell className="w-14 h-14 text-white" strokeWidth={2} />
            </div>
          </div>

          {notifGranted && (
            <p className="mt-6 inline-flex items-center justify-center gap-1 text-sm font-bold text-black">
              <Check className="w-4 h-4" /> Notifications enabled
            </p>
          )}

          <div className="flex-1" />
          <PrimaryButton onClick={requestNotif} loading={busy}>
            {notifGranted ? 'Continue' : 'Allow notifications'}
          </PrimaryButton>
          <button
            onClick={() => setStep(3)}
            className="mt-3 w-full text-sm text-black/55 font-semibold py-2"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* STEP 3: LOCATION */}
      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-black/55 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Navigation className="w-4 h-4" /> Nearby
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">Share location?</h1>
          <p className="text-sm text-black/60 mt-2">
            Helps us calculate accurate delivery fees and show drivers nearby.
          </p>

          <div className="mt-10 flex justify-center">
            <div className="w-32 h-32 rounded-full bg-black flex items-center justify-center">
              <Navigation className="w-14 h-14 text-white" strokeWidth={2} />
            </div>
          </div>

          {locGranted && (
            <p className="mt-6 text-sm font-bold text-black text-center inline-flex items-center justify-center gap-1">
              <Check className="w-4 h-4" /> Location enabled
            </p>
          )}

          <div className="flex-1" />
          <PrimaryButton onClick={requestLoc} loading={busy}>
            Allow location
          </PrimaryButton>
          <button
            onClick={finish}
            className="mt-3 w-full text-sm text-black/55 font-semibold py-2"
          >
            Skip and finish
          </button>
        </div>
      )}
    </div>
  )
}

function PrimaryButton({ children, loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative w-full h-14 rounded-full bg-black text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-transform active:scale-[0.97]"
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  )
}
