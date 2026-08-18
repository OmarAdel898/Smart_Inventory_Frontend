export type Permission =
  | 'sidebar.dashboard'
  | 'sidebar.notifications'
  | 'sidebar.users'
  | 'sidebar.inventory'
  | 'sidebar.vendors'
  | 'sidebar.approvals'
  | 'sidebar.purchaseOrders'
  | 'sidebar.negotiations'
  | 'sidebar.assistant'
  | 'sidebar.profile'
  | 'dashboard.view'
  | 'dashboard.branch'
  | 'approvals.view'
  | 'approvals.approve'
  | 'approvals.reject'
  | 'approvals.editPayload'
  | 'users.view'
  | 'users.manage'
  | 'inventory.view'
  | 'inventory.manage'
  | 'vendors.view'
  | 'vendors.manage'
  | 'purchaseOrders.view'
  | 'purchaseOrders.manage'
  | 'sidebar.warehouses'
  | 'warehouses.view'
  | 'warehouses.manage'
  | 'sidebar.movements'
  | 'movements.view'
  | 'movements.manage';

type PermissionMap = Partial<Record<string, Permission[]>>;

const ROLE_PERMISSIONS: PermissionMap = {
  tenant: [
    'sidebar.dashboard', 'sidebar.notifications', 'sidebar.users', 'sidebar.inventory', 'sidebar.vendors',
    'sidebar.approvals', 'sidebar.purchaseOrders', 'sidebar.negotiations',
    'sidebar.assistant', 'sidebar.profile', 'sidebar.warehouses', 'sidebar.movements',
    'dashboard.view', 'dashboard.branch',
    'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.editPayload',
    'users.view', 'users.manage',
    'inventory.view', 'inventory.manage',
    'vendors.view', 'vendors.manage',
    'purchaseOrders.view', 'purchaseOrders.manage',
    'warehouses.view', 'warehouses.manage',
    'movements.view', 'movements.manage',
  ],
  warehouse_manager: [
    'sidebar.dashboard', 'sidebar.notifications', 'sidebar.inventory', 'sidebar.vendors',
    'sidebar.approvals', 'sidebar.purchaseOrders',
    'sidebar.assistant', 'sidebar.profile', 'sidebar.warehouses', 'sidebar.movements',
    'dashboard.view',
    'approvals.view', 'approvals.approve', 'approvals.reject',
    'inventory.view', 'inventory.manage',
    'vendors.view',
    'purchaseOrders.view',
    'warehouses.view', 'warehouses.manage',
    'movements.view', 'movements.manage',
  ],
  clerk: [
    'sidebar.dashboard', 'sidebar.notifications', 'sidebar.inventory',
    'sidebar.purchaseOrders', 'sidebar.movements', 'sidebar.profile',
    'dashboard.view', 'dashboard.branch',
    'inventory.view', 'inventory.manage',
    'purchaseOrders.view',
    'movements.view', 'movements.manage',
  ],
};

export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.clerk!;
}
