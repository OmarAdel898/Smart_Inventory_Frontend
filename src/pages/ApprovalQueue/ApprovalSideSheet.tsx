import { useState, useCallback, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { approveApproval, rejectApproval, negotiateApproval } from '@/api/approvals';
import { API_BASE } from '@/api/_shared';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/useCan';
import type { Approval } from '@/pages/ApprovalQueue/types';
import { formatAgentType, formatDate, getProposedValue, getConfidenceScore, formatRequestId } from '@/pages/ApprovalQueue/types';

interface ApprovalSideSheetProps {
  isOpen: boolean;
  approval: Approval | null;
  onClose: () => void;
  onStatusChanged: (id: string, newStatus: 'approved' | 'rejected' | 'deferred') => void;
  onApproved?: (approval: Approval, createdPoIds: string[]) => void;
}

const HighlightedText = ({ text }: { text: string }) => {
  const terms = ['zero', 'tco', 'holding cost', 'sole vendor', 'capital efficiency', 'excess inventory', 'minimal ordering', 'penalized', 'minimally replenish'];
  const patternSource = `(\\b\\d+(?:\\.\\d+)?\\b|\\b${terms.join('\\b|\\b')}\\b)`;
  const regex = new RegExp(patternSource, 'gi');
  const matchRegex = new RegExp(`^${patternSource}$`, 'i');
  
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (matchRegex.test(part)) {
          return <span key={i} className="font-semibold text-gray-900">{part}</span>;
        }
        return <span key={i} className="text-gray-700">{part}</span>;
      })}
    </>
  );
};

const parseReasoning = (text: string) => {
  if (!text) return <p className="text-body-md text-gray-500 italic px-2">No reasoning provided.</p>;

  // Normalize spaces and remove newlines so the paragraph becomes a flat string for sentence splitting
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const sentences = cleanText.split(/(?<=\.)\s+/).filter(s => s.trim().length > 0);

  const categories = [
    { id: 'status', title: 'Inventory Status', icon: 'inventory_2', color: 'text-blue-700', bg: 'bg-blue-50/50', border: 'border-blue-200', headBg: 'bg-blue-100/50', items: [] as string[] },
    { id: 'action', title: 'Recommendation Rationale', icon: 'lightbulb', color: 'text-amber-700', bg: 'bg-amber-50/50', border: 'border-amber-200', headBg: 'bg-amber-100/50', items: [] as string[] },
    { id: 'financial', title: 'Financial Impact', icon: 'payments', color: 'text-emerald-700', bg: 'bg-emerald-50/50', border: 'border-emerald-200', headBg: 'bg-emerald-100/50', items: [] as string[] },
    { id: 'other', title: 'Additional Notes', icon: 'info', color: 'text-gray-700', bg: 'bg-gray-50/50', border: 'border-gray-200', headBg: 'bg-gray-100/50', items: [] as string[] }
  ];

  sentences.forEach(s => {
    const lower = s.toLowerCase();
    if (lower.includes('tco') || lower.includes('cost') || lower.includes('capital') || lower.includes('efficiency') || lower.includes('penalized')) {
      categories[2].items.push(s);
    } else if (lower.includes('quantity') || lower.includes('capacity') || lower.includes('vendor') || lower.includes('suggests') || lower.includes('recommended') || lower.includes('replenish')) {
      categories[1].items.push(s);
    } else if (lower.includes('threshold') || lower.includes('demand') || lower.includes('stock') || lower.includes('inventory')) {
      categories[0].items.push(s);
    } else {
      categories[3].items.push(s);
    }
  });

  const activeCategories = categories.filter(c => c.items.length > 0);

  // If we couldn't categorize into the main 3, just show a plain list but nicely formatted
  if (activeCategories.length === 1 && activeCategories[0].id === 'other') {
    return (
      <ul className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        {sentences.map((sentence, idx) => (
          <li key={idx} className="flex gap-3 text-body-md text-gray-800 leading-relaxed items-start">
             <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
             <div><HighlightedText text={sentence} /></div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activeCategories.map(cat => (
        <div key={cat.id} className={`rounded-xl border ${cat.border} ${cat.bg} overflow-hidden shadow-sm`}>
          <div className={`px-4 py-2.5 border-b border-black/5 ${cat.headBg} flex items-center gap-2`}>
            <span className={`material-symbols-outlined text-[18px] ${cat.color}`}>{cat.icon}</span>
            <h5 className={`text-label-md font-bold ${cat.color} uppercase tracking-wider text-[11px]`}>{cat.title}</h5>
          </div>
          <ul className="p-3.5 space-y-2.5">
            {cat.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-body-md items-start leading-relaxed">
                {cat.items.length > 1 ? (
                  <span className={`${cat.color} opacity-40 mt-[3px] shrink-0 text-[10px]`}>•</span>
                ) : (
                  <span className={`${cat.color} opacity-0 mt-[3px] shrink-0 w-1 hidden`}></span>
                )}
                <div className="flex-1">
                  <HighlightedText text={item} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default function ApprovalSideSheet({ isOpen, approval, onClose, onStatusChanged, onApproved }: ApprovalSideSheetProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [negotiating, setNegotiating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const canApprove = can('approvals.approve');
  const canReject = can('approvals.reject');
  const canEditPayload = can('approvals.editPayload');

  const [users, setUsers] = useState<{id: string; name: string}[]>([]);
  useEffect(() => {
    if (isOpen) {
      const tokenMatch = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      fetch(`${API_BASE}/users`, { headers })
        .then(r => r.json())
        .then(body => {
           const list = body?.success === true ? body.data : Array.isArray(body) ? body : [];
           setUsers(Array.isArray(list) ? list : []);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach(u => { map[u.id] = u.name; });
    return map;
  }, [users]);

  const handleApprove = useCallback(async () => {
    if (!approval) return;
    setApproving(true);
    setError(null);
    try {
      const result = await approveApproval(approval.id, {
        reviewedBy: user?.id || '',
      });
      onStatusChanged(approval.id, 'approved');
      onApproved?.(approval, result.data?.createdPoIds ?? []);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  }, [approval, user, onStatusChanged, onApproved, onClose]);

  const handleReject = useCallback(async () => {
    if (!approval) return;
    setRejecting(true);
    setError(null);
    try {
      await rejectApproval(approval.id, { reviewedBy: user?.id || '' });
      onStatusChanged(approval.id, 'rejected');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  }, [approval, user, onStatusChanged, onClose]);

  const handleNegotiate = useCallback(async () => {
    if (!approval) return;
    setNegotiating(true);
    setError(null);
    try {
      await negotiateApproval(approval.id, { reviewedBy: user?.id || '' });
      onStatusChanged(approval.id, 'deferred');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to defer to negotiation');
    } finally {
      setNegotiating(false);
    }
  }, [approval, user, onStatusChanged, onClose]);

  const proposedValue = approval ? getProposedValue(approval.payload) : 0;
  const confidenceScore = approval ? getConfidenceScore(approval.payload) : 0;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] overlay-bg transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-screen w-full md:w-[600px] bg-white z-[70] shadow-2xl flex flex-col side-sheet-transition ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-headline-sm font-semibold text-gray-900">Approval Detail</h3>
            <p className="text-body-sm text-gray-500">
              {approval
                ? `${formatRequestId(approval.id)} \u2022 ${formatAgentType(approval.agentType)} Agent`
                : '\u00A0'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!approval ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-body-md">
            Select an approval to view details
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
              {error && (
                <div className="bg-red-50 text-white-container px-4 py-3 rounded-lg text-body-sm">
                  {error}
                </div>
              )}

              {approval.status !== 'pending' && (
                <div className={`px-4 py-3 rounded-lg text-body-sm ${
                  approval.status === 'approved'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : approval.status === 'deferred'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {approval.status === 'approved'
                    ? `Approved by ${approval.reviewedBy ? userMap[approval.reviewedBy] || approval.reviewedBy.substring(0, 8) : 'unknown'}`
                    : approval.status === 'deferred'
                      ? `Deferred to negotiation by ${approval.reviewedBy ? userMap[approval.reviewedBy] || approval.reviewedBy.substring(0, 8) : 'unknown'}`
                      : `Rejected by ${approval.reviewedBy ? userMap[approval.reviewedBy] || approval.reviewedBy.substring(0, 8) : 'unknown'}`}
                  {approval.reviewedAt ? ` on ${formatDate(approval.reviewedAt)}` : ''}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-label-md text-gray-500 uppercase mb-1">Proposed Value</p>
                  <p className="text-headline-sm font-semibold">
                    {approval.agentType === 'negotiation' 
                      ? `${proposedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` 
                      : `$${proposedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-label-md text-gray-500 uppercase mb-1">Confidence Score</p>
                  <p className="text-headline-sm font-semibold text-green-600">{confidenceScore}%</p>
                </div>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-gray-700">smart_toy</span>
                  <h4 className="text-headline-sm font-semibold text-gray-900">AI Reasoning</h4>
                </div>
                <div className="p-1 rounded-lg">
                  {parseReasoning(approval.reasoning || '')}
                </div>
              </section>

              {Array.isArray(approval.payload.kbSources) && approval.payload.kbSources.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-gray-700">attach_file</span>
                    <h4 className="text-headline-sm font-semibold text-gray-900">Knowledge Sources</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(approval.payload.kbSources as Array<{ id: string; sourceType: string; score: number }>).map((src) => (
                      <button
                        key={src.id}
                        onClick={() => navigator.clipboard.writeText(src.id)}
                        title={`${(src.score * 100).toFixed(1)}% match \u2022 ${src.id} (click to copy)`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 text-label-lg font-semibold text-secondary hover:bg-secondary/10 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>attach_file</span>
                        {src.sourceType.replace(/_/g, ' ')}
                        <span className="font-mono-data text-[10px] text-on-surface-variant">
                          {(src.score * 100).toFixed(1)}%
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 italic">
                    Documents the agent anchored its decision on. Click a source to copy its ID.
                  </p>
                </section>
              )}

              {approval.agentType === 'negotiation' && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-gray-700">swap_horiz</span>
                    <h4 className="text-headline-sm font-semibold text-gray-900">Deal Terms & Composite Value</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="text-label-md text-gray-500 uppercase mb-1">Requested Discount</p>
                      <p className="text-body-lg font-semibold">
                        {approval.payload.finalDiscountPercent != null
                          ? `${approval.payload.finalDiscountPercent}% (final)`
                          : `${approval.payload.requestedDiscountPercent ?? 0}%`}
                      </p>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="text-label-md text-gray-500 uppercase mb-1">Payment Terms</p>
                      <p className="text-body-lg font-semibold">
                        net-{Number(approval.payload.paymentTermsDays ?? 30)}
                      </p>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="text-label-md text-gray-500 uppercase mb-1">Shipping Cost</p>
                      <p className="text-body-lg font-semibold">
                        {Number(approval.payload.shippingCost) === 0 ? 'Vendor covers' : `$${approval.payload.shippingCost ?? 50}`}
                      </p>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <p className="text-label-md text-gray-500 uppercase mb-1">Value Score</p>
                      <p className="text-body-lg font-semibold text-green-600">
                        {approval.payload.valueScore != null ? `${approval.payload.valueScore}/100` : '\u2014'}
                      </p>
                    </div>
                  </div>

                  {approval.payload.composite != null && (
                    <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                      <p className="text-label-md text-gray-500 uppercase mb-2">Composite Value Breakdown</p>
                      <div className="grid grid-cols-2 gap-2 text-body-md">
                        <div className="flex justify-between"><span className="text-gray-600">Order value</span><span className="font-semibold">${Number((approval.payload.composite as any).orderValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Discount savings</span><span className="font-semibold text-green-700">${Number((approval.payload.composite as any).discountValueUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Term float value</span><span className="font-semibold text-green-700">${Number((approval.payload.composite as any).floatValueUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Shipping savings</span><span className="font-semibold text-green-700">${Number((approval.payload.composite as any).shippingSavingsUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        <div className="col-span-2 flex justify-between border-t border-secondary/20 pt-2">
                          <span className="font-semibold">Total composite value</span>
                          <span className="font-semibold text-green-700">${Number((approval.payload.composite as any).compositeValueUSD || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

            </div>

            {approval.status === 'pending' && (canApprove || canReject) ? (
              <div className="p-6 border-t border-gray-200 bg-gray-50-low flex gap-4 shrink-0">
                {canReject && (
                  <button
                    onClick={handleReject}
                    disabled={rejecting || approving}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-500/10 flex items-center justify-center gap-2 active:scale-95 duration-200 disabled:opacity-60"
                  >
                    {rejecting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="material-symbols-outlined">close</span>
                    )}
                    Reject
                  </button>
                )}
                {canReject && approval.agentType === 'reorder' && (
                  <button
                    onClick={handleNegotiate}
                    disabled={negotiating || approving || rejecting}
                    className="flex-1 px-6 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/10 flex items-center justify-center gap-2 active:scale-95 duration-200 disabled:opacity-60"
                    title="Defer this proposal to the negotiation agent"
                  >
                    {negotiating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="material-symbols-outlined">swap_horiz</span>
                    )}
                    Negotiate First
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={handleApprove}
                    disabled={approving || rejecting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm shadow-green-500/10 flex items-center justify-center gap-2 active:scale-95 duration-200 disabled:opacity-60"
                  >
                    {approving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="material-symbols-outlined">check_circle</span>
                    )}
                    Approve
                  </button>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}