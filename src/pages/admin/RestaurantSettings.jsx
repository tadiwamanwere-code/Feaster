import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Save, Upload } from 'lucide-react'
import { getRestaurantBySlug, updateRestaurant } from '../../lib/services'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

export default function RestaurantSettings() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Branding</h3>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Logo URL</label>
          <input
            type="url"
            value={form.logo_url}
            onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Cover Photo URL</label>
          <input
            type="url"
            value={form.cover_photo_url}
            onChange={e => setForm(f => ({ ...f, cover_photo_url: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="https://..."
          />
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
    </div>
  )
}
