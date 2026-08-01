import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Boxes, CheckCircle2, Loader2, Info } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryApi } from '@/api/category.api';

const categorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(255, 'Category name must be at most 255 characters'),
  description: z.string().max(1000).optional().or(z.literal('')),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoryCreate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormValues, string>>>({});

  const [pageLoading, setPageLoading] = useState(isEdit);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const category = await categoryApi.getById(id);
        setName(category.name);
        setDescription(category.description || '');
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Failed to load category.');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    const data: CategoryFormValues = {
      name: name.trim(),
      description: description.trim() || undefined,
    };

    const parsed = categorySchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CategoryFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof CategoryFormValues;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitLoading(true);
    try {
      if (isEdit && id) {
        await categoryApi.update(id, parsed.data);
      } else {
        await categoryApi.create(parsed.data);
      }
      setSuccess(true);
      setTimeout(() => navigate('/categories'), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center text-on-surface-variant gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="font-medium">Loading category details...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" asChild className="-ml-4 text-on-surface-variant hover:text-on-surface mb-4">
          <Link to="/categories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Link>
        </Button>
        <div className="py-12 flex flex-col items-center justify-center text-red-600 gap-3">
          <AlertCircle className="h-10 w-10" />
          <div className="text-center">
            <h2 className="text-xl font-bold mb-1">Error Loading Category</h2>
            <p className="text-on-surface-variant">{pageError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" asChild className="-ml-4 text-on-surface-variant hover:text-on-surface mb-2">
          <Link to="/categories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Categories
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">
          {isEdit ? 'Edit Category' : 'Create Category'}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {isEdit ? 'Update existing product category details.' : 'Add a new product category to your system.'}
        </p>
      </div>

      <Card className="border-outline-variant/40 shadow-sm bg-surface">
        <CardHeader className="border-b border-outline-variant/20 bg-surface-container/20">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Category Details
          </CardTitle>
          <CardDescription>Enter the basic information for this category.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-green-600 gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h3 className="text-xl font-bold text-on-surface mb-1">Success!</h3>
                <p className="text-on-surface-variant">
                  Category has been {isEdit ? 'updated' : 'created'} successfully. Redirecting...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start gap-3 border border-red-200">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">{submitError}</div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-on-surface font-medium">
                    Category Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Electronics, Clothing, etc."
                    className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    disabled={submitLoading}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-on-surface font-medium">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional details about this category"
                    className={errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    disabled={submitLoading}
                  />
                  {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-lg p-4 flex gap-3 text-blue-800 text-sm border border-blue-100 mt-6">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <p>
                  Categories help you organize your products efficiently. Make sure to use clear and descriptive names.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/categories')}
                  disabled={submitLoading}
                  className="bg-surface"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitLoading} className="min-w-[120px]">
                  {submitLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    'Save Changes'
                  ) : (
                    'Create Category'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
