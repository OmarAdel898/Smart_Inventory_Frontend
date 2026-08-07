import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopAppBar from '@/components/TopAppBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import RequirePermission from '@/components/RequirePermission';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import BranchDashboard from '@/pages/BranchDashboard';
import Profile from '@/pages/Profile';
import { useAuthStore } from '@/store/authStore';
import { getAccessTokenFromCookie, getWarehouseIdFromToken } from '@/lib/auth';
import Inventory from '@/pages/Inventory';
import Warehouses from '@/pages/Warehouses';
import WarehouseCreate from '@/pages/WarehouseCreate';
import Vendors from '@/pages/Vendors';
import Approvals from '@/pages/Approvals';
import Anomalies from '@/pages/Anomalies';
import Negotiations from '@/pages/Negotiations';
import Assistant, { AssistantChat } from '@/pages/Assistant';
import PurchaseOrders from '@/pages/PurchaseOrders';
import PurchaseOrderDetail from '@/pages/PurchaseOrderDetail';
import PurchaseOrderCreate from '@/pages/PurchaseOrderCreate';
import Users from '@/pages/Users';
import StockMovements from '@/pages/StockMovements';
import Categories from '@/pages/Categories';
import CategoryCreate from '@/pages/CategoryCreate';
import Onboarding from '@/pages/Onboarding';

function AppLayout() {
  const user = useAuthStore((s) => s.user);
  
  // If user is tenant_owner and doesn't have a warehouse, force onboarding
  if (user?.role === 'tenant_owner' && !user.warehouseId) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
      <AssistantChat />
    </div>
  );
}

function RootDashboard() {
  const user = useAuthStore((s) => s.user);
  const isBranchRole = user?.role === 'branch_manager' || user?.role === 'warehouse_manager';
  const hasWarehouseId = !!getWarehouseIdFromToken(getAccessTokenFromCookie());
  if (isBranchRole && hasWarehouseId) {
    return <BranchDashboard />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route element={<AppLayout />}>
          <Route index element={<RootDashboard />} />
          <Route element={<RequirePermission permission="sidebar.profile" />}>
            <Route path="profile" element={<Profile />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.users" />}>
            <Route path="users" element={<Users />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.inventory" />}>
            <Route path="inventory" element={<Inventory />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/new" element={<CategoryCreate />} />
            <Route path="categories/:id/edit" element={<CategoryCreate />} />
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
          
          <Route element={<RequirePermission permission="sidebar.anomalies" />}>
            <Route path="anomalies" element={<Anomalies />} />
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
        </Route>
      </Route>
    </Routes>
  );
}
