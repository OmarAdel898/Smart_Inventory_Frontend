import type { Approval } from '@/pages/ApprovalQueue/types';
import { formatAgentType, formatStep, formatStatus, formatRequestId, formatDate } from '@/pages/ApprovalQueue/types';
import { Eye } from 'lucide-react';
import { usePermissions } from '@/hooks/useCan';

interface ApprovalRowProps {
  approval: Approval;
  onClick: () => void;
}

const iconMap: Record<string, string> = {
  reorder: 'inventory',
  negotiation: 'handshake',
};

const agentIconBg: Record<string, string> = {
  reorder: 'bg-blue-50/30 text-blue-700',
  negotiation: 'bg-gray-100/10 text-gray-700',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function ApprovalRow({ approval, onClick }: ApprovalRowProps) {
  const { can } = usePermissions();
  const canReview = can('approvals.approve') || can('approvals.reject');

  return (
    <tr
      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <td className="px-6 py-4 align-middle">
        <span className="text-[13px] font-bold text-[#0066CC] group-hover:underline">{formatRequestId(approval.id)}</span>
      </td>
      <td className="px-6 py-4 align-middle">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined p-1 rounded text-[16px] ${agentIconBg[approval.agentType] || ''}`}>
            {iconMap[approval.agentType] || 'inventory'}
          </span>
          <span className="text-[13px] font-medium text-gray-900">{formatAgentType(approval.agentType)}</span>
        </div>
      </td>
      <td className="px-6 py-4 align-middle">
        <span className="text-[13px] font-medium text-gray-500">{formatStep(approval.agentType, approval.stepNumber)}</span>
      </td>
      <td className="px-6 py-4 align-middle">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusStyles[approval.status] || ''}`}>
          {formatStatus(approval.status)}
        </span>
      </td>
      <td className="px-6 py-4 align-middle text-[13px] font-medium text-gray-500 font-mono">{formatDate(approval.createdAt)}</td>
      <td className="px-6 py-4 align-middle text-right">
        {approval.status === 'pending' && canReview ? (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="px-4 py-1.5 text-[13px] font-bold rounded-full text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all"
          >
            Review
          </button>
        ) : (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="p-1.5 rounded-full font-bold text-gray-400 hover:bg-[#E6F4FF] hover:text-[#0066CC] transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
