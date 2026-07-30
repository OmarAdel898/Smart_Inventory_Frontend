import { useState, useEffect, useCallback } from 'react';
import { fetchApprovals } from '@/api/approvals';
import type { Approval, Filters } from '@/pages/ApprovalQueue/types';

interface UseApprovalsReturn {
  approvals: Approval[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  updateApprovalStatus: (id: string, status: 'approved' | 'rejected') => void;
  prevPage: () => void;
  nextPage: () => void;
  refetch: () => void;
}

export function useApprovals(): UseApprovalsReturn {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState<Filters>({ agentType: 'All Types', status: 'All Statuses' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agentTypeParam = filters.agentType !== 'All Types'
        ? filters.agentType.toLowerCase().replace(' agent', '')
        : undefined;
      const res = await fetchApprovals({ agentType: agentTypeParam, page, limit });
      setApprovals(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [filters.agentType, page, limit]);

  useEffect(() => { load(); }, [load]);

  const updateApprovalStatus = useCallback((id: string, status: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  }, []);

  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(() => setPage((p) => p + 1), []);

  return {
    approvals, loading, error, total, page, limit, totalPages,
    hasNext: page < totalPages,
    filters, setFilters,
    updateApprovalStatus, prevPage, nextPage,
    refetch: load,
  };
}
