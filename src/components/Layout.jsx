import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShoppingBag, Home } from 'lucide-react'
import { useCart } from '../context/CartContext'
import PWAInstallPrompt from './PWAInstallPrompt'

export default function Layout() {
  const { itemCount } = useCart()
  const location = useLocation()

  const isKitchen = location.pathname.startsWith('/kitchen')
  const isAdmin = location.pathname.startsWith('/admin')
  if (isKitchen || isAdmin) return <Outlet />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/explore" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center overflow-hidden">
              <svg width="20" height="20" viewBox="0 0 512 512" fill="none">
                <g stroke="white" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M168 80L168 220Q168 260 198 260L198 432"/>
                  <path d="M128 80L128 200"/>
                  <path d="M208 80L208 200"/>
                  <path d="M314 80L314 260L314 432"/>
                  <path d="M314 80Q372 130 372 220Q372 260 314 260"/>
                </g>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Feaster</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/explore" className="text-gray-600 hover:text-orange-600">
              <Home className="w-5 h-5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto">
        <Outlet />
      </main>

      {/* Cart FAB - shows when items in cart */}
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Cart FAB - shows when items in cart */}
      {itemCount > 0 && !location.pathname.includes('/checkout') && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <Link
            to={`/${location.pathname.split('/')[1]}/checkout`}
            className="flex items-center justify-between w-full max-w-md mx-auto bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-lg hover:bg-orange-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-semibold">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
            </div>
            <span className="font-bold">View Cart</span>
          </Link>
        </div>
      )}
    </div>
  )
}
