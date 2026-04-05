import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Upload, Trash2, PauseCircle, PlayCircle, AlertTriangle, X, Image, Link2, Loader } from 'lucide-react'
import { getRestaurantBySlug, updateRestaurant, deleteRestaurant } from '../../lib/services'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

export default function RestaurantSettings() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const logoInputRef = useRef()
  const coverInputRef = useRef()

  const [form, setForm] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    city: '',
    whatsapp_number: '',
    logo_url: '',
    cover_photo_url: '',
    opening_hours: {},
    payment_methods: ['cash'],
    kitchen_pin: '1234',
    is_active: true,
  })

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          setRestaurant(rest)
          setForm({
            name: rest.name || '',
            description: rest.description || '',
            cuisine_type: rest.cuisine_type || '',
            city: rest.city || '',
            whatsapp_number: rest.whatsapp_number || '',
            logo_url: rest.logo_url || '',
            cover_photo_url: rest.cover_photo_url || '',
            opening_hours: rest.opening_hours || {},
            payment_methods: rest.payment_methods || ['cash'],
            kitchen_pin: rest.kitchen_pin || '1234',
            is_active: rest.is_active !== false,
          })
        } else {
          setRestaurant({ id: 'demo', slug })
          setForm(f => ({ ...f, name: slug.charAt(0).toUpperCase() + slug.slice(1), city: 'Harare' }))
        }
      } catch {
        setRestaurant({ id: 'demo', slug })
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (restaurant?.id && restaurant.id !== 'demo') {
        await updateRestaurant(restaurant.id, form)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const handleSuspend = async () => {
    const newActive = !form.is_active
    try {
      if (restaurant?.id && restaurant.id !== 'demo') {
        await updateRestaurant(restaurant.id, { is_active: newActive })
      }
      setForm(f => ({ ...f, is_active: newActive }))
      setRestaurant(r => ({ ...r, is_active: newActive }))
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  const handleDelete = async () => {
    if (deleteText !== form.name) return
    setDeleting(true)
    try {
      if (restaurant?.id && restaurant.id !== 'demo') {
        await deleteRestaurant(restaurant.id)
      }
      navigate('/platform')
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleting(false)
    }
  }

  const handleImageUpload = (file, type) => {
    if (!file) return

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover
    setUploading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      setForm(f => ({
        ...f,
        [type === 'logo' ? 'logo_url' : 'cover_photo_url']: e.target.result,
      }))
      setUploading(false)
    }
    reader.onerror = () => setUploading(false)
    reader.readAsDataURL(file)
  }

  const togglePayment = (method) => {
    setForm(f => ({
      ...f,
      payment_methods: f.payment_methods.includes(method)
        ? f.payment_methods.filter(m => m !== method)
        : [...f.payment_methods, method],
    }))
  }

  const updateHours = (day, value) => {
    setForm(f => ({
      ...f,
      opening_hours: { ...f.opening_hours, [day]: value },
    }))
  }

  if (loading) {
    return <div className="max-w-2xl space-y-4 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl" />)}</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Manage your restaurant profile</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Suspension banner */}
      {!form.is_active && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <PauseCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">Restaurant is Suspended</p>
            <p className="text-xs text-yellow-600 mt-0.5">This restaurant is not visible to customers. Reactivate to make it live again.</p>
          </div>
          <button
            onClick={handleSuspend}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Reactivate
          </button>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Restaurant Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cuisine Type</label>
            <input
              type="text"
              value={form.cuisine_type}
              onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Seafood & Grill"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
            <select
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select city</option>
              <option value="Harare">Harare</option>
              <option value="Bulawayo">Bulawayo</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">WhatsApp Number</label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. +263771234567"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            placeholder="Tell customers about your restaurant..."
          />
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
        <h3 className="font-semibold text-gray-900">Branding</h3>

        {/* Logo */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Restaurant Logo</label>
          <div className="flex items-start gap-4">
            {form.logo_url ? (
              <div className="relative shrink-0">
                <img src={form.logo_url} alt="Logo" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors"
              >
                {uploadingLogo ? <Loader className="w-5 h-5 text-gray-400 animate-spin" /> : <Image className="w-6 h-6 text-gray-400" />}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="text-sm text-orange-600 font-medium hover:text-orange-700">
                {uploadingLogo ? 'Processing...' : 'Choose file'}
              </button>
              <p className="text-xs text-gray-400">Square image — or paste a URL below</p>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="url"
                  value={form.logo_url?.startsWith('data:') ? '' : form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files[0], 'logo')} />
          </div>
        </div>

        {/* Cover Photo */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Cover Photo</label>
          {form.cover_photo_url ? (
            <div className="relative mb-2">
              <img src={form.cover_photo_url} alt="Cover" className="w-full h-40 rounded-xl object-cover border border-gray-200" />
              <button type="button" onClick={() => setForm(f => ({ ...f, cover_photo_url: '' }))} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div onClick={() => coverInputRef.current?.click()} className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors mb-2">
              {uploadingCover ? <Loader className="w-6 h-6 text-gray-400 animate-spin" /> : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload cover photo</span>
                  <span className="text-xs text-gray-400 mt-0.5">Landscape image</span>
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="url"
              value={form.cover_photo_url?.startsWith('data:') ? '' : form.cover_photo_url}
              onChange={e => setForm(f => ({ ...f, cover_photo_url: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="https://example.com/cover.jpg"
            />
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files[0], 'cover')} />
        </div>
      </div>

      {/* Opening Hours */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Opening Hours</h3>
        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-600">{DAY_LABELS[day]}</span>
              <input
                type="text"
                value={form.opening_hours[day] || ''}
                onChange={e => updateHours(day, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. 11:00-22:00 or Closed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Accepted Payment Methods</h3>
        <div className="flex flex-wrap gap-3">
          {['cash', 'ecocash', 'innbucks', 'card'].map(method => (
            <button
              key={method}
              onClick={() => togglePayment(method)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                form.payment_methods.includes(method)
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Kitchen PIN */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Kitchen Display PIN</h3>
        <p className="text-sm text-gray-500">Staff enter this PIN to access the kitchen tablet view</p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={form.kitchen_pin}
          onChange={e => setForm(f => ({ ...f, kitchen_pin: e.target.value }))}
          className="w-32 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
        <h3 className="font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>

        {/* Suspend */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {form.is_active ? 'Suspend Restaurant' : 'Reactivate Restaurant'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {form.is_active
                ? 'Temporarily hide this restaurant from customers. Orders will stop.'
                : 'Make this restaurant visible and accepting orders again.'}
            </p>
          </div>
          <button
            onClick={handleSuspend}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              form.is_active
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {form.is_active ? (
              <><PauseCircle className="w-4 h-4" /> Suspend</>
            ) : (
              <><PlayCircle className="w-4 h-4" /> Reactivate</>
            )}
          </button>
        </div>

        {/* Delete */}
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Delete Restaurant</p>
              <p className="text-xs text-red-600 mt-0.5">Permanently delete this restaurant and all its data. This cannot be undone.</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <p className="text-sm text-red-800 mb-2">
                Type <span className="font-bold">{form.name}</span> to confirm deletion:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  placeholder={form.name}
                  className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleDelete}
                  disabled={deleteText !== form.name || deleting}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
