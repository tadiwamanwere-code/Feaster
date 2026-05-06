import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { DriverAuthProvider } from './context/DriverAuthContext'

import Layout from './components/Layout'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
    </div>
  )
}

// Existing pages
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
const DeliveriesView = lazy(() => import('./pages/admin/DeliveriesView'))
const PlatformLayout = lazy(() => import('./pages/platform/PlatformLayout'))
const PlatformRestaurants = lazy(() => import('./pages/platform/PlatformRestaurants'))
const RestaurantForm = lazy(() => import('./pages/platform/RestaurantForm'))
const SystemLogin = lazy(() => import('./pages/pos/SystemLogin'))
const POSDashboard = lazy(() => import('./pages/pos/POSDashboard'))

// Customer PWA — being rebuilt screen by screen
const WelcomeScreen = lazy(() => import('./pages/customer/WelcomeScreen'))
const CustomerAuth = lazy(() => import('./pages/customer/CustomerAuth'))
const CustomerStub = lazy(() => import('./pages/customer/CustomerStub'))

// Driver PWA
const DriverAuth = lazy(() => import('./pages/driver/DriverAuth'))
const DriverOnboarding = lazy(() => import('./pages/driver/DriverOnboarding'))
const DriverLayout = lazy(() => import('./pages/driver/DriverLayout'))
const DriverJobs = lazy(() => import('./pages/driver/DriverJobs'))
const DriverWallet = lazy(() => import('./pages/driver/DriverWallet'))
const DriverProfile = lazy(() => import('./pages/driver/DriverProfile'))
const DriverActiveDelivery = lazy(() => import('./pages/driver/DriverActiveDelivery'))

export default function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <DriverAuthProvider>
          <CartProvider>
            <BrowserRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Root → Welcome */}
                  <Route path="/" element={<Navigate to="/welcome" replace />} />

                  {/* POS */}
                  <Route path="/system/login" element={<SystemLogin />} />
                  <Route path="/pos/:slug" element={<POSDashboard />} />

                  {/* Kitchen */}
                  <Route path="/kitchen/:slug" element={<KitchenDisplay />} />

                  {/* Restaurant admin */}
                  <Route path="/admin/:slug/login" element={<AdminLogin />} />
                  <Route path="/admin/:slug" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="menu" element={<MenuManagement />} />
                    <Route path="tables" element={<TableManagement />} />
                    <Route path="orders" element={<OrderHistory />} />
                    <Route path="deliveries" element={<DeliveriesView />} />
                    <Route path="calendar" element={<PreOrderCalendar />} />
                    <Route path="settings" element={<RestaurantSettings />} />
                  </Route>

                  {/* Platform admin */}
                  <Route path="/platform" element={<PlatformLayout />}>
                    <Route index element={<PlatformRestaurants />} />
                    <Route path="add" element={<RestaurantForm />} />
                    <Route path="edit/:id" element={<RestaurantForm />} />
                  </Route>

                  {/* Customer PWA — Welcome + Auth only (rest being rebuilt) */}
                  <Route path="/welcome" element={<WelcomeScreen />} />
                  <Route path="/app/auth" element={<CustomerAuth />} />
                  <Route path="/app" element={<CustomerStub />} />

                  {/* Driver PWA */}
                  <Route path="/driver/auth" element={<DriverAuth />} />
                  <Route path="/driver/onboarding" element={<DriverOnboarding />} />
                  <Route path="/driver/delivery/:deliveryId" element={<DriverActiveDelivery />} />
                  <Route path="/driver" element={<DriverLayout />}>
                    <Route index element={<DriverJobs />} />
                    <Route path="wallet" element={<DriverWallet />} />
                    <Route path="profile" element={<DriverProfile />} />
                  </Route>

                  {/* Public customer routes (existing) — /:slug catches everything, MUST be last */}
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
        </DriverAuthProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  )
}
