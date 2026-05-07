import { useEffect, useMemo, useState } from 'react'
import { Users, Search, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function PlatformCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('customers')
      .select('id, full_name, phone, email, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => { if (!cancelled) setCustomers(data || []) })
      .catch(() => { if (!cancelled) setCustomers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!query) return customers
    const q = query.toLowerCase()
    return customers.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [customers, query])

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/45">
          People
        </p>
        <h1 className="text-3xl font-black text-black tracking-tight mt-1">Customers</h1>
        <p className="text-sm text-black/55 mt-1">
          {customers.length} total — {filtered.length} matching.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, email"
          className="w-full h-12 pl-11 pr-4 bg-white border-2 border-black/10 rounded-2xl text-sm font-medium text-black placeholder-black/40 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-[#F4F4F4] rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/10 p-10 text-center">
          <Users className="w-10 h-10 text-black/25 mx-auto mb-3" />
          <p className="text-sm font-bold text-black">No customers</p>
          <p className="text-xs text-black/45 mt-1">
            {query ? 'Try a different search.' : 'No one has signed up yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/10 overflow-hidden">
          <ul className="divide-y divide-black/5">
            {filtered.map(c => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[.02]">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {(c.full_name || c.phone || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-black truncate">{c.full_name || 'Unnamed'}</p>
                  <p className="text-[11px] text-black/55 font-semibold inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {c.phone || 'No phone'}
                  </p>
                </div>
                <span className="text-[11px] text-black/45 tabular-nums font-medium shrink-0">
                  Joined {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
