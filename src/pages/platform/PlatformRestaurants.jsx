import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ExternalLink, ChefHat, MapPin, Eye, EyeOff, QrCode, Building2 } from 'lucide-react'
import { getRestaurants, updateRestaurant, deleteRestaurant } from '../../lib/services'
import QRCodesModal from '../../components/QRCodesModal'

export default function PlatformRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrRestaurant, setQrRestaurant] = useState(null)

  useEffect(() => {
    getRestaurants({ activeOnly: false })
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
  }, [])

  const handleToggleActive = async (rest) => {
    try {
      await updateRestaurant(rest.id, { is_active: !rest.is_active })
      setRestaurants(prev => prev.map(r => r.id === rest.id ? { ...r, is_active: !r.is_active } : r))
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  const handleDelete = async (rest) => {
    if (!confirm(`Delete "${rest.name}"? This cannot be undone.`)) return
    try {
      await deleteRestaurant(rest.id)
      setRestaurants(prev => prev.filter(r => r.id !== rest.id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Restaurants</h1>
          <p className="text-sm text-gray-500">{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} on the platform</p>
        </div>
        <Link
          to="/platform/add"
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Restaurant
        </Link>
      </div>

      {/* Restaurant cards */}
      <div className="grid gap-4">
        {restaurants.map(rest => (
          <div key={rest.id} className={`bg-white rounded-xl border border-gray-100 overflow-hidden ${!rest.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-stretch">
              {/* Cover/Logo */}
              <div className="w-32 sm:w-48 shrink-0 bg-gradient-to-br from-orange-400 to-orange-600 relative">
                {rest.cover_photo_url ? (
                  <img src={rest.cover_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-white/30">{rest.name[0]}</span>
                  </div>
                )}
                {rest.logo_url && (
                  <img src={rest.logo_url} alt="" className="absolute bottom-2 left-2 w-10 h-10 rounded-lg border-2 border-white object-cover" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 text-lg">{rest.name}</h2>
                    <p className="text-sm text-gray-500">{rest.cuisine_type}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {rest.city}
                      </span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full font-mono">/{rest.slug}</span>
                      <span className={`px-2 py-0.5 rounded-full ${rest.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {rest.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {rest.subscription_tier && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full capitalize">{rest.subscription_tier}</span>
                      )}
                    </div>
                    {rest.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-1">{rest.description}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    to={`/platform/edit/${rest.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <Link
                    to={`/admin/${rest.slug}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                  <button
                    onClick={() => setQrRestaurant(rest)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-100"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR Codes
                  </button>
                  <a
                    href={`/${rest.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Menu
                  </a>
                  <button
                    onClick={() => handleToggleActive(rest)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    {rest.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {rest.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(rest)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg text-xs font-medium text-red-600 hover:bg-red-100 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {restaurants.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No restaurants yet</p>
            <Link to="/platform/add" className="text-orange-600 font-medium text-sm mt-1 inline-block">
              Add your first restaurant
            </Link>
          </div>
        )}
      </div>

      {/* QR Codes Modal */}
      {qrRestaurant && (
        <QRCodesModal restaurant={qrRestaurant} onClose={() => setQrRestaurant(null)} />
      )}
    </div>
  )
}
