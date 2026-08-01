import { api } from './client';
import type { CategoryResponse } from '@/types';

export const categoryApi = {
  list: () => api.get<CategoryResponse[]>('/categories'),
  getById: (id: string) => api.get<CategoryResponse>(`/categories/${id}`),
  create: (data: { name: string; description?: string }) => 
    api.post<CategoryResponse>('/categories', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<CategoryResponse>(`/categories/${id}`, data),
  delete: (id: string) =>
    api.delete<void>(`/categories/${id}`),
};

