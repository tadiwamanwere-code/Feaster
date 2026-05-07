import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Download, Printer, QrCode, Store, UtensilsCrossed } from 'lucide-react'
import QRCode from 'qrcode'
import { getRestaurantBySlug, getTables, addTable, deleteTable } from '../../lib/services'
import { buildQRPrintHTML, downloadQRImage } from '../../lib/qr-print'

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
          setTables(t)
        }
      } catch (err) {
        console.error('Failed to load tables:', err)
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
        setTables(prev => [...prev, { ...data, is_active: true }])
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
        <p className="text-sm text-black/45">Two types of QR code for your restaurant</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'restaurant' ? 'bg-white text-black shadow-sm' : 'text-black/45 hover:text-black/25'
          }`}
        >
          <Store className="w-4 h-4" />
          Restaurant QR
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'tables' ? 'bg-white text-blue-600 shadow-sm' : 'text-black/45 hover:text-black/25'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Dine-In Tables ({tables.length})
        </button>
      </div>

      {activeTab === 'restaurant' ? (
        /* ─── Restaurant QR Code ─── */
        <div className="max-w-md">
          <div className="bg-gradient-to-br from-white to-white rounded-2xl border border-black/10 p-8 text-center">
            <div className="inline-flex items-center gap-1.5 bg-black text-black px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4">
              <Store className="w-3 h-3" />
              RESTAURANT
            </div>
            {restaurantQR ? (
              <img src={restaurantQR} alt="Restaurant QR" className="w-48 h-48 mx-auto rounded-xl shadow-sm" />
            ) : (
              <div className="w-48 h-48 mx-auto flex items-center justify-center bg-white rounded-xl">
                <QrCode className="w-16 h-16 text-black/80" />
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-900 mt-4">{restaurant?.name}</h3>
            <p className="text-sm text-black/45 mt-1">Scan to view menu & order</p>
            <p className="text-xs text-black/55 font-mono mt-2">{baseUrl}/{slug}</p>

            <div className="flex gap-3 mt-6 justify-center">
              <button
                onClick={() => downloadQRImage(restaurantQR, `${slug}-restaurant-qr.png`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-medium text-black/25 hover:bg-white"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={printRestaurantQR}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-[#F4F4F4]"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
          <p className="text-xs text-black/55 mt-3">
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
                className="flex-1 px-4 py-2.5 border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTable}
                disabled={!newTableNumber.trim()}
                className="flex items-center gap-2 bg-blue-600 text-black px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <button
              onClick={printTableQRs}
              className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#F4F4F4] transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print All (4 per A4)
            </button>
          </div>

          {/* Tables grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => (
              <div key={table.id} className="bg-white rounded-xl border border-black/8 overflow-hidden">
                <div className="p-4 flex justify-center bg-gradient-to-br from-blue-50 to-white">
                  {qrCodes[table.id] ? (
                    <img src={qrCodes[table.id]} alt={`Table ${table.table_number} QR`} className="w-36 h-36 rounded-lg" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-black/80" />
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-black/8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 bg-black/10 text-black px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                      DINE IN
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900">Table {table.table_number}</h3>
                  <p className="text-xs text-black/55 mt-0.5 truncate">
                    /{slug}/table/{table.table_number}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => downloadQRImage(qrCodes[table.id], `${slug}-table-${table.table_number}-qr.png`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-black/35 hover:bg-gray-200"
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
