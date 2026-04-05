import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Download, Printer, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { getRestaurantBySlug, getTables, addTable, deleteTable } from '../../lib/services'

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
  const printRef = useRef()

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
          setRestaurant({ id: 'demo', slug })
          setTables(DEMO_TABLES)
        }
      } catch {
        setRestaurant({ id: 'demo', slug })
        setTables(DEMO_TABLES)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Generate QR codes for all tables
  useEffect(() => {
    async function generateQRs() {
      const codes = {}
      for (const table of tables) {
        const url = `${baseUrl}/${slug}/table/${table.table_number}`
        try {
          codes[table.id] = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: { dark: '#1f2937', light: '#ffffff' },
          })
        } catch {}
      }
      setQrCodes(codes)
    }
    if (tables.length > 0) generateQRs()
  }, [tables, slug, baseUrl])

  const handleAddTable = async () => {
    if (!newTableNumber.trim()) return
    const data = {
      table_number: newTableNumber.trim(),
      restaurant_id: restaurant.id,
    }
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

  const downloadQR = (table) => {
    const qr = qrCodes[table.id]
    if (!qr) return
    const link = document.createElement('a')
    link.download = `${slug}-table-${table.table_number}-qr.png`
    link.href = qr
    link.click()
  }

  const printAllQR = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
      <head>
        <title>Feaster QR Codes — ${slug}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .card { text-align: center; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; break-inside: avoid; }
          .card img { width: 200px; height: 200px; }
          .card h3 { margin: 8px 0 4px; font-size: 18px; }
          .card p { font-size: 12px; color: #6b7280; margin: 0; }
          @media print { .grid { grid-template-columns: repeat(3, 1fr); } }
        </style>
      </head>
      <body>
        <h1 style="margin-bottom: 20px;">Feaster — ${slug} — Table QR Codes</h1>
        <div class="grid">
          ${tables.map(t => `
            <div class="card">
              <img src="${qrCodes[t.id] || ''}" alt="QR" />
              <h3>Table ${t.table_number}</h3>
              <p>Scan to order</p>
              <p>${baseUrl}/${slug}/table/${t.table_number}</p>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tables & QR Codes</h2>
          <p className="text-sm text-gray-500">{tables.length} tables configured</p>
        </div>
        <button
          onClick={printAllQR}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print All QR Codes
        </button>
      </div>

      {/* Add table */}
      <div className="flex gap-3">
        <input
          type="text"
          value={newTableNumber}
          onChange={e => setNewTableNumber(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddTable()}
          placeholder="Table number (e.g. 7, A3, Bar 1)"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={handleAddTable}
          disabled={!newTableNumber.trim()}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* QR Code */}
            <div className="p-4 flex justify-center bg-gray-50">
              {qrCodes[table.id] ? (
                <img src={qrCodes[table.id]} alt={`Table ${table.table_number} QR`} className="w-40 h-40" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900">Table {table.table_number}</h3>
              <p className="text-xs text-gray-400 mt-1 truncate">
                {baseUrl}/{slug}/table/{table.table_number}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => downloadQR(table)}
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
  )
}
