import { useEffect, useState } from 'react'
import { X, Download, Printer, QrCode, Loader, Store, UtensilsCrossed } from 'lucide-react'
import QRCode from 'qrcode'
import { getTables } from '../lib/services'
import { buildQRPrintHTML, downloadQRImage } from '../lib/qr-print'

export default function QRCodesModal({ restaurant, onClose }) {
  const [tables, setTables] = useState([])
  const [qrCodes, setQrCodes] = useState({})
  const [restaurantQR, setRestaurantQR] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('restaurant')

  const baseUrl = window.location.origin

  useEffect(() => {
    async function load() {
      try {
        const t = await getTables(restaurant.id)
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

  // Generate restaurant QR
  useEffect(() => {
    async function gen() {
      const url = `${baseUrl}/${restaurant.slug}`
      try {
        const qr = await QRCode.toDataURL(url, {
          width: 400, margin: 2,
          color: { dark: '#1f2937', light: '#ffffff' },
        })
        setRestaurantQR(qr)
      } catch {}
    }
    gen()
  }, [restaurant.slug, baseUrl])

  // Generate table QRs
  useEffect(() => {
    async function generateQRs() {
      const codes = {}
      for (const table of tables) {
        const url = `${baseUrl}/${restaurant.slug}/table/${table.table_number}`
        try {
          codes[table.id] = await QRCode.toDataURL(url, {
            width: 400, margin: 2,
            color: { dark: '#1f2937', light: '#ffffff' },
          })
        } catch {}
      }
      setQrCodes(codes)
    }
    if (tables.length > 0) generateQRs()
  }, [tables, restaurant.slug, baseUrl])

  const printRestaurantQR = () => {
    const html = buildQRPrintHTML({
      restaurantName: restaurant.name,
      type: 'restaurant',
      items: [{ qrDataUrl: restaurantQR, label: restaurant.name, sublabel: 'Scan to view menu & order', url: `${baseUrl}/${restaurant.slug}` }],
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
      url: `${baseUrl}/${restaurant.slug}/table/${t.table_number}`,
    }))
    const html = buildQRPrintHTML({
      restaurantName: restaurant.name,
      type: 'table',
      items,
    })
    const pw = window.open('', '_blank')
    pw.document.write(html)
    pw.document.close()
    pw.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">QR Codes — {restaurant.name}</h2>
            <p className="text-sm text-gray-500">Generate, download and print QR codes</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('restaurant')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'restaurant'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Store className="w-4 h-4" />
            Restaurant QR
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tables'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Dine-In Table QR ({tables.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : activeTab === 'restaurant' ? (
            /* ─── Restaurant QR ─── */
            <div className="max-w-md mx-auto text-center">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-8">
                <div className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-4">
                  <Store className="w-3 h-3" />
                  RESTAURANT
                </div>
                {restaurantQR ? (
                  <img src={restaurantQR} alt="Restaurant QR" className="w-52 h-52 mx-auto rounded-xl shadow-sm" />
                ) : (
                  <div className="w-52 h-52 mx-auto flex items-center justify-center bg-white rounded-xl">
                    <QrCode className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mt-4">{restaurant.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Scan to view menu & order</p>
                <p className="text-xs text-gray-400 font-mono mt-2">{baseUrl}/{restaurant.slug}</p>

                <div className="flex gap-3 mt-6 justify-center">
                  <button
                    onClick={() => downloadQRImage(restaurantQR, `${restaurant.slug}-restaurant-qr.png`)}
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
              <p className="text-xs text-gray-400 mt-4">
                Use this QR code on flyers, posters, social media, or at the entrance.
                Customers scan it to view your full menu and place orders.
              </p>
            </div>
          ) : (
            /* ─── Table QR Codes ─── */
            <div>
              {tables.length === 0 ? (
                <div className="text-center py-16">
                  <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No tables set up</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Edit this restaurant and set the number of tables to generate QR codes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">
                      {tables.length} table{tables.length !== 1 ? 's' : ''} — each QR activates dine-in mode with the table number
                    </p>
                    <button
                      onClick={printTableQRs}
                      className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800"
                    >
                      <Printer className="w-4 h-4" />
                      Print All (4 per A4)
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tables.map(table => (
                      <div key={table.id} className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-100 overflow-hidden">
                        <div className="p-3 flex justify-center">
                          {qrCodes[table.id] ? (
                            <img src={qrCodes[table.id]} alt={`Table ${table.table_number}`} className="w-28 h-28 rounded-lg" />
                          ) : (
                            <div className="w-28 h-28 flex items-center justify-center">
                              <QrCode className="w-10 h-10 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="px-3 pb-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1">
                            DINE IN
                          </div>
                          <p className="font-bold text-gray-900 text-sm">Table {table.table_number}</p>
                          <button
                            onClick={() => downloadQRImage(qrCodes[table.id], `${restaurant.slug}-table-${table.table_number}-qr.png`)}
                            className="mt-2 flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
