import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Boxes, Loader2, Plus, RefreshCw, Pencil, Trash2, TriangleAlert, TrashIcon } from 'lucide-react';
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
  return <span className={children ? 'text-on-surface' : 'text-on-surface-variant'}>{children || '\u2014'}</span>;
}

function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
      <div className="text-center">
        <p className="font-medium text-on-surface">Loading categories</p>
        <p className="text-sm">Fetching the latest categories list.</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/40">
        <Boxes className="h-5 w-5 text-accent" />
      </div>
      <div className="text-center max-w-sm">
        <p className="font-medium text-on-surface">No categories found</p>
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
    <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
      </div>
      <div className="text-center max-w-md">
        <p className="font-medium text-on-surface">Unable to load categories</p>
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Categories</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage your product categories</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => loadCategories(true)}
            disabled={loading || refreshing}
            className="flex-1 sm:flex-none bg-surface"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link to="/categories/new">
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-outline-variant/40 shadow-sm overflow-hidden bg-surface">
        <CardHeader className="border-b border-outline-variant/20 bg-surface-container/20 pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Category List
          </CardTitle>
          <CardDescription>
            {loading ? 'Counting categories...' : `Total: ${categoryCountLabel}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadCategories()} />
          ) : categories.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-on-surface-variant bg-surface-container/30 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Name</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Description</th>
                    <th scope="col" className="px-6 py-4 font-semibold hidden md:table-cell">Created At</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 bg-surface">
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="hover:bg-surface-container/10 transition-colors duration-150 group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-on-surface">{category.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[200px] sm:max-w-xs truncate text-on-surface-variant">
                          <CellValue>{category.description || ''}</CellValue>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell text-on-surface-variant">
                        {category.createdAt ? formatDate(category.createdAt) : '\u2014'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-on-surface-variant hover:text-accent"
                            onClick={() => navigate(`/categories/${category.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => confirmDelete(category.id, category.name)}
                            disabled={deletingId === category.id}
                          >
                            {deletingId === category.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
              <Button 
                variant="ghost" 
                onClick={() => setDeleteModalOpen(false)} 
                disabled={deletingId !== null}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-6 font-medium"
              >
                Cancel
              </Button>
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
