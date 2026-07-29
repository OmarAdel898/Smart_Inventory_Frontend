import type { Approval } from '@/pages/ApprovalQueue/types';
import ApprovalRow from '@/pages/ApprovalQueue/ApprovalRow';

interface ApprovalsTableProps {
  approvals: Approval[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onRowClick: (id: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  hasNext: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-surface-container-highest rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function ApprovalsTable({
  approvals, loading, total, page, limit, onRowClick, onPrevPage, onNextPage, hasNext,
}: ApprovalsTableProps) {
  const start = total > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);

  return (
    <div className="bg-surface-lowest rounded-lg border border-outline-variant overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="px-6 py-4 text-label-lg text-on-surface-variant uppercase">Request ID</th>
              <th className="px-6 py-4 text-label-lg text-on-surface-variant uppercase">Agent Type</th>
              <th className="px-6 py-4 text-label-lg text-on-surface-variant uppercase">Step</th>
              <th className="px-6 py-4 text-label-lg text-on-surface-variant uppercase">Status</th>
              <th className="px-6 py-4 text-label-lg text-on-surface-variant uppercase">Created At</th>
              <th className="px-6 py-4 text-label-lg text-on-surface-variant uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              : approvals.map((a) => (
                  <ApprovalRow key={a.id} approval={a} onClick={() => onRowClick(a.id)} />
                ))}
            {!loading && approvals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-body-md">
                  No approvals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
        <span className="text-body-sm text-on-surface-variant">
          {total > 0 ? `Showing ${start}-${end} of ${total} results` : 'No results'}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={onPrevPage}
            className="p-2 border border-outline-variant rounded hover:bg-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            disabled={!hasNext || loading}
            onClick={onNextPage}
            className="p-2 border border-outline-variant rounded hover:bg-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
