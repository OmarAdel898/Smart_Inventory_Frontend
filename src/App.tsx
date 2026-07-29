import { Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopAppBar from '@/components/TopAppBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import BranchDashboard from '@/pages/BranchDashboard';
import { useAuthStore } from '@/store/authStore';

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
        </Route>
      </Route>
    </Routes>
  );
}
