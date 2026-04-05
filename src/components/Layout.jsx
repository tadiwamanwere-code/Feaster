import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShoppingBag, Home, UtensilsCrossed } from 'lucide-react'
import { useCart } from '../context/CartContext'

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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Feaster</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-orange-600">
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
