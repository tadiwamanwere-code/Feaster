import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader, CheckCircle2 } from 'lucide-react'
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  setPin,
  verifyPin,
  hasPin,
  normalizePhone,
} from '../../lib/customers'
import { useCustomerAuth } from '../../context/CustomerAuthContext'

const STEPS = { PHONE: 0, OTP: 1, PIN_SETUP: 2, PIN_LOGIN: 3 }
const OTP_LEN = 6

function ProgressDots({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step ? 'w-8 bg-black'
            : i < step ? 'w-3 bg-black/70'
            : 'w-3 bg-black/15'
          }`}
        />
      ))}
    </div>
  )
}

function PrimaryButton({ children, loading, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative w-full h-14 rounded-full bg-black text-white font-extrabold tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.97] hover:-translate-y-0.5"
    >
      {loading ? <Loader className="w-5 h-5 animate-spin" /> : children}
    </button>
  )
}

function OtpBoxes({ value, onChange, length = OTP_LEN, autoFocus }) {
  const refs = useRef([])

  const setDigit = (i, d) => {
    const arr = value.padEnd(length, ' ').split('')
    arr[i] = d
    const next = arr.join('').slice(0, length).replace(/\s/g, '')
    onChange(next)
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const arr = value.split('')
      if (arr[i]) {
        arr[i] = ''
        onChange(arr.join(''))
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
        const prev = arr.slice(0, i - 1).join('')
        onChange(prev)
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus()
  }

  const handleInput = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1)
    if (!d) return
    setDigit(i, d)
    if (i < length - 1) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, length)
    if (text) {
      e.preventDefault()
      onChange(text)
      const idx = Math.min(text.length, length - 1)
      refs.current[idx]?.focus()
    }
  }

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => {
        const filled = !!value[i]
        return (
          <input
            key={i}
            ref={el => (refs.current[i] = el)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleInput(i, e)}
            onKeyDown={(e) => handleKey(i, e)}
            autoFocus={autoFocus && i === 0}
            className={`w-12 h-14 text-center text-2xl font-extrabold rounded-2xl border-2 outline-none transition-all ${
              filled
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-black/15 focus:border-black'
            }`}
          />
        )
      })}
    </div>
  )
}

export default function CustomerAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, refreshProfile } = useCustomerAuth()
  const redirectTo = location.state?.from || '/app'

  const [step, setStep] = useState(user ? STEPS.PIN_LOGIN : STEPS.PHONE)
  const [phone, setPhoneInput] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pin, setPinInput] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const stepIndex = step === STEPS.PHONE ? 0
                  : step === STEPS.OTP ? 1
                  : 2

  const goBack = () => {
    setError('')
    if (step === STEPS.PHONE) navigate('/welcome')
    else if (step === STEPS.OTP) setStep(STEPS.PHONE)
    else if (step === STEPS.PIN_SETUP) setStep(STEPS.OTP)
    else navigate('/welcome')
  }

  const submitPhone = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const normalized = await sendPhoneOtp(phone)
      setNormalizedPhone(normalized)
      setStep(STEPS.OTP)
      setResendIn(60)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (resendIn > 0) return
    setError(''); setLoading(true)
    try {
      const normalized = await sendPhoneOtp(phone)
      setNormalizedPhone(normalized)
      setResendIn(60)
    } catch (err) {
      setError(err.message || 'Failed to resend')
    }
    setLoading(false)
  }

  const submitOtp = async (e) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    try {
      await verifyPhoneOtp(normalizedPhone, otp)
      const exists = await hasPin()
      if (exists) {
        navigate(redirectTo, { replace: true })
      } else {
        setStep(STEPS.PIN_SETUP)
      }
      await refreshProfile()
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    }
    setLoading(false)
  }

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (step === STEPS.OTP && otp.length === OTP_LEN && !loading) {
      submitOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const submitPinSetup = async (e) => {
    e.preventDefault()
    setError('')
    if (pin.length !== 6) return setError('PIN must be exactly 6 digits')
    if (pin !== pinConfirm) return setError('PINs do not match')
    setLoading(true)
    try {
      await setPin(pin)
      await refreshProfile()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to set PIN')
    }
    setLoading(false)
  }

  const submitPinLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const r = await verifyPin(pin)
      if (r.success) {
        navigate(redirectTo, { replace: true })
      } else if (r.lockedUntil) {
        const mins = Math.ceil((new Date(r.lockedUntil) - Date.now()) / 60000)
        setError(`Too many wrong attempts. Try again in ${mins} min.`)
      } else if (r.attemptsRemaining != null) {
        setError(`${r.error || 'Incorrect PIN'} — ${r.attemptsRemaining} attempts left`)
      } else {
        setError(r.error || 'Incorrect PIN')
      }
    } catch (err) {
      setError(err.message || 'PIN check failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="min-h-[100dvh] flex flex-col px-6 pt-12 pb-8 max-w-md mx-auto">
        {/* Top bar: back + progress */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={goBack}
            aria-label="Back"
            className="w-11 h-11 rounded-full bg-white border-2 border-black flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          {step !== STEPS.PIN_LOGIN && <ProgressDots step={stepIndex} total={3} />}
          <div className="w-11" />
        </div>

        {/* PHONE STEP */}
        {step === STEPS.PHONE && (
          <form onSubmit={submitPhone} className="flex-1 flex flex-col">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-black tracking-tight">Enter your phone number.</h1>
              <p className="text-sm text-black/65 max-w-xs">
                We'll send a verification code to confirm it's you.
              </p>
            </div>

            <div className="mt-8">
              <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">
                Phone number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+263 77 123 4567"
                  className="w-full h-14 px-5 bg-white border-2 border-black rounded-2xl text-base font-bold text-black placeholder-black/30 focus:outline-none transition-shadow focus:border-black"
                  required
                  autoFocus
                />
              </div>
              {phone && (
                <p className="text-xs text-black/55 mt-2 font-medium">
                  Sending to: <span className="font-bold">{normalizePhone(phone) || 'Invalid format'}</span>
                </p>
              )}
            </div>

            {error && <p className="text-sm font-bold text-red-700 bg-white/60 rounded-lg px-3 py-2 mt-4">{error}</p>}

            <div className="flex-1" />

            <PrimaryButton type="submit" loading={loading} disabled={!phone}>
              SEND CODE
            </PrimaryButton>
          </form>
        )}

        {/* OTP STEP */}
        {step === STEPS.OTP && (
          <form onSubmit={submitOtp} className="flex-1 flex flex-col">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-black tracking-tight">
                Enter OTP <br/>verification code.
              </h1>
              <p className="text-sm text-black/65">
                Verification code has been sent to{' '}
                <span className="font-bold text-black">{normalizedPhone}</span>
              </p>
            </div>

            <div className="mt-10">
              <OtpBoxes value={otp} onChange={setOtp} autoFocus />
            </div>

            <div className="mt-6 text-center">
              {resendIn > 0 ? (
                <p className="text-sm text-black/65 font-medium">
                  Didn't receive the code? <span className="font-bold">Resend ({resendIn}s)</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm font-bold text-black underline underline-offset-4"
                >
                  Didn't receive the code? Resend
                </button>
              )}
            </div>

            {error && <p className="text-sm font-bold text-red-700 bg-white/60 rounded-lg px-3 py-2 mt-4 text-center">{error}</p>}

            <div className="flex-1" />

            <PrimaryButton type="submit" loading={loading} disabled={otp.length !== OTP_LEN}>
              VERIFY
            </PrimaryButton>
          </form>
        )}

        {/* PIN SETUP */}
        {step === STEPS.PIN_SETUP && (
          <form onSubmit={submitPinSetup} className="flex-1 flex flex-col">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-black">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-extrabold tracking-wider uppercase">Verification Success</span>
              </div>
              <h1 className="text-3xl font-black text-black tracking-tight">Create your PIN.</h1>
              <p className="text-sm text-black/65 max-w-xs">
                Choose a 6-digit PIN. You'll use it to confirm orders and payments.
              </p>
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full h-14 px-5 bg-white border-2 border-black rounded-2xl text-center text-2xl font-extrabold tracking-[0.5em] text-black focus:outline-none focus:border-black"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-black/65 mb-2 block">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full h-14 px-5 bg-white border-2 border-black rounded-2xl text-center text-2xl font-extrabold tracking-[0.5em] text-black focus:outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm font-bold text-red-700 bg-white/60 rounded-lg px-3 py-2 mt-4">{error}</p>}

            <div className="flex-1" />

            <PrimaryButton type="submit" loading={loading} disabled={pin.length !== 6 || pinConfirm.length !== 6}>
              CREATE PIN
            </PrimaryButton>
          </form>
        )}

        {/* PIN LOGIN (returning users) */}
        {step === STEPS.PIN_LOGIN && (
          <form onSubmit={submitPinLogin} className="flex-1 flex flex-col">
            <div className="space-y-2">
              <h1
                className="text-5xl text-black"
                style={{ fontFamily: 'Pacifico, cursive' }}
              >
                Welcome back
              </h1>
              <p className="text-sm text-black/65">Enter your 6-digit PIN to continue.</p>
            </div>

            <div className="mt-10">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-16 px-5 bg-white border-2 border-black rounded-2xl text-center text-3xl font-extrabold tracking-[0.5em] text-black focus:outline-none focus:border-black"
                required
                autoFocus
                placeholder="••••••"
              />
            </div>

            {error && <p className="text-sm font-bold text-red-700 bg-white/60 rounded-lg px-3 py-2 mt-4 text-center">{error}</p>}

            <div className="flex-1" />

            <PrimaryButton type="submit" loading={loading} disabled={pin.length !== 6}>
              CONTINUE
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  )
}
