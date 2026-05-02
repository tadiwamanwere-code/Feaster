import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Phone, Lock, ArrowLeft, Loader } from 'lucide-react'
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

  const submitPhone = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const normalized = await sendPhoneOtp(phone)
      setNormalizedPhone(normalized)
      setStep(STEPS.OTP)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    }
    setLoading(false)
  }

  const submitOtp = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await verifyPhoneOtp(normalizedPhone, otp)
      // Check if user already has a PIN set
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {step !== STEPS.PHONE && step !== STEPS.PIN_LOGIN && (
          <button
            onClick={() => setStep(s => Math.max(STEPS.PHONE, s - 1))}
            className="mb-4 text-sm text-gray-500 flex items-center gap-1 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {step === STEPS.PHONE && (
          <form onSubmit={submitPhone} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Welcome to Feaster</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in with your phone number</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+263 77 123 4567"
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              {phone && (
                <p className="text-xs text-gray-400 mt-1">
                  Will send to: {normalizePhone(phone) || 'Invalid format'}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Send OTP'}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <form onSubmit={submitOtp} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Enter the code</h1>
              <p className="text-sm text-gray-500 mt-1">
                We sent a code to {normalizedPhone}
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full px-3 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-orange-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => setStep(STEPS.PHONE)}
              className="w-full text-xs text-gray-500 hover:text-gray-800"
            >
              Wrong number? Change it
            </button>
          </form>
        )}

        {step === STEPS.PIN_SETUP && (
          <form onSubmit={submitPinSetup} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Set a 6-digit PIN</h1>
              <p className="text-sm text-gray-500 mt-1">
                You'll use this PIN to confirm orders and payments
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || pin.length !== 6 || pinConfirm.length !== 6}
              className="w-full bg-orange-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Set PIN & continue'}
            </button>
          </form>
        )}

        {step === STEPS.PIN_LOGIN && (
          <form onSubmit={submitPinLogin} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your PIN</p>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full bg-orange-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
