import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'

// Layout loads eagerly (small, needed immediately)
import Layout from './components/Layout'

// Loading spinner
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
    </div>
  )
}

// Lazy-loaded pages — each becomes its own chunk
const HomePage = lazy(() => import('./pages/HomePage'))
const RestaurantPage = lazy(() => import('./pages/RestaurantPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'))
const KitchenDisplay = lazy(() => import('./pages/kitchen/KitchenDisplay'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const MenuManagement = lazy(() => import('./pages/admin/MenuManagement'))
const TableManagement = lazy(() => import('./pages/admin/TableManagement'))
const OrderHistory = lazy(() => import('./pages/admin/OrderHistory'))
const PreOrderCalendar = lazy(() => import('./pages/admin/PreOrderCalendar'))
const RestaurantSettings = lazy(() => import('./pages/admin/RestaurantSettings'))
const PlatformLayout = lazy(() => import('./pages/platform/PlatformLayout'))
const PlatformRestaurants = lazy(() => import('./pages/platform/PlatformRestaurants'))
const RestaurantForm = lazy(() => import('./pages/platform/RestaurantForm'))

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Public routes */}
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/:slug" element={<RestaurantPage />} />
                <Route path="/:slug/table/:tableNumber" element={<RestaurantPage />} />
                <Route path="/:slug/checkout" element={<CheckoutPage />} />
                <Route path="/order/:orderId" element={<OrderConfirmationPage />} />
              </Route>

              {/* Kitchen display */}
              <Route path="/kitchen/:slug" element={<KitchenDisplay />} />

              {/* Admin */}
              <Route path="/admin/:slug/login" element={<AdminLogin />} />
              <Route path="/admin/:slug" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="tables" element={<TableManagement />} />
                <Route path="orders" element={<OrderHistory />} />
                <Route path="calendar" element={<PreOrderCalendar />} />
                <Route path="settings" element={<RestaurantSettings />} />
              </Route>

              {/* Platform admin (Feaster creator only) */}
              <Route path="/platform" element={<PlatformLayout />}>
                <Route index element={<PlatformRestaurants />} />
                <Route path="add" element={<RestaurantForm />} />
                <Route path="edit/:id" element={<RestaurantForm />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}
