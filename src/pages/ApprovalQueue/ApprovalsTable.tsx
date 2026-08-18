import type { Approval } from '@/pages/ApprovalQueue/types';
import ApprovalRow from '@/pages/ApprovalQueue/ApprovalRow';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <tr className="animate-pulse border-b border-gray-50">
      <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </td>
      ))}
      <td className="px-6 py-4"></td>
    </tr>
  );
}

export default function ApprovalsTable({
  approvals, loading, total, page, limit, onRowClick, onPrevPage, onNextPage, hasNext,
}: ApprovalsTableProps) {
  const start = total > 0 ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Request ID</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Agent Type</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Step</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Status</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap">Created At</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-gray-500 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              : approvals.map((a) => (
                  <ApprovalRow key={a.id} approval={a} onClick={() => onRowClick(a.id)} />
                ))}
            {!loading && approvals.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-24 text-center text-[13px] font-medium text-gray-500">
                  No approvals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!loading && total > 0 && (
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30 rounded-b-xl">
          <button
            disabled={page <= 1}
            onClick={onPrevPage}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          
          <span className="text-[13px] font-medium text-gray-500">
            {total > 0 ? `Showing ${start}-${end} of ${total} results` : 'No results'}
          </span>
          
          <button
            disabled={!hasNext}
            onClick={onNextPage}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
