import { Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Inventory from '@/pages/Inventory';
import Vendors from '@/pages/Vendors';
import Approvals from '@/pages/Approvals';
import Anomalies from '@/pages/Anomalies';
import Negotiations from '@/pages/Negotiations';
import Assistant from '@/pages/Assistant';
import PurchaseOrders from '@/pages/PurchaseOrders';
import PurchaseOrderDetail from '@/pages/PurchaseOrderDetail';

function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto bg-bg">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="negotiations" element={<Negotiations />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="assistant" element={<Assistant />} />
        </Route>
      </Route>
    </Routes>
  );
}
