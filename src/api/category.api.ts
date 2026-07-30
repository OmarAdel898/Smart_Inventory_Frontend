import { requestJson } from './_shared';
import type { CategoryResponse } from '@/types';

export const categoryApi = {
  list: () => requestJson<CategoryResponse[]>('/categories'),
};
