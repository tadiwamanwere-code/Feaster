import { useNavigate } from 'react-router-dom'
import { Phone, Truck, Star, LogOut, Award } from 'lucide-react'
import { useDriverAuth } from '../../context/DriverAuthContext'
import { driverLogout } from '../../lib/drivers'

export default function DriverProfile() {
  const navigate = useNavigate()
  const { driver } = useDriverAuth()

  const handleLogout = async () => {
    await driverLogout()
    navigate('/driver/auth', { replace: true })
  }

  if (!driver) return null

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xl font-bold">
          {driver.full_name?.[0] || '?'}
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{driver.full_name}</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Phone className="w-3 h-3" /> {driver.phone}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-2 gap-4">
        <Stat icon={<Star className="text-yellow-500" />} label="Rating" value={Number(driver.rating || 5).toFixed(1)} />
        <Stat icon={<Award className="text-emerald-500" />} label="Deliveries" value={driver.total_deliveries || 0} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Vehicle
        </h3>
        <Row label="Type" value={driver.vehicle_type} />
        <Row label="Make" value={driver.vehicle_make} />
        <Row label="Model" value={driver.vehicle_model} />
        <Row label="Plate" value={driver.vehicle_plate} />
        <Row label="Colour" value={driver.vehicle_color} />
      </div>

      <button
        onClick={() => navigate('/driver/onboarding')}
        className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
      >Edit details / re-upload documents</button>

      <button
        onClick={handleLogout}
        className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">{icon}<span>{label}</span></div>
      <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}
