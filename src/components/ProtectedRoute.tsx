import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getAccessTokenFromCookie, isTokenExpired } from '../lib/auth';

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = getAccessTokenFromCookie();
  const tokenExpired = !!token && isTokenExpired(token);

  if (!isAuthenticated || tokenExpired) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
