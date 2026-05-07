import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { DriverAuthProvider } from './context/DriverAuthContext'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
    </div>
  )
}

// Existing pages
const RootGate = lazy(() => import('./pages/RootGate'))
const RestaurantSignup = lazy(() => import('./pages/RestaurantSignup'))
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
const PlatformDashboard = lazy(() => import('./pages/platform/PlatformDashboard'))
const PlatformRestaurants = lazy(() => import('./pages/platform/PlatformRestaurants'))
const PlatformOrders = lazy(() => import('./pages/platform/PlatformOrders'))
const PlatformCustomers = lazy(() => import('./pages/platform/PlatformCustomers'))
const PlatformQRCodes = lazy(() => import('./pages/platform/PlatformQRCodes'))
const RestaurantForm = lazy(() => import('./pages/platform/RestaurantForm'))
const SystemLogin = lazy(() => import('./pages/pos/SystemLogin'))
const POSDashboard = lazy(() => import('./pages/pos/POSDashboard'))

// Customer PWA
const WelcomeScreen = lazy(() => import('./pages/customer/WelcomeScreen'))
const CustomerOrderType = lazy(() => import('./pages/customer/CustomerOrderType'))
const CustomerScan = lazy(() => import('./pages/customer/CustomerScan'))
const CustomerLayout = lazy(() => import('./pages/customer/CustomerLayout'))
const CustomerHome = lazy(() => import('./pages/customer/CustomerHome'))
const CustomerRestaurant = lazy(() => import('./pages/customer/CustomerRestaurant'))
const CustomerDish = lazy(() => import('./pages/customer/CustomerDish'))
const CustomerCart = lazy(() => import('./pages/customer/CustomerCart'))
const CustomerCheckout = lazy(() => import('./pages/customer/CustomerCheckout'))
const CustomerOrderSuccess = lazy(() => import('./pages/customer/CustomerOrderSuccess'))
const CustomerOrders = lazy(() => import('./pages/customer/CustomerOrders'))
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'))
const TableRedirect = lazy(() => import('./pages/customer/TableRedirect'))

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
                  {/* Root: desktop = business landing, mobile = customer flow */}
                  <Route path="/" element={<RootGate />} />
                  <Route path="/restaurant/signup" element={<RestaurantSignup />} />

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
                    <Route index element={<PlatformDashboard />} />
                    <Route path="restaurants" element={<PlatformRestaurants />} />
                    <Route path="orders" element={<PlatformOrders />} />
                    <Route path="customers" element={<PlatformCustomers />} />
                    <Route path="qr-codes" element={<PlatformQRCodes />} />
                    <Route path="add" element={<RestaurantForm />} />
                    <Route path="edit/:id" element={<RestaurantForm />} />
                  </Route>

                  {/* Customer PWA */}
                  <Route path="/welcome" element={<WelcomeScreen />} />

                  {/* Full-screen flow steps (no bottom nav) */}
                  <Route path="/app/order-type" element={<CustomerOrderType />} />
                  <Route path="/app/scan" element={<CustomerScan />} />
                  <Route path="/app/cart" element={<CustomerCart />} />
                  <Route path="/app/checkout" element={<CustomerCheckout />} />
                  <Route path="/app/order/:id" element={<CustomerOrderSuccess />} />

                  {/* Bottom-nav routes */}
                  <Route path="/app" element={<CustomerLayout />}>
                    <Route index element={<CustomerHome />} />
                    <Route path="orders" element={<CustomerOrders />} />
                    <Route path="profile" element={<CustomerProfile />} />
                    <Route path="r/:slug" element={<CustomerRestaurant />} />
                    <Route path="r/:slug/dish/:itemId" element={<CustomerDish />} />
                  </Route>

                  {/* Driver PWA */}
                  <Route path="/driver/auth" element={<DriverAuth />} />
                  <Route path="/driver/onboarding" element={<DriverOnboarding />} />
                  <Route path="/driver/delivery/:deliveryId" element={<DriverActiveDelivery />} />
                  <Route path="/driver" element={<DriverLayout />}>
                    <Route index element={<DriverJobs />} />
                    <Route path="wallet" element={<DriverWallet />} />
                    <Route path="profile" element={<DriverProfile />} />
                  </Route>

                  {/* Backward-compat: old printed QR codes encoded /<slug>/table/<n> */}
                  {/* and /<slug>. Redirect into the new in-app flow. */}
                  <Route path="/:slug/table/:tableNumber" element={<TableRedirect withTable />} />
                  <Route path="/:slug" element={<TableRedirect />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </CartProvider>
        </DriverAuthProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  )
}
