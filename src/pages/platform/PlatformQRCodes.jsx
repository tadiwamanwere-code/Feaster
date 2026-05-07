import { useEffect, useState } from 'react'
import { Building2, QrCode, Search } from 'lucide-react'
import { getRestaurants } from '../../lib/services'
import QRCodesModal from '../../components/QRCodesModal'

export default function PlatformQRCodes() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    getRestaurants({ activeOnly: false })
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = query
    ? restaurants.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        (r.slug || '').toLowerCase().includes(query.toLowerCase()) ||
        (r.city || '').toLowerCase().includes(query.toLowerCase())
      )
    : restaurants

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/45">
          QR Codes
        </p>
        <h1 className="text-3xl font-black text-black tracking-tight mt-1">Generate & print</h1>
        <p className="text-sm text-black/55 mt-1 max-w-xl">
          Pick a restaurant to view its restaurant QR + per-table QR codes. Each QR opens the
          customer ordering flow at the right table.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search restaurants…"
          className="w-full h-12 pl-11 pr-4 bg-white border-2 border-black/10 rounded-2xl text-sm font-medium text-black placeholder-black/40 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Restaurant grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-[#F4F4F4] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/10 p-10 text-center">
          <Building2 className="w-10 h-10 text-black/25 mx-auto mb-3" />
          <p className="text-sm font-bold text-black">No restaurants found</p>
          <p className="text-xs text-black/45 mt-1">
            {query ? 'Try a different search.' : 'Add a restaurant first.'}
          </p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <li key={r.id}>
              <button
                onClick={() => setOpen(r)}
                className="group w-full flex items-center gap-3 bg-white rounded-2xl border border-black/10 hover:border-black hover:-translate-y-0.5 transition-all p-4 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F4F4F4] overflow-hidden shrink-0">
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-extrabold text-black">
                      {r.name?.[0] || 'R'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-black truncate">{r.name}</p>
                  <p className="text-[11px] text-black/55 font-semibold truncate">
                    {r.cuisine_type} · {r.city || 'No city'}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 h-7 bg-black text-white rounded-full text-[11px] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">
                  <QrCode className="w-3 h-3" /> Open
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <QRCodesModal restaurant={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
