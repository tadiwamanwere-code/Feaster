import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'

import Layout from './components/Layout'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
    </div>
  )
}

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/LandingPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const RestaurantPage = lazy(() => import('./pages/RestaurantPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'))
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'))
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
const SystemLogin = lazy(() => import('./pages/pos/SystemLogin'))
const POSDashboard = lazy(() => import('./pages/pos/POSDashboard'))

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Landing page */}
              <Route path="/" element={<LandingPage />} />

              {/* POS System (cashier/restaurant tablet) — BEFORE /:slug */}
              <Route path="/system/login" element={<SystemLogin />} />
              <Route path="/pos/:slug" element={<POSDashboard />} />

              {/* Kitchen display */}
              <Route path="/kitchen/:slug" element={<KitchenDisplay />} />

              {/* Restaurant admin */}
              <Route path="/admin/:slug/login" element={<AdminLogin />} />
              <Route path="/admin/:slug" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="tables" element={<TableManagement />} />
                <Route path="orders" element={<OrderHistory />} />
                <Route path="calendar" element={<PreOrderCalendar />} />
                <Route path="settings" element={<RestaurantSettings />} />
              </Route>

              {/* Platform admin (Feaster creator) */}
              <Route path="/platform" element={<PlatformLayout />}>
                <Route index element={<PlatformRestaurants />} />
                <Route path="add" element={<RestaurantForm />} />
                <Route path="edit/:id" element={<RestaurantForm />} />
              </Route>

              {/* Customer routes — /:slug MUST be last since it catches everything */}
              <Route path="/explore" element={<Layout />}>
                <Route index element={<HomePage />} />
              </Route>
              <Route path="/order/:orderId" element={<Layout />}>
                <Route index element={<OrderConfirmationPage />} />
              </Route>
              <Route path="/my-orders" element={<Layout />}>
                <Route index element={<MyOrdersPage />} />
              </Route>
              <Route element={<Layout />}>
                <Route path="/:slug" element={<RestaurantPage />} />
                <Route path="/:slug/table/:tableNumber" element={<RestaurantPage />} />
                <Route path="/:slug/checkout" element={<CheckoutPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}
