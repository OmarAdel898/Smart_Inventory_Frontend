import { Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopAppBar from '@/components/TopAppBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import RequirePermission from '@/components/RequirePermission';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import BranchDashboard from '@/pages/BranchDashboard';
import { useAuthStore } from '@/store/authStore';
import Inventory from '@/pages/Inventory';
import Vendors from '@/pages/Vendors';
import Approvals from '@/pages/Approvals';
import Anomalies from '@/pages/Anomalies';
import Negotiations from '@/pages/Negotiations';
import Assistant from '@/pages/Assistant';
import PurchaseOrders from '@/pages/PurchaseOrders';
import PurchaseOrderDetail from '@/pages/PurchaseOrderDetail';
import Users from '@/pages/Users';

function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RootDashboard() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'branch_manager' || user?.role === 'warehouse_manager') {
    return <BranchDashboard />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<RootDashboard />} />
          
          <Route element={<RequirePermission permission="sidebar.users" />}>
            <Route path="users" element={<Users />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.inventory" />}>
            <Route path="inventory" element={<Inventory />} />
          </Route>
          
          <Route element={<RequirePermission permission="sidebar.vendors" />}>
            <Route path="vendors" element={<Vendors />} />
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
