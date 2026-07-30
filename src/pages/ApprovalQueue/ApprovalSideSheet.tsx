import { useState, useCallback } from 'react';
import { approveApproval, rejectApproval } from '@/api/approvals';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/useCan';
import type { Approval } from '@/pages/ApprovalQueue/types';
import { formatAgentType, formatDate, getProposedValue, getConfidenceScore, formatRequestId } from '@/pages/ApprovalQueue/types';

interface ApprovalSideSheetProps {
  isOpen: boolean;
  approval: Approval | null;
  onClose: () => void;
  onStatusChanged: (id: string, newStatus: 'approved' | 'rejected') => void;
}

export default function ApprovalSideSheet({ isOpen, approval, onClose, onStatusChanged }: ApprovalSideSheetProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
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
      await approveApproval(approval.id, {
        reviewedBy: user?.id || '',
        ...(editedPayload ? { editedPayload } : {}),
      });
      onStatusChanged(approval.id, 'approved');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  }, [approval, editedPayloadRaw, user, onStatusChanged, onClose]);

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
        className={`fixed top-0 right-0 h-screen w-full md:w-[600px] bg-surface-lowest z-[70] shadow-2xl flex flex-col side-sheet-transition ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-outline-variant flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-headline-sm font-semibold text-on-surface">Approval Detail</h3>
            <p className="text-body-sm text-on-surface-variant">
              {approval
                ? `${formatRequestId(approval.id)} \u2022 ${formatAgentType(approval.agentType)} Agent`
                : '\u00A0'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {!approval ? (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-body-md">
            Select an approval to view details
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
              {error && (
                <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-body-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface border border-outline-variant rounded-lg">
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Proposed Value</p>
                  <p className="text-headline-sm font-semibold">
                    ${proposedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-surface border border-outline-variant rounded-lg">
                  <p className="text-label-md text-on-surface-variant uppercase mb-1">Confidence Score</p>
                  <p className="text-headline-sm font-semibold text-green-600">{confidenceScore}%</p>
                </div>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-secondary">smart_toy</span>
                  <h4 className="text-headline-sm font-semibold text-on-surface">AI Reasoning</h4>
                </div>
                <div className="bg-secondary-container/5 border-l-4 border-secondary p-4 rounded-r-lg">
                  <p className="text-body-md text-on-surface leading-relaxed italic">
                    {approval.reasoning || 'No reasoning provided.'}
                  </p>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-headline-sm font-semibold text-on-surface">Request Payload</h4>
                  <button onClick={handleCopy} className="text-secondary text-label-lg uppercase tracking-wide hover:underline">
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <div className="bg-primary text-secondary-fixed-dim font-mono-data text-[13px] p-4 rounded-lg overflow-x-auto leading-relaxed border border-primary-container shadow-inner">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(approval.payload, null, 2)}</pre>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-headline-sm font-semibold text-on-surface">Approval Comments / Payload Edit</h4>
                    {!canEditPayload && (
                      <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
                    )}
                  </div>
                </div>
                {canEditPayload ? (
                  <textarea
                    value={editedPayloadRaw}
                    onChange={(e) => setEditedPayloadRaw(e.target.value)}
                    className="w-full h-32 bg-surface-container-low border border-outline-variant rounded-lg p-4 text-body-md focus:ring-secondary focus:border-secondary transition-all resize-none font-mono-data text-[13px]"
                    placeholder='Optional: Enter JSON to merge into the payload, e.g. {"priority": "HIGH"}'
                  />
                ) : (
                  <div className="w-full h-32 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-mono-data text-[13px] text-on-surface/70 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(approval.payload, null, 2)}</pre>
                  </div>
                )}
                <p className="text-[11px] text-on-surface-variant mt-2 italic">
                  Submitting with edits will re-run agent validation before execution.
                </p>
              </section>
            </div>

            {canApprove || canReject ? (
              <div className="p-6 border-t border-outline-variant bg-surface-container-low flex gap-4 shrink-0">
                {canReject && (
                  <button
                    onClick={handleReject}
                    disabled={rejecting || approving}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 active:scale-95 duration-200 disabled:opacity-60"
                  >
                    {rejecting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="material-symbols-outlined">close</span>
                    )}
                    Reject
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={handleApprove}
                    disabled={approving || rejecting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-500/10 flex items-center justify-center gap-2 active:scale-95 duration-200 disabled:opacity-60"
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
