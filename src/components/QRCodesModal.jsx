import { useEffect, useState } from 'react'
import { X, Download, Printer, QrCode, Loader } from 'lucide-react'
import QRCode from 'qrcode'
import { getTables } from '../lib/services'

export default function QRCodesModal({ restaurant, onClose }) {
  const [tables, setTables] = useState([])
  const [qrCodes, setQrCodes] = useState({})
  const [loading, setLoading] = useState(true)

  const baseUrl = window.location.origin

  useEffect(() => {
    async function load() {
      try {
        const t = await getTables(restaurant.id)
        // Sort numerically where possible
        t.sort((a, b) => {
          const na = parseInt(a.table_number, 10)
          const nb = parseInt(b.table_number, 10)
          if (!isNaN(na) && !isNaN(nb)) return na - nb
          return a.table_number.localeCompare(b.table_number)
        })
        setTables(t)
      } catch {
        setTables([])
      }
      setLoading(false)
    }
    load()
  }, [restaurant.id])

  useEffect(() => {
    async function generateQRs() {
      const codes = {}
      for (const table of tables) {
        const url = `${baseUrl}/${restaurant.slug}/table/${table.table_number}`
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
  }, [tables, restaurant.slug, baseUrl])

  const downloadQR = (table) => {
    const qr = qrCodes[table.id]
    if (!qr) return
    const link = document.createElement('a')
    link.download = `${restaurant.slug}-table-${table.table_number}-qr.png`
    link.href = qr
    link.click()
  }

  const printAllQR = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
      <head>
        <title>Feaster QR Codes — ${restaurant.name}</title>
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
        <h1 style="margin-bottom: 20px;">Feaster — ${restaurant.name} — Table QR Codes</h1>
        <div class="grid">
          ${tables.map(t => `
            <div class="card">
              <img src="${qrCodes[t.id] || ''}" alt="QR" />
              <h3>Table ${t.table_number}</h3>
              <p>Scan to order</p>
              <p>${baseUrl}/${restaurant.slug}/table/${t.table_number}</p>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">QR Codes — {restaurant.name}</h2>
            <p className="text-sm text-gray-500">{tables.length} table{tables.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {tables.length > 0 && (
              <button
                onClick={printAllQR}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print All
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-16">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tables set up</p>
              <p className="text-sm text-gray-400 mt-1">
                Edit this restaurant and set the number of tables to generate QR codes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map(table => (
                <div key={table.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="p-3 flex justify-center">
                    {qrCodes[table.id] ? (
                      <img src={qrCodes[table.id]} alt={`Table ${table.table_number} QR`} className="w-32 h-32" />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="px-3 pb-3 text-center">
                    <p className="font-semibold text-gray-900 text-sm">Table {table.table_number}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                      /{restaurant.slug}/table/{table.table_number}
                    </p>
                    <button
                      onClick={() => downloadQR(table)}
                      className="mt-2 flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
