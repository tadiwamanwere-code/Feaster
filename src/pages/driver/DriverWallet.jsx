import { useEffect, useState } from 'react'
import { Plus, Loader, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useDriverAuth } from '../../context/DriverAuthContext'
import { getWalletTransactions, initiateWalletTopup, subscribeToWallet } from '../../lib/drivers'

const TOPUP_METHODS = [
  { key: 'ecocash', label: 'EcoCash USD' },
  { key: 'innbucks', label: 'InnBucks' },
  { key: 'bank', label: 'Bank transfer' },
  { key: 'cash', label: 'Cash deposit (visit office)' },
]

export default function DriverWallet() {
  const { driver, wallet, refresh } = useDriverAuth()
  const [txns, setTxns] = useState([])
  const [showTopup, setShowTopup] = useState(false)
  const [amount, setAmount] = useState('10')
  const [method, setMethod] = useState('ecocash')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { reload() }, [driver?.id]) // eslint-disable-line

  useEffect(() => {
    if (!driver?.id) return
    const unsub = subscribeToWallet(driver.id, () => {
      refresh()
      reload()
    })
    return () => unsub?.()
  }, [driver?.id]) // eslint-disable-line

  async function reload() {
    if (!driver) return
    const t = await getWalletTransactions(50).catch(() => [])
    setTxns(t)
  }

  const submitTopup = async () => {
    setError(''); setSubmitting(true); setSuccess(false)
    try {
      const amt = parseFloat(amount)
      if (!amt || amt < 1) throw new Error('Minimum $1')
      await initiateWalletTopup({
        amount: amt,
        paymentMethod: method,
        paymentReference: reference || null,
      })
      setSuccess(true)
      setShowTopup(false)
      setReference('')
      await reload()
    } catch (err) {
      setError(err.message || 'Top-up failed')
    }
    setSubmitting(false)
  }

  if (!driver) return null

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl text-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-100 text-sm">
          <WalletIcon className="w-4 h-4" /> Available balance
        </div>
        <div className="text-3xl font-bold mt-1">
          ${Number(wallet?.balance_usd || 0).toFixed(2)}
        </div>
        {wallet && Number(wallet.balance_usd) < Number(wallet.min_balance_required) && (
          <p className="text-xs text-emerald-100 mt-1">
            Top up to ${Number(wallet.min_balance_required).toFixed(2)} to keep receiving jobs.
          </p>
        )}
        <button
          onClick={() => setShowTopup(s => !s)}
          className="mt-3 w-full bg-white text-emerald-700 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-emerald-50"
        >
          <Plus className="w-4 h-4" /> Top up
        </button>
      </div>

      {success && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">
          Top-up request submitted. Once payment is confirmed, your balance will update automatically.
        </div>
      )}

      {showTopup && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Top up wallet</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (USD)</label>
            <input
              type="number"
              step="0.50"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Method</label>
            <div className="grid grid-cols-2 gap-2">
              {TOPUP_METHODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    method === m.key
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >{m.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Payment reference (optional)</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. EcoCash transaction ID"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={submitTopup}
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />}
            Submit top-up
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Transactions</h2>
        {txns.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No transactions yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {txns.map(t => {
              const positive = Number(t.amount_usd) > 0
              return (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {positive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {t.kind.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(t.created_at).toLocaleString()}
                      {t.status !== 'completed' && (
                        <span className="ml-2 text-yellow-600 capitalize">· {t.status}</span>
                      )}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${positive ? 'text-emerald-700' : 'text-red-700'}`}>
                    {positive ? '+' : ''}${Number(t.amount_usd).toFixed(2)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
