import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ArrowLeft, Loader, Truck } from 'lucide-react'
import { sendDriverOtp, verifyDriverOtp, getMyDriverProfile } from '../../lib/drivers'
import { normalizePhone } from '../../lib/customers'

const STEPS = { PHONE: 0, OTP: 1 }

export default function DriverAuth() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.PHONE)
  const [phone, setPhone] = useState('')
  const [normalized, setNormalized] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitPhone = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const n = await sendDriverOtp(phone)
      setNormalized(n)
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
      await verifyDriverOtp(normalized, otp)
      const profile = await getMyDriverProfile()
      if (!profile) {
        navigate('/driver/onboarding', { replace: true })
      } else if (profile.kyc_status === 'pending' || profile.kyc_status === 'rejected') {
        navigate('/driver/onboarding', { replace: true })
      } else {
        navigate('/driver', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Invalid code')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Feaster Driver</h1>
            <p className="text-xs text-gray-500">Earn from deliveries</p>
          </div>
        </div>

        {step === STEPS.PHONE && (
          <form onSubmit={submitPhone} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+263 77 123 4567"
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Send OTP'}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <form onSubmit={submitOtp} className="space-y-4">
            <button type="button" onClick={() => setStep(STEPS.PHONE)} className="text-sm text-gray-500 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <p className="text-sm text-gray-500">We sent a code to {normalized}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Verify'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
