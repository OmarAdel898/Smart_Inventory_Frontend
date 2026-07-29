import type { Approval } from '@/pages/ApprovalQueue/types';
import { formatAgentType, formatStep, formatStatus, formatRequestId, formatDate } from '@/pages/ApprovalQueue/types';
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
  reorder: 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant',
  negotiation: 'bg-secondary-container/10 text-secondary',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function ApprovalRow({ approval, onClick }: ApprovalRowProps) {
  const { can } = usePermissions();
  const canReview = can('approvals.approve') || can('approvals.reject');

  return (
    <tr
      className="hover:bg-surface-container-low transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <td className="px-6 py-4 font-mono-data text-[13px] text-secondary font-medium">
        {formatRequestId(approval.id)}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined p-1 rounded ${agentIconBg[approval.agentType] || ''}`}>
            {iconMap[approval.agentType] || 'inventory'}
          </span>
          <span className="text-body-md">{formatAgentType(approval.agentType)}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="text-body-sm text-on-surface-variant">{formatStep(approval.agentType, approval.stepNumber)}</span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusStyles[approval.status] || ''}`}>
          {formatStatus(approval.status)}
        </span>
      </td>
      <td className="px-6 py-4 font-mono-data text-[13px] text-on-surface-variant">{formatDate(approval.createdAt)}</td>
      <td className="px-6 py-4 text-right">
        {approval.status === 'pending' && canReview ? (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="px-4 py-1.5 text-body-sm font-bold bg-primary text-white rounded hover:bg-primary-container transition-all active:scale-95 shadow-sm"
          >
            Review
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors"
          >
            <span className="material-symbols-outlined">visibility</span>
          </button>
        )}
      </td>
    </tr>
  );
}
