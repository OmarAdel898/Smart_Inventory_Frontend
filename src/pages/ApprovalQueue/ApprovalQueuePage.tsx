import { useState, useCallback, useEffect } from 'react';
import { useApprovals } from '@/pages/ApprovalQueue/hooks/useApprovals';
import FilterBar from '@/pages/ApprovalQueue/FilterBar';
import ApprovalsTable from '@/pages/ApprovalQueue/ApprovalsTable';
import ApprovalSideSheet from '@/pages/ApprovalQueue/ApprovalSideSheet';
import Toast from '@/pages/ApprovalQueue/Toast';
import type { Approval, Filters } from '@/pages/ApprovalQueue/types';

export default function ApprovalQueuePage() {
  const { approvals, loading, error, total, page, limit, hasNext, filters, setFilters, updateApprovalStatus, prevPage, nextPage, refetch } = useApprovals();
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [sideSheetOpen, setSideSheetOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (error) setToast(error); }, [error]);

  const handleRowClick = useCallback((id: string) => {
    const approval = approvals.find((a) => a.id === id) || null;
    setSelectedApproval(approval);
    setSideSheetOpen(true);
  }, [approvals]);

  const handleCloseSheet = useCallback(() => {
    setSideSheetOpen(false);
    setSelectedApproval(null);
  }, []);

  const handleStatusChanged = useCallback((id: string, newStatus: 'approved' | 'rejected') => {
    updateApprovalStatus(id, newStatus);
  }, [updateApprovalStatus]);

  const handleApply = useCallback(() => {
    setFilters(localFilters);
  }, [localFilters, setFilters]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleCloseSheet();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseSheet]);

  return (
    <div className="h-full">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <FilterBar
        filters={localFilters}
        onChange={setLocalFilters}
        onApply={handleApply}
      />

      <ApprovalsTable
        approvals={approvals}
        loading={loading}
        total={total}
        page={page}
        limit={limit}
        onRowClick={handleRowClick}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        hasNext={hasNext}
      />

      <ApprovalSideSheet
        isOpen={sideSheetOpen}
        approval={selectedApproval}
        onClose={handleCloseSheet}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}
