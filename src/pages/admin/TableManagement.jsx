import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Download, Printer, QrCode, Store, UtensilsCrossed } from 'lucide-react'
import QRCode from 'qrcode'
import { getRestaurantBySlug, getTables, addTable, deleteTable } from '../../lib/services'
import { buildQRPrintHTML, downloadQRImage } from '../../lib/qr-print'

const DEMO_TABLES = [
  { id: 't1', table_number: '1', is_active: true },
  { id: 't2', table_number: '2', is_active: true },
  { id: 't3', table_number: '3', is_active: true },
  { id: 't4', table_number: '4', is_active: true },
  { id: 't5', table_number: '5', is_active: true },
  { id: 't6', table_number: 'Bar 1', is_active: true },
]

export default function TableManagement() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [qrCodes, setQrCodes] = useState({})
  const [restaurantQR, setRestaurantQR] = useState(null)
  const [activeTab, setActiveTab] = useState('tables')

  const baseUrl = window.location.origin

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          setRestaurant(rest)
          const t = await getTables(rest.id)
          setTables(t.length > 0 ? t : DEMO_TABLES)
        } else {
          setRestaurant({ id: 'demo', slug, name: slug.charAt(0).toUpperCase() + slug.slice(1) })
          setTables(DEMO_TABLES)
        }
      } catch {
        setRestaurant({ id: 'demo', slug, name: slug.charAt(0).toUpperCase() + slug.slice(1) })
        setTables(DEMO_TABLES)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Generate restaurant QR
  useEffect(() => {
    async function gen() {
      const url = `${baseUrl}/${slug}`
      try {
        setRestaurantQR(await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#1f2937', light: '#ffffff' } }))
      } catch {}
    }
    gen()
  }, [slug, baseUrl])

  // Generate table QR codes
  useEffect(() => {
    async function generateQRs() {
      const codes = {}
      for (const table of tables) {
        const url = `${baseUrl}/${slug}/table/${table.table_number}`
        try {
          codes[table.id] = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#1f2937', light: '#ffffff' } })
        } catch {}
      }
      setQrCodes(codes)
    }
    if (tables.length > 0) generateQRs()
  }, [tables, slug, baseUrl])

  const handleAddTable = async () => {
    if (!newTableNumber.trim()) return
    const data = { table_number: newTableNumber.trim(), restaurant_id: restaurant.id }
    try {
      if (restaurant.id === 'demo') {
        setTables(prev => [...prev, { ...data, id: 'new-' + Date.now(), is_active: true }])
      } else {
        const docRef = await addTable(data)
        setTables(prev => [...prev, { ...data, id: docRef.id, is_active: true }])
      }
    } catch {
      setTables(prev => [...prev, { ...data, id: 'new-' + Date.now(), is_active: true }])
    }
    setNewTableNumber('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this table?')) return
    try {
      if (!id.startsWith('t') && !id.startsWith('new')) {
        await deleteTable(id)
      }
    } catch {}
    setTables(prev => prev.filter(t => t.id !== id))
  }

  const printRestaurantQR = () => {
    const html = buildQRPrintHTML({
      restaurantName: restaurant?.name || slug,
      type: 'restaurant',
      items: [{ qrDataUrl: restaurantQR, label: restaurant?.name || slug, sublabel: 'Scan to view menu & order', url: `${baseUrl}/${slug}` }],
    })
    const pw = window.open('', '_blank')
    pw.document.write(html)
    pw.document.close()
    pw.print()
  }

  const printTableQRs = () => {
    const items = tables.map(t => ({
      qrDataUrl: qrCodes[t.id],
      label: `Table ${t.table_number}`,
      sublabel: 'Scan to order — Dine In',
      url: `${baseUrl}/${slug}/table/${t.table_number}`,
    }))
    const html = buildQRPrintHTML({
      restaurantName: restaurant?.name || slug,
      type: 'table',
      items,
    })
    const pw = window.open('', '_blank')
    pw.document.write(html)
    pw.document.close()
    pw.print()
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">QR Codes & Tables</h2>
        <p className="text-sm text-gray-500">Two types of QR code for your restaurant</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'restaurant' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Restaurant QR
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'tables' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Dine-In Tables ({tables.length})
        </button>
      </div>

      {activeTab === 'restaurant' ? (
        /* ─── Restaurant QR Code ─── */
        <div className="max-w-md">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-8 text-center">
            <div className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4">
              <Store className="w-3 h-3" />
              RESTAURANT
            </div>
            {restaurantQR ? (
              <img src={restaurantQR} alt="Restaurant QR" className="w-48 h-48 mx-auto rounded-xl shadow-sm" />
            ) : (
              <div className="w-48 h-48 mx-auto flex items-center justify-center bg-white rounded-xl">
                <QrCode className="w-16 h-16 text-gray-300" />
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-900 mt-4">{restaurant?.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Scan to view menu & order</p>
            <p className="text-xs text-gray-400 font-mono mt-2">{baseUrl}/{slug}</p>

            <div className="flex gap-3 mt-6 justify-center">
              <button
                onClick={() => downloadQRImage(restaurantQR, `${slug}-restaurant-qr.png`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={printRestaurantQR}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Use this QR on flyers, posters, social media, or at the entrance. Customers scan to browse your full menu and place orders.
          </p>
        </div>
      ) : (
        /* ─── Table Dine-In QR Codes ─── */
        <div className="space-y-4">
          {/* Add table + Print */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-3 flex-1">
              <input
                type="text"
                value={newTableNumber}
                onChange={e => setNewTableNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTable()}
                placeholder="Table number (e.g. 7, A3, Bar 1)"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTable}
                disabled={!newTableNumber.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <button
              onClick={printTableQRs}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print All (4 per A4)
            </button>
          </div>

          {/* Tables grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => (
              <div key={table.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 flex justify-center bg-gradient-to-br from-blue-50 to-slate-50">
                  {qrCodes[table.id] ? (
                    <img src={qrCodes[table.id]} alt={`Table ${table.table_number} QR`} className="w-36 h-36 rounded-lg" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                      DINE IN
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900">Table {table.table_number}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    /{slug}/table/{table.table_number}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => downloadQRImage(qrCodes[table.id], `${slug}-table-${table.table_number}-qr.png`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(table.id)}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 rounded-lg text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
