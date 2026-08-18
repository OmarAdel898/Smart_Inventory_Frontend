import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import TopAppBar from '@/components/TopAppBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import RequirePermission from '@/components/RequirePermission';
import GuestRoute from '@/components/GuestRoute';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import BranchDashboard from '@/pages/BranchDashboard';
import Profile from '@/pages/Profile';
import { useAuthStore } from '@/store/authStore';
import { getAccessTokenFromCookie, getWarehouseIdFromToken } from '@/lib/auth';
import NotificationProvider from '@/components/NotificationProvider';
import Inventory from '@/pages/Inventory';
import Warehouses from '@/pages/Warehouses';
import WarehouseCreate from '@/pages/WarehouseCreate';
import Vendors from '@/pages/Vendors';
import Approvals from '@/pages/Approvals';
import Negotiations from '@/pages/Negotiations';
import Assistant, { AssistantChat } from '@/pages/Assistant';
import PurchaseOrders from '@/pages/PurchaseOrders';
import PurchaseOrderDetail from '@/pages/PurchaseOrderDetail';
import PurchaseOrderCreate from '@/pages/PurchaseOrderCreate';
import Users from '@/pages/Users';
import StockMovements from '@/pages/StockMovements';
import Categories from '@/pages/Categories';
import Onboarding from '@/pages/Onboarding';
import Notifications from '@/pages/Notifications';
import LandingPage from '@/pages/LandingPage';

function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // If user is tenant and doesn't have a warehouse, force onboarding
  if (user?.role === 'tenant' && !user.warehouseId) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopAppBar />
          <main className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <AssistantChat />
      </div>
    </NotificationProvider>
  );
}

function RootDashboard() {
  const user = useAuthStore((s) => s.user);
  const isBranchRole = user?.role === 'warehouse_manager' || user?.role === 'clerk';
  const hasWarehouseId = !!getWarehouseIdFromToken(getAccessTokenFromCookie());
  if (isBranchRole && hasWarehouseId) {
    return <BranchDashboard />;
  }
  return <Dashboard />;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        {!isAuthenticated && <Route path="/" element={<LandingPage />} />}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route element={<AppLayout />}>
          {isAuthenticated && <Route path="/" element={<RootDashboard />} />}
          
          <Route element={<RequirePermission permission="sidebar.profile" />}>
            <Route path="profile" element={<Profile />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.users" />}>
            <Route path="users" element={<Users />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.inventory" />}>
            <Route path="inventory" element={<Inventory />} />
            <Route path="categories" element={<Categories />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.vendors" />}>
            <Route path="vendors" element={<Vendors />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.movements" />}>
            <Route path="stock-movements" element={<StockMovements />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.warehouses" />}>
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="warehouses/new" element={<WarehouseCreate />} />
            <Route path="warehouses/:id/edit" element={<WarehouseCreate />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.approvals" />}>
            <Route path="approvals" element={<Approvals />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.negotiations" />}>
            <Route path="negotiations" element={<Negotiations />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.purchaseOrders" />}>
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderCreate />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.assistant" />}>
            <Route path="assistant" element={<Assistant />} />
          </Route>

          <Route element={<RequirePermission permission="sidebar.notifications" />}>
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
