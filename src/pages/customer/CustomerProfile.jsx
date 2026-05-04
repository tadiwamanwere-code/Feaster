import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, User as UserIcon, LogOut, Plus } from 'lucide-react'
import { useCustomerAuth } from '../../context/CustomerAuthContext'
import { customerLogout, getMyAddresses, addAddress, deleteAddress, updateMyCustomerProfile } from '../../lib/customers'
import AddressPicker from '../../components/AddressPicker'

export default function CustomerProfile() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useCustomerAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: 'Home', line1: '' })
  const [pickedLocation, setPickedLocation] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setEmail(profile.email || '')
    }
  }, [profile])

  useEffect(() => { reload() }, [profile?.id]) // eslint-disable-line

  async function reload() {
    if (!profile) return
    const data = await getMyAddresses().catch(() => [])
    setAddresses(data)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await updateMyCustomerProfile({ full_name: name, email })
      await refreshProfile()
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddAddress = async () => {
    if (!pickedLocation?.lat) return alert('Pick a location on the map')
    if (!newAddr.line1?.trim()) return alert('Enter a street/line')
    setSaving(true)
    try {
      await addAddress({
        label: newAddr.label,
        line1: newAddr.line1,
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
        is_default: addresses.length === 0,
      })
      setShowAdd(false)
      setNewAddr({ label: 'Home', line1: '' })
      setPickedLocation(null)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await customerLogout()
    navigate('/app/auth', { replace: true })
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Phone className="w-4 h-4" /> {profile?.phone}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Full name</label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Email (optional)</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50"
        >Save profile</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Saved addresses</h2>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="text-sm text-black hover:text-black flex items-center gap-1"
          ><Plus className="w-4 h-4" /> Add</button>
        </div>

        {addresses.length === 0 && !showAdd && (
          <p className="text-sm text-gray-500">No addresses saved yet.</p>
        )}

        <ul className="space-y-2">
          {addresses.map(a => (
            <li key={a.id} className="flex items-start justify-between border border-gray-200 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {a.label} {a.is_default && <span className="text-xs text-black ml-1">(default)</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">{a.line1}</p>
              </div>
              <button
                onClick={async () => { await deleteAddress(a.id); reload() }}
                className="text-xs text-red-500 hover:text-red-700"
              >Delete</button>
            </li>
          ))}
        </ul>

        {showAdd && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Label</label>
              <input
                type="text"
                value={newAddr.label}
                onChange={e => setNewAddr({ ...newAddr, label: e.target.value })}
                placeholder="Home / Work / Mom's"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Address details</label>
              <input
                type="text"
                value={newAddr.line1}
                onChange={e => setNewAddr({ ...newAddr, line1: e.target.value })}
                placeholder="House number + street"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <AddressPicker label="Pin location" value={pickedLocation} onChange={setPickedLocation} />
            <button
              onClick={handleAddAddress}
              disabled={saving}
              className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50"
            >Save address</button>
          </div>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  )
}
