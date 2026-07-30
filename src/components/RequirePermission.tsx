import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/useCan';
import type { Permission } from '@/config/permissions';

interface RequirePermissionProps {
  permission: Permission;
  children?: React.ReactNode;
}

export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
