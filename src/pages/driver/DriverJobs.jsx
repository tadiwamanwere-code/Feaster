import { useEffect, useState } from 'react'
import { Loader, MapPin, Bike, AlertCircle } from 'lucide-react'
import { useDriverAuth } from '../../context/DriverAuthContext'
import {
  getOpenDeliveries,
  makeOffer,
  subscribeToOpenDeliveries,
  haversineKm,
} from '../../lib/deliveries'
import { supabase } from '../../lib/supabase'

export default function DriverJobs() {
  const { driver, wallet } = useDriverAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDelivery, setActiveDelivery] = useState(null)

  useEffect(() => {
    if (!driver) return
    let cancelled = false

    async function loadJobs() {
      const list = await getOpenDeliveries({
        lat: driver.current_lat ? Number(driver.current_lat) : null,
        lng: driver.current_lng ? Number(driver.current_lng) : null,
        radiusKm: 15,
      })
      if (!cancelled) setJobs(list)
    }

    async function loadActive() {
      const { data } = await supabase
        .from('deliveries')
        .select('*, restaurants(name)')
        .eq('driver_id', driver.id)
        .in('status', ['awaiting_pickup', 'picked_up', 'in_transit', 'arrived'])
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) setActiveDelivery(data || null)
    }

    Promise.all([loadJobs(), loadActive()]).finally(() => {
      if (!cancelled) setLoading(false)
    })

    const unsub = subscribeToOpenDeliveries(loadJobs)
    return () => { cancelled = true; unsub?.() }
  }, [driver])

  if (!driver) return null

  // Driver must be online + wallet topped up to take jobs
  if (!driver.is_online) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          You're <strong>offline</strong>. Toggle online from the top bar to start receiving jobs.
        </div>
      </div>
    )
  }

  if (wallet && Number(wallet.balance_usd) < Number(wallet.min_balance_required)) {
    return (
      <div className="p-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
          <p className="font-semibold mb-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Top up to keep working
          </p>
          <p>
            You need at least <strong>${Number(wallet.min_balance_required).toFixed(2)}</strong> in your wallet to take new jobs.
            Current balance: <strong>${Number(wallet.balance_usd).toFixed(2)}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {activeDelivery && <ActiveJobCard delivery={activeDelivery} />}

      <h1 className="text-xl font-bold text-gray-900">Available jobs</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm">Watching for new jobs nearby…</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map(j => <JobCard key={j.id} job={j} driver={driver} />)}
        </ul>
      )}
    </div>
  )
}

function ActiveJobCard({ delivery }) {
  return (
    <a
      href={`/driver/delivery/${delivery.id}`}
      className="block bg-emerald-600 text-white rounded-xl p-4"
    >
      <p className="text-xs uppercase tracking-wide opacity-80">Active job</p>
      <p className="font-semibold mt-1">{delivery.restaurants?.name}</p>
      <p className="text-sm opacity-90 capitalize">
        Status: {delivery.status.replace(/_/g, ' ')}
      </p>
      <p className="mt-2 text-xs underline">Open job →</p>
    </a>
  )
}

function JobCard({ job, driver }) {
  const [offerAmount, setOfferAmount] = useState(Number(job.driver_earnings_usd).toFixed(2))
  const [eta, setEta] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const distFromDriver = driver.current_lat
    ? haversineKm(Number(driver.current_lat), Number(driver.current_lng), Number(job.pickup_lat), Number(job.pickup_lng))
    : null

  const submitOffer = async () => {
    setSubmitting(true)
    try {
      await makeOffer({
        deliveryId: job.id,
        offerAmountUsd: parseFloat(offerAmount),
        etaMinutes: parseInt(eta) || null,
      })
      setSubmitted(true)
    } catch (err) {
      alert(err.message)
    }
    setSubmitting(false)
  }

  return (
    <li className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{job.restaurants?.name}</p>
          <p className="text-xs text-gray-500">{job.distance_km} km · ${Number(job.total_fee_usd).toFixed(2)} fare</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">You earn (suggested)</p>
          <p className="font-bold text-emerald-700">${Number(job.driver_earnings_usd).toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-600">
        <p className="flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> <span className="line-clamp-1">{job.pickup_address}</span></p>
        <p className="flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" /> <span className="line-clamp-1">{job.dropoff_address}</span></p>
        {distFromDriver != null && (
          <p className="flex items-center gap-1"><Bike className="w-3.5 h-3.5 text-gray-400" /> ~{distFromDriver} km from you</p>
        )}
      </div>

      {submitted ? (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg p-2 text-center">
          Offer sent · waiting for customer
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Your offer ($)</label>
            <input
              type="number"
              step="0.50"
              min="0.50"
              value={offerAmount}
              onChange={e => setOfferAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="w-24">
            <label className="text-xs text-gray-500">ETA (min)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={eta}
              onChange={e => setEta(e.target.value)}
              placeholder="—"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={submitOffer}
            disabled={submitting}
            className="self-end px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? '…' : 'Offer'}
          </button>
        </div>
      )}
    </li>
  )
}
