import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Boxes, Loader2, Plus, RefreshCw, Pencil, Trash2, TriangleAlert, TrashIcon, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { categoryApi } from '@/api/category.api';
import type { CategoryResponse } from '@/types';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '\u2014';
  }
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function CellValue({ children }: { children: string | null }) {
  return <span className={children ? 'text-gray-900' : 'text-gray-500'}>{children || '\u2014'}</span>;
}

function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
      <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
        <Loader2 className="h-5 w-5 animate-spin text-[#0066CC]" />
      </div>
      <div className="text-center">
        <p className="font-medium text-gray-900">Loading categories</p>
        <p className="text-sm">Fetching the latest categories list.</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
        <Boxes className="h-5 w-5 text-[#0066CC]" />
      </div>
      <div className="text-center max-w-sm">
        <p className="font-medium text-gray-900">No categories found</p>
        <p className="text-sm">
          There are no categories in the system yet. Once added, they will appear here.
        </p>
      </div>
      <Button asChild className="mt-2">
        <Link to="/categories/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Link>
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-4 text-gray-500">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div className="text-center max-w-md">
        <p className="font-medium text-gray-900">Unable to load categories</p>
        <p className="text-sm">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const categoryCountLabel = useMemo(() => {
    const count = categories.length;
    return `${count} categor${count === 1 ? 'y' : 'ies'}`;
  }, [categories.length]);

  const loadCategories = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await categoryApi.list();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const confirmDelete = (id: string, name: string) => {
    setCategoryToDelete({ id, name });
    setDeleteConfirmed(false); // Reset checkbox
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setDeletingId(categoryToDelete.id);
    try {
      await categoryApi.delete(categoryToDelete.id);
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setDeleteModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const totalPages = Math.ceil(filteredCategories.length / pageSize);
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product categories</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCategories(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/categories/new"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            New Category
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                setSearchTerm('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 hover:bg-gray-50 bg-white shadow-sm transition-all"
              title="Clear Filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500" /> Filter
            </button>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search categories..." 
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
            <p className="text-[13px] font-medium text-gray-500">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-6 w-6 text-[#B30024]" />
            <p className="text-[13px] font-medium text-[#B30024]">{error}</p>
            <button onClick={() => loadCategories()} className="text-[13px] font-bold text-[#0066CC] hover:underline">Try again</button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Boxes className="h-8 w-8 text-gray-300" />
            <p className="text-[13px] font-medium text-gray-500">No categories found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Name</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Description</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap hidden md:table-cell">Created At</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((category) => (
                  <tr key={category.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#E6F4FF] text-[#0066CC] font-bold text-[13px] flex items-center justify-center shrink-0 shadow-sm">
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[14px] font-bold text-gray-900 leading-tight truncate max-w-[200px]">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-600">
                      <div className="max-w-[200px] sm:max-w-xs truncate text-gray-500">
                        {category.description || '\u2014'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">
                      {category.createdAt ? formatDate(category.createdAt) : '\u2014'}
                    </td>
                    <td className="px-6 py-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/categories/${category.id}/edit`)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => confirmDelete(category.id, category.name)} disabled={deletingId === category.id} className="p-1.5 rounded-lg text-gray-400 hover:bg-[#FFD9DF]/50 hover:text-[#B30024] transition-colors" title="Delete">
                          {deletingId === category.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !error && filteredCategories.length > 0 && (
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-full border-t-[6px] border-t-red-600 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 pb-6">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <TrashIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="pt-1">
                  <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">Delete Category?</h3>
                  <p className="text-[15px] text-gray-500 mt-1">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-8 bg-[#fef2f2] border border-red-200 rounded-xl p-5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <TriangleAlert className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-700 text-[15px]">Critical System Impact</h4>
                </div>
                <div className="space-y-3 text-[14px] text-red-700/90 leading-relaxed">
                  <p>
                    You are about to delete the category <span className="font-bold">"{categoryToDelete.name}"</span>. 
                    This category currently has assigned SKUs to it.
                  </p>
                  <p>
                    Deleting this category will unassign all related SKUs, leaving them uncategorized in your master catalog.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-start gap-3">
                <Checkbox 
                  id="confirm-delete" 
                  checked={deleteConfirmed} 
                  onCheckedChange={(checked) => setDeleteConfirmed(checked as boolean)}
                  className="mt-1 border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <label 
                  htmlFor="confirm-delete" 
                  className="text-[14px] text-gray-700 cursor-pointer select-none leading-snug"
                >
                  I understand that assigned SKUs will lose their category association immediately.
                </label>
              </div>
            </div>
            
            <div className="p-6 pt-4 flex justify-between items-center bg-white border-t border-gray-100">
              <button 
                variant="cancel" 
                onClick={() => setDeleteModalOpen(false)} 
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-gray-600 hover:text-gray-900  px-6 font-medium"
              >
                Cancel
              </button>
              <Button 
                className="bg-[#e48888] hover:bg-[#d67777] text-white px-8 h-11 font-medium text-[15px] transition-colors rounded-lg disabled:opacity-50" 
                onClick={handleDeleteConfirm} 
                disabled={!deleteConfirmed || deletingId !== null}
              >
                {deletingId !== null ? <Loader2 className="w-5 h-5 animate-spin" /> : "Delete Category"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
