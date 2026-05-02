import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle2, Loader, AlertTriangle, Camera } from 'lucide-react'
import {
  createDriverProfile,
  updateMyDriverProfile,
  uploadDriverDocument,
  getMyDocuments,
  REQUIRED_DOCS,
  submitKycForReview,
} from '../../lib/drivers'
import { useDriverAuth } from '../../context/DriverAuthContext'

const VEHICLE_TYPES = [
  { key: 'car', label: 'Car' },
  { key: 'motorbike', label: 'Motorbike' },
  { key: 'bike', label: 'Bicycle' },
]

export default function DriverOnboarding() {
  const navigate = useNavigate()
  const { user, driver, refresh } = useDriverAuth()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    national_id: '',
    date_of_birth: '',
    vehicle_type: 'car',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_plate: '',
    vehicle_color: '',
    vehicle_year: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [docs, setDocs] = useState([])
  const [uploadingKey, setUploadingKey] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) navigate('/driver/auth', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (driver) {
      setForm(f => ({
        ...f,
        full_name: driver.full_name || '',
        email: driver.email || '',
        national_id: driver.national_id || '',
        date_of_birth: driver.date_of_birth || '',
        vehicle_type: driver.vehicle_type || 'car',
        vehicle_make: driver.vehicle_make || '',
        vehicle_model: driver.vehicle_model || '',
        vehicle_plate: driver.vehicle_plate || '',
        vehicle_color: driver.vehicle_color || '',
        vehicle_year: driver.vehicle_year || '',
      }))
      setProfileSaved(true)
      reloadDocs()
    }
  }, [driver])

  async function reloadDocs() {
    try {
      const d = await getMyDocuments()
      setDocs(d || [])
    } catch {
      setDocs([])
    }
  }

  const saveProfile = async () => {
    setError(''); setProfileSaving(true)
    try {
      if (!form.full_name?.trim()) throw new Error('Full name required')
      if (!form.vehicle_plate?.trim()) throw new Error('Vehicle plate required')
      if (!driver) {
        await createDriverProfile(form)
      } else {
        await updateMyDriverProfile(form)
      }
      await refresh()
      await reloadDocs()
      setProfileSaved(true)
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    }
    setProfileSaving(false)
  }

  const handleUpload = async (docType, file) => {
    if (!file || !driver) return
    setUploadingKey(docType); setError('')
    try {
      await uploadDriverDocument(driver.id, docType, file)
      await reloadDocs()
    } catch (err) {
      setError(err.message || 'Upload failed')
    }
    setUploadingKey(null)
  }

  const handleSubmitKyc = async () => {
    setError(''); setSubmitting(true)
    try {
      await submitKycForReview()
      await refresh()
      navigate('/driver', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not submit')
    }
    setSubmitting(false)
  }

  const docsByType = Object.fromEntries(docs.map(d => [d.doc_type, d]))
  const allUploaded = REQUIRED_DOCS.every(r => docsByType[r.key])
  const kycStatus = driver?.kyc_status || 'pending'

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b border-gray-100 p-4">
        <h1 className="text-xl font-bold text-gray-900">Driver onboarding</h1>
        <p className="text-sm text-gray-500">Complete your profile and upload KYC docs</p>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status banner */}
        {kycStatus === 'submitted' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">
            Your KYC is under review. You'll be notified once it's approved.
          </div>
        )}
        {kycStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            <strong>KYC rejected.</strong> {driver?.kyc_rejection_reason || 'Please re-upload corrected documents.'}
          </div>
        )}

        {/* Profile */}
        <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">1. Personal & vehicle details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full name *" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} />
            <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
            <Input label="National ID" value={form.national_id} onChange={v => setForm({ ...form, national_id: v })} />
            <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={v => setForm({ ...form, date_of_birth: v })} />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Vehicle type</label>
            <div className="flex gap-2">
              {VEHICLE_TYPES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setForm({ ...form, vehicle_type: v.key })}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    form.vehicle_type === v.key
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >{v.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Make" value={form.vehicle_make} onChange={v => setForm({ ...form, vehicle_make: v })} placeholder="Toyota" />
            <Input label="Model" value={form.vehicle_model} onChange={v => setForm({ ...form, vehicle_model: v })} placeholder="Corolla" />
            <Input label="Plate *" value={form.vehicle_plate} onChange={v => setForm({ ...form, vehicle_plate: v.toUpperCase() })} placeholder="ABC1234" />
            <Input label="Colour" value={form.vehicle_color} onChange={v => setForm({ ...form, vehicle_color: v })} placeholder="White" />
            <Input label="Year" type="number" value={form.vehicle_year} onChange={v => setForm({ ...form, vehicle_year: v })} placeholder="2018" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={saveProfile}
            disabled={profileSaving}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {profileSaving ? 'Saving…' : profileSaved ? 'Update details' : 'Save & continue'}
          </button>
        </section>

        {/* Documents */}
        {profileSaved && (
          <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">2. Upload required documents</h2>
            <p className="text-xs text-gray-500">Clear, well-lit photos. JPG/PNG/PDF up to 5MB each.</p>
            <ul className="space-y-2">
              {REQUIRED_DOCS.map(req => {
                const existing = docsByType[req.key]
                const isUploading = uploadingKey === req.key
                return (
                  <li key={req.key} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{req.label}</p>
                      {existing && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                          {existing.status === 'rejected' && (
                            <span className="text-red-600 ml-1">— rejected: {existing.rejection_reason}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer">
                      {isUploading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : (existing ? <Upload className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />)}
                      {isUploading ? 'Uploading…' : existing ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleUpload(req.key, e.target.files?.[0])}
                      />
                    </label>
                  </li>
                )
              })}
            </ul>

            {!allUploaded && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Upload all documents to submit for review
              </div>
            )}

            <button
              onClick={handleSubmitKyc}
              disabled={!allUploaded || submitting || kycStatus === 'submitted'}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : kycStatus === 'submitted' ? 'Already submitted' : 'Submit for review'}
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  )
}
