import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getRolePermissions } from '@/config/permissions';
import type { Permission } from '@/config/permissions';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || '';
  const permissions = useMemo(() => getRolePermissions(role), [role]);

  return {
    role,
    permissions,
    can: (permission: Permission) => permissions.includes(permission),
  };
}
