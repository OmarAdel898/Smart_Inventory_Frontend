import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit2,
  Filter,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users as UsersIcon,
  Warehouse,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type UserRole =
  | 'super_admin'
  | 'tenant_owner'
  | 'warehouse_manager'
  | 'branch_manager'
  | 'inventory_clerk';

export type UserItem = {
  id: string;
  name: string | null;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  warehouseId: string | null;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = 'http://localhost:3000';

function getToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

const ROLE_STYLES: Record<UserRole, { label: string; bg: string; text: string }> = {
  super_admin: { label: 'Super Admin', bg: 'bg-purple-100', text: 'text-purple-800' },
  tenant_owner: { label: 'Tenant Owner', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  warehouse_manager: { label: 'Warehouse Manager', bg: 'bg-blue-100', text: 'text-blue-800' },
  branch_manager: { label: 'Branch Manager', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  inventory_clerk: { label: 'Inventory Clerk', bg: 'bg-amber-100', text: 'text-amber-800' },
};

function getInitials(name: string | null, email: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create form inputs
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'warehouse_manager' as UserRole,
    warehouseId: '',
  });

  // Edit form inputs
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'warehouse_manager' as UserRole,
    warehouseId: '',
    isActive: true,
  });

  const loadUsers = async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to fetch users (${res.status})`);
      }

      const body = await res.json();
      const list = body?.success === true ? body.data : Array.isArray(body) ? body : [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong loading users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const matchesSearch =
        !searchTerm ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Create User submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = getToken();
      const payload: Record<string, unknown> = {
        name: createForm.name || undefined,
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        warehouseId: createForm.warehouseId || undefined,
      };

      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to create user (${res.status})`);
      }

      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'warehouse_manager',
        warehouseId: '',
      });
      await loadUsers(undefined, true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit User submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = getToken();
      const payload = {
        name: editForm.name || undefined,
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
        warehouseId: editForm.warehouseId || null,
        isActive: editForm.isActive,
      };

      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to update user (${res.status})`);
      }

      setEditingUser(null);
      await loadUsers(undefined, true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User confirm
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.meta?.message || body?.message || `Failed to delete user (${res.status})`);
      }

      setDeletingUser(null);
      await loadUsers(undefined, true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error deleting user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      username: user.username,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouseId || '',
      isActive: user.isActive,
    });
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Administration</p>
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">User Management</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage user roles, warehouse assignments, and security accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-surface px-4 py-2.5 shadow-sm">
            <UsersIcon className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-on-surface">{users.length} Users</span>
          </div>
          <Button
            variant="outline"
            onClick={() => loadUsers(undefined, true)}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-primary text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-outline-variant/60 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-on-surface-variant" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-3 text-sm bg-surface border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">All Roles</option>
              <option value="tenant_owner">Tenant Owner</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="branch_manager">Branch Manager</option>
              <option value="inventory_clerk">Inventory Clerk</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-surface-container border border-outline-variant/70 rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'active'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Active ({users.filter((u) => u.isActive).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Inactive ({users.filter((u) => !u.isActive).length})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Users Directory Table */}
      <Card className="overflow-hidden border-outline-variant/60 shadow-sm">
        <CardHeader className="border-b border-outline-variant/50 bg-surface">
          <CardTitle className="text-xl text-on-surface">User Directory</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} registered accounts
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="font-medium text-on-surface">Loading users...</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-sm text-on-surface">{error}</p>
              <Button variant="outline" onClick={() => loadUsers()}>
                Try again
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <UsersIcon className="h-8 w-8 text-accent/50" />
              <p className="font-medium text-on-surface">No users match your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container/70">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      User
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Username
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Role
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Warehouse
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Created
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface">
                  {filteredUsers.map((u, idx) => {
                    const roleInfo = ROLE_STYLES[u.role] || {
                      label: u.role,
                      bg: 'bg-gray-100',
                      text: 'text-gray-800',
                    };
                    return (
                      <tr
                        key={u.id}
                        className={`border-t border-outline-variant/40 transition-colors hover:bg-surface-container/40 group ${
                          idx % 2 === 0 ? 'bg-surface' : 'bg-surface-lowest'
                        }`}
                      >
                        {/* Name + Email + Avatar */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(u.name, u.email)}
                            </div>
                            <div>
                              <p className="font-medium text-on-surface text-sm">
                                {u.name || 'Unnamed User'}
                              </p>
                              <p className="text-xs text-on-surface-variant">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-6 py-4 align-top text-xs font-mono text-on-surface">
                          {u.username}
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleInfo.bg} ${roleInfo.text}`}
                          >
                            <Shield className="h-3 w-3" />
                            {roleInfo.label}
                          </span>
                        </td>

                        {/* Warehouse */}
                        <td className="px-6 py-4 align-top text-xs">
                          {u.warehouseId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container border border-outline-variant text-on-surface font-mono">
                              <Warehouse className="h-3 w-3 text-accent" />
                              {u.warehouseId.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/60">Global / None</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 align-top">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                              <span className="w-2 h-2 rounded-full bg-gray-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="px-6 py-4 align-top text-xs text-on-surface-variant">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingUser(u);
                                setFormError(null);
                              }}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4 bg-surface-container-low">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" />
                Create New User
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="jdoe"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jdoe@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="tenant_owner">Tenant Owner</option>
                    <option value="warehouse_manager">Warehouse Manager</option>
                    <option value="branch_manager">Branch Manager</option>
                    <option value="inventory_clerk">Inventory Clerk</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Warehouse ID (UUID)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional warehouse UUID"
                    value={createForm.warehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-white">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4 bg-surface-container-low">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-accent" />
                Edit User: {editingUser.username}
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="tenant_owner">Tenant Owner</option>
                    <option value="warehouse_manager">Warehouse Manager</option>
                    <option value="branch_manager">Branch Manager</option>
                    <option value="inventory_clerk">Inventory Clerk</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    Warehouse ID
                  </label>
                  <input
                    type="text"
                    placeholder="Warehouse UUID"
                    value={editForm.warehouseId}
                    onChange={(e) => setEditForm({ ...editForm, warehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-container rounded-lg">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-outline-variant text-accent focus:ring-accent"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-medium text-on-surface cursor-pointer">
                  Account Active
                </label>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-white">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Delete User Confirmation</h3>
                <p className="text-xs text-on-surface-variant">This action soft-deletes the user account.</p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant">
              Are you sure you want to delete user{' '}
              <strong className="text-on-surface">{deletingUser.name || deletingUser.username}</strong> (
              {deletingUser.email})?
            </p>

            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3 border-t border-outline-variant">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setDeletingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="gap-2 bg-red-600 text-white hover:bg-red-700"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
