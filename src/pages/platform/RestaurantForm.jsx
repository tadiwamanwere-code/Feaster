import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X, Save, Image, Loader, Link2 } from 'lucide-react'
import { getRestaurants, addRestaurant, updateRestaurant } from '../../lib/services'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  cuisine_type: '',
  city: 'Harare',
  whatsapp_number: '',
  logo_url: '',
  cover_photo_url: '',
  opening_hours: { mon: '11:00-22:00', tue: '11:00-22:00', wed: '11:00-22:00', thu: '11:00-22:00', fri: '11:00-23:00', sat: '11:00-23:00', sun: '12:00-21:00' },
  payment_methods: ['cash', 'ecocash'],
  subscription_tier: 'pro',
  kitchen_pin: '1234',
  rating: null,
}

export default function RestaurantForm() {
  const { id } = useParams() // undefined for new, set for edit
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const logoInputRef = useRef()
  const coverInputRef = useRef()

  const isEdit = !!id

  // Load existing restaurant for editing
  useEffect(() => {
    if (!id) return
    getRestaurants().then(all => {
      const rest = all.find(r => r.id === id)
      if (rest) {
        setForm({
          name: rest.name || '',
          slug: rest.slug || '',
          description: rest.description || '',
          cuisine_type: rest.cuisine_type || '',
          city: rest.city || 'Harare',
          whatsapp_number: rest.whatsapp_number || '',
          logo_url: rest.logo_url || '',
          cover_photo_url: rest.cover_photo_url || '',
          opening_hours: rest.opening_hours || EMPTY_FORM.opening_hours,
          payment_methods: rest.payment_methods || ['cash'],
          subscription_tier: rest.subscription_tier || 'pro',
          kitchen_pin: rest.kitchen_pin || '1234',
          rating: rest.rating || null,
        })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    setForm(f => ({
      ...f,
      name,
      slug: isEdit ? f.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }))
  }

  const handleImageUpload = (file, type) => {
    if (!file) return
    const maxSize = 2 * 1024 * 1024 // 2MB for data URLs
    if (file.size > maxSize) {
      setError('Image must be under 2MB. Compress it or use a URL instead.')
      return
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover
    setUploading(true)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      setForm(f => ({
        ...f,
        [type === 'logo' ? 'logo_url' : 'cover_photo_url']: e.target.result,
      }))
      setUploading(false)
    }
    reader.onerror = () => {
      setError('Failed to read image file')
      setUploading(false)
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Restaurant name is required'); return }
    if (!form.slug.trim()) { setError('URL slug is required'); return }
    if (!form.cuisine_type.trim()) { setError('Cuisine type is required'); return }

    setSaving(true)
    try {
      const data = { ...form, name: form.name.trim(), slug: form.slug.trim() }
      if (isEdit) {
        await updateRestaurant(id, data)
      } else {
        await addRestaurant(data)
      }
      navigate('/platform')
    } catch (err) {
      console.error('Save failed:', err)
      setError('Failed to save. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/platform')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Restaurant' : 'Add New Restaurant'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Restaurant Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. Fishmonger"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">URL Slug *</label>
              <div className="flex items-center">
                <span className="text-sm text-gray-400 mr-1">feaster.vercel.app/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="fishmonger"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Cuisine Type *</label>
              <input
                type="text"
                value={form.cuisine_type}
                onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. Seafood & Grill"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
              <select
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
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
                placeholder="+263771234567"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Subscription Tier</label>
              <select
                value={form.subscription_tier}
                onChange={e => setForm(f => ({ ...f, subscription_tier: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="lite">Lite</option>
                <option value="pro">Pro ($49/mo)</option>
                <option value="enterprise">Enterprise ($199/mo)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Tell customers about this restaurant..."
            />
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <h2 className="font-semibold text-gray-900">Images</h2>

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
                <p className="text-xs text-gray-400">Square, under 2MB — or paste a URL below</p>
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
                    <span className="text-xs text-gray-400 mt-0.5">Landscape, under 2MB</span>
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
          <h2 className="font-semibold text-gray-900">Opening Hours</h2>
          <div className="space-y-2">
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

        {/* Payment & PIN */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Payment & Access</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Accepted Payment Methods</label>
            <div className="flex flex-wrap gap-2">
              {['cash', 'ecocash', 'innbucks', 'card'].map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => togglePayment(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                    form.payment_methods.includes(m)
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Kitchen Display PIN</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.kitchen_pin}
              onChange={e => setForm(f => ({ ...f, kitchen_pin: e.target.value }))}
              className="w-32 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">Staff enter this PIN to access the kitchen tablet</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/platform')}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Restaurant'}
          </button>
        </div>
      </form>
    </div>
  )
}
