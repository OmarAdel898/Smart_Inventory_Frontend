import { useState, useCallback } from 'react';
import { approveApproval, rejectApproval, negotiateApproval } from '@/api/approvals';
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

export default function ApprovalSideSheet({ isOpen, approval, onClose, onStatusChanged, onApproved }: ApprovalSideSheetProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [negotiating, setNegotiating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedPayloadRaw, setEditedPayloadRaw] = useState('');
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const canApprove = can('approvals.approve');
  const canReject = can('approvals.reject');
  const canEditPayload = can('approvals.editPayload');

  const handleApprove = useCallback(async () => {
    if (!approval) return;
    setApproving(true);
    setError(null);
    try {
      let editedPayload: object | undefined;
      if (editedPayloadRaw.trim()) {
        try { editedPayload = JSON.parse(editedPayloadRaw); }
        catch { throw new Error('Invalid JSON in payload edit'); }
      }
      const result = await approveApproval(approval.id, {
        reviewedBy: user?.id || '',
        ...(editedPayload ? { editedPayload } : {}),
      });
      onStatusChanged(approval.id, 'approved');
      onApproved?.(approval, result.data?.createdPoIds ?? []);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  }, [approval, editedPayloadRaw, user, onStatusChanged, onApproved, onClose]);

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

  const handleCopy = useCallback(async () => {
    if (!approval) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(approval.payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [approval]);

  const proposedValue = approval ? getProposedValue(approval.payload) : 0;
  const confidenceScore = approval ? getConfidenceScore(approval.payload) : 0;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] overlay-bg"
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
          <button onClick={onClose} className="p-2 hover:bg-gray-50-low rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
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
                    ? `Approved by ${approval.reviewedBy?.substring(0, 8) ?? 'unknown'}`
                    : approval.status === 'deferred'
                      ? `Deferred to negotiation by ${approval.reviewedBy?.substring(0, 8) ?? 'unknown'}`
                      : `Rejected by ${approval.reviewedBy?.substring(0, 8) ?? 'unknown'}`}
                  {approval.reviewedAt ? ` on ${formatDate(approval.reviewedAt)}` : ''}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <p className="text-label-md text-gray-500 uppercase mb-1">Proposed Value</p>
                  <p className="text-headline-sm font-semibold">
                    ${proposedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <div className="bg-gray-100/5 border-l-4 border-secondary p-4 rounded-r-lg">
                  <p className="text-body-md text-gray-900 leading-relaxed italic">
                    {approval.reasoning || 'No reasoning provided.'}
                  </p>
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
                        net-{approval.payload.paymentTermsDays ?? 30}
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

                  {approval.payload.composite && (
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

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-headline-sm font-semibold text-gray-900">Request Payload</h4>
                  <button onClick={handleCopy} className="text-gray-700 text-label-lg uppercase tracking-wide hover:underline">
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <div className="bg-[#0066CC] text-gray-700-fixed-dim font-mono-data text-[13px] p-4 rounded-lg overflow-x-auto leading-relaxed border border-primary-container shadow-inner">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(approval.payload, null, 2)}</pre>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-headline-sm font-semibold text-gray-900">Approval Comments / Payload Edit</h4>
                    {!canEditPayload && (
                      <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
                    )}
                  </div>
                </div>
                {canEditPayload ? (
                  <textarea
                    value={editedPayloadRaw}
                    onChange={(e) => setEditedPayloadRaw(e.target.value)}
                    className="w-full h-32 bg-gray-50-low border border-gray-200 rounded-lg p-4 text-body-md focus:ring-secondary focus:border-secondary transition-all resize-none font-mono-data text-[13px]"
                    placeholder='Optional: Enter JSON to merge into the payload, e.g. {"priority": "HIGH"}'
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-50/50 border border-gray-200 rounded-lg p-4 font-mono-data text-[13px] text-gray-900/70 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(approval.payload, null, 2)}</pre>
                  </div>
                )}
                <p className="text-[11px] text-gray-500 mt-2 italic">
                  Submitting with edits will re-run agent validation before execution.
                </p>
              </section>
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