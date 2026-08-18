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
  Ban,
  UserCheck,
  UserX,
  Users as UsersIcon,
  Warehouse,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRoleFromToken } from '@/lib/auth';
import { userCreateSchema, userEditSchema } from '@/features/users/validations';
import { usePermissions } from '@/hooks/useCan';

export type UserRole =
  | 'tenant'
  | 'warehouse_manager'
  | 'clerk';

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
  tenant: { label: 'Tenant', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  warehouse_manager: { label: 'Warehouse Manager', bg: 'bg-blue-100', text: 'text-blue-800' },
  clerk: { label: 'Clerk', bg: 'bg-amber-100', text: 'text-amber-800' },
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
  const { can } = usePermissions();
  const token = getToken();
  const userRole = getRoleFromToken(token);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const loadWarehouses = async (signal?: AbortSignal) => {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(`${API_BASE}/warehouses`, { headers, signal });
      if (res.ok) {
        const body = await res.json();
        setWarehouses(body?.data || (Array.isArray(body) ? body : []));
      }
    } catch (e) {
      console.error('Failed to load warehouses', e);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    void loadWarehouses(controller.signal);
    return () => controller.abort();
  }, []);

  const warehouseMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach(w => { map[w.id] = w.name; });
    return map;
  }, [warehouses]);

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

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Create User submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const payload = {
        name: createForm.name || undefined,
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        warehouseId: createForm.warehouseId || undefined,
      };

      const parsed = userCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = String(issue.path[0]);
          if (!errors[field]) errors[field] = issue.message;
        }
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed.data),
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
    setFieldErrors({});

    try {
      const payload = {
        name: editForm.name || undefined,
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
        warehouseId: editForm.warehouseId || undefined,
        isActive: editForm.isActive,
      };

      const parsed = userEditSchema.safeParse(payload);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = String(issue.path[0]);
          if (!errors[field]) errors[field] = issue.message;
        }
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed.data),
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

  // Reactivate User
  const handleReactivate = async (u: UserItem) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users/${u.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        await loadUsers(undefined, true);
      }
    } catch (e) {
      console.error(e);
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
    setFieldErrors({});
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between mb-2">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Users</h2>
           <p className="text-sm text-gray-500 mt-1">Manage user accounts, roles, and warehouse assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers(undefined, true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {can('users.manage') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Create User
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchTerm('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 bg-white shadow-sm transition-all"
              title="Clear Filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500" /> Filter
            </button>
            <select 
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm outline-none transition-all cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="clerk">Clerk</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm outline-none transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-[260px] pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-[#E6F4FF] focus:ring-2 focus:ring-[#E6F4FF]/50 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-[13px] font-medium text-gray-500">Loading users...</p>
          </div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-6 w-6 text-[#B30024]" />
            <p className="text-[13px] font-medium text-[#B30024]">{error}</p>
            <button onClick={() => loadUsers(undefined, true)} className="text-[13px] font-bold text-[#0066CC] hover:underline">Try again</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <UsersIcon className="h-8 w-8 text-gray-300" />
            <p className="text-[13px] font-medium text-gray-500">No users match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Role</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Warehouse</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Created</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => {
                  const roleLabel = u.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  const statusInfo = u.isActive 
                    ? { bg: 'bg-[#E6F4FF]', text: 'text-[#0066CC]', label: 'ACTIVE' } 
                    : { bg: 'bg-gray-100', text: 'text-gray-500', label: 'INACTIVE' };

                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E6F4FF] text-[#0066CC] font-bold text-[13px] flex items-center justify-center shrink-0 shadow-sm">
                            {getInitials(u.name, u.email)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-gray-900 leading-tight truncate max-w-[200px]">{u.name || u.username}</span>
                            <span className="text-[12px] font-medium text-gray-500 leading-tight truncate max-w-[200px] mt-0.5">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                        {roleLabel}
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                        {u.warehouseId ? warehouseMap[u.warehouseId] || u.warehouseId.slice(0,8).toUpperCase() : 'Global'}
                      </td>
                      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-500 whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(u)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {['tenant'].includes(userRole || '') && (
                            u.isActive ? (
                              <button onClick={() => { setDeletingUser(u); setFormError(null); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-[#FFD9DF]/50 hover:text-[#B30024] transition-colors" title="Deactivate">
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleReactivate(u)} className="p-1.5 rounded-full font-bold text-gray-400 hover:bg-[#E6F4FF] hover:text-[#0066CC] transition-colors" title="Reactivate">
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Footer */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30 rounded-b-xl">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                    currentPage === i + 1 
                      ? 'bg-[#E6F4FF] text-[#0066CC]' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50-low">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#0066CC]" />
                Create New User
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setFieldErrors({});
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                />
                {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="jdoe"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.username ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.username && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.username}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jdoe@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.email ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.email && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:ring-2 ${fieldErrors.password ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                />
                {fieldErrors.password && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value as UserRole })
                    }
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.role ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  >
                    <option value="tenant">Tenant</option>
                    <option value="warehouse_manager">Warehouse Manager</option>
                    <option value="clerk">Clerk</option>
                  </select>
                  {fieldErrors.role && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.role}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Warehouse
                  </label>
                  <select
                    value={createForm.warehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.warehouseId ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  >
                    <option value="">Global / None</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.warehouseId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.warehouseId}</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button variant="cancel" type="button" onClick={() => {
                  setIsCreateOpen(false);
                  setFieldErrors({});
                }} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50-low">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#0066CC]" />
                Edit User: {editingUser.username}
              </h2>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setFieldErrors({});
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.name ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                />
                {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.username ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.username && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.username}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.email ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  />
                  {fieldErrors.email && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.role ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  >
                    <option value="tenant">Tenant</option>
                    <option value="warehouse_manager">Warehouse Manager</option>
                    <option value="clerk">Clerk</option>
                  </select>
                  {fieldErrors.role && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.role}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Warehouse
                  </label>
                  <select
                    value={editForm.warehouseId}
                    onChange={(e) => setEditForm({ ...editForm, warehouseId: e.target.value })}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:ring-2 ${fieldErrors.warehouseId ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-accent/20'}`}
                  >
                    <option value="">Global / None</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.warehouseId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.warehouseId}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-200 text-[#0066CC] focus:ring-accent"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Account Active
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button variant="cancel" type="button" onClick={() => {
                  setEditingUser(null);
                  setFieldErrors({});
                }} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                  Cancel
                </button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150 p-6 space-y-4 relative">
            <button
              onClick={() => {
                setDeletingUser(null);
                setFormError(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Deactivate User Confirmation</h3>
                <p className="text-xs text-gray-500">This action deactivates the user account.</p>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Are you sure you want to deactivate user{' '}
              <strong className="text-gray-900">{deletingUser.name || deletingUser.username}</strong> (
              {deletingUser.email})?
            </p>

            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3 border-t border-gray-200">
              <button
                variant="cancel"
                disabled={isSubmitting}
                onClick={() => setDeletingUser(null)}
               className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                Cancel
              </button>
              <Button variant="destructive" disabled={isSubmitting} onClick={handleDeleteConfirm} className="gap-2 bg-red-600 hover:bg-red-700"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
