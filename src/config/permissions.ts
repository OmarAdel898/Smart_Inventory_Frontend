export type Permission =
  | 'sidebar.dashboard'
  | 'sidebar.users'
  | 'sidebar.inventory'
  | 'sidebar.vendors'
  | 'sidebar.approvals'
  | 'sidebar.purchaseOrders'
  | 'sidebar.negotiations'
  | 'sidebar.anomalies'
  | 'sidebar.assistant'
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
  | 'purchaseOrders.manage';

type PermissionMap = Partial<Record<string, Permission[]>>;

const ROLE_PERMISSIONS: PermissionMap = {
  super_admin: [
    'sidebar.dashboard', 'sidebar.users', 'sidebar.inventory', 'sidebar.vendors',
    'sidebar.approvals', 'sidebar.purchaseOrders', 'sidebar.negotiations',
    'sidebar.anomalies', 'sidebar.assistant',
    'dashboard.view', 'dashboard.branch',
    'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.editPayload',
    'users.view', 'users.manage',
    'inventory.view', 'inventory.manage',
    'vendors.view', 'vendors.manage',
    'purchaseOrders.view', 'purchaseOrders.manage',
  ],
  tenant_owner: [
    'sidebar.dashboard', 'sidebar.users', 'sidebar.inventory', 'sidebar.vendors',
    'sidebar.approvals', 'sidebar.purchaseOrders', 'sidebar.negotiations',
    'sidebar.anomalies', 'sidebar.assistant',
    'dashboard.view',
    'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.editPayload',
    'users.view', 'users.manage',
    'inventory.view', 'inventory.manage',
    'vendors.view', 'vendors.manage',
    'purchaseOrders.view', 'purchaseOrders.manage',
  ],
  warehouse_manager: [
    'sidebar.dashboard', 'sidebar.users', 'sidebar.inventory', 'sidebar.vendors',
    'sidebar.approvals', 'sidebar.purchaseOrders', 'sidebar.anomalies',
    'sidebar.assistant',
    'dashboard.view',
    'approvals.view', 'approvals.approve', 'approvals.reject',
    'users.view',
    'inventory.view', 'inventory.manage',
    'vendors.view',
    'purchaseOrders.view',
  ],
  branch_manager: [
    'sidebar.dashboard', 'sidebar.inventory', 'sidebar.vendors',
    'sidebar.approvals', 'sidebar.purchaseOrders',
    'dashboard.branch',
    'inventory.view',
    'vendors.view',
    'approvals.view',
    'purchaseOrders.view',
  ],
  procurement_officer: [
    'sidebar.dashboard', 'sidebar.vendors', 'sidebar.approvals', 'sidebar.purchaseOrders',
    'dashboard.view',
    'approvals.view', 'approvals.approve', 'approvals.reject', 'approvals.editPayload',
    'vendors.view', 'vendors.manage',
    'purchaseOrders.view', 'purchaseOrders.manage',
  ],
  analyst: [
    'sidebar.dashboard', 'sidebar.inventory', 'sidebar.approvals',
    'sidebar.anomalies', 'sidebar.assistant',
    'dashboard.view',
    'inventory.view',
    'approvals.view',
  ],
  viewer: [
    'sidebar.dashboard', 'sidebar.inventory',
    'dashboard.view',
    'inventory.view',
    'approvals.view',
  ],
  inventory_clerk: [
    'sidebar.dashboard', 'sidebar.inventory',
    'sidebar.purchaseOrders', 'sidebar.anomalies',
    'dashboard.view',
    'inventory.view', 'inventory.manage',
    'purchaseOrders.view',
  ],
};

export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer!;
}
