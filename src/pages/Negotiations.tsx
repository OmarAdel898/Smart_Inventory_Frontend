import { useState, useEffect } from 'react';
import { fetchApprovals, approveApproval, rejectApproval } from '@/api/approvals';
import type { Approval } from '@/pages/ApprovalQueue/types';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

export default function Negotiations() {
  const [negotiations, setNegotiations] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadNegotiations();
  }, []);

  async function loadNegotiations() {
    try {
      setLoading(true);
      const res = await fetchApprovals({ agentType: 'negotiation', limit: 50 });
      const pending = res.data.filter(a => a.status === 'pending');
      setNegotiations(pending);
      if (pending.length > 0 && !selectedId) {
        setSelectedId(pending[0].id);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load negotiations');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    if (!user) return;
    try {
      await approveApproval(id, { reviewedBy: user.id });
      setNegotiations(prev => prev.filter(n => n.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const selected = negotiations.find(n => n.id === selectedId);

  if (loading) {
    return (
      <div className="flex justify-center p-xl">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-md bg-error-container text-on-error-container rounded">{error}</div>;
  }

  if (negotiations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-on-surface-variant pt-20">
        <span className="material-symbols-outlined text-[64px] mb-md opacity-50">task_alt</span>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">All Caught Up</h2>
        <p>No pending negotiations require your approval right now.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-8">
      {/* List Sidebar */}
      <div className="w-80 border-r border-outline-variant bg-surface-container-low overflow-y-auto">
        <div className="p-md border-b border-outline-variant">
          <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Active Negotiations</h2>
        </div>
        <div className="flex flex-col">
          {negotiations.map(neg => (
            <button
              key={neg.id}
              onClick={() => setSelectedId(neg.id)}
              className={`p-md text-left border-b border-outline-variant transition-colors hover:bg-surface-container-highest ${selectedId === neg.id ? 'bg-surface-container-highest border-l-4 border-l-primary' : ''}`}
            >
              <div className="flex justify-between items-start mb-xs">
                <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                  {neg.payload?.vendorName as string || 'Vendor Negotiation'}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                  {format(new Date(neg.createdAt), 'MMM d')}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                SKU: {neg.payload?.skuId as string || 'Multiple'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Detail Area */}
      {selected ? (
        <div className="flex-1 flex overflow-hidden bg-surface-bright">
          <div className="flex-1 overflow-y-auto px-xl py-lg">
            <div className="max-w-3xl mx-auto flex flex-col gap-lg pb-xl">
              <div>
                <div className="flex items-center gap-sm text-on-surface-variant font-label-md text-label-md mb-xs">
                  <span>Negotiations</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span>NEG-{selected.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface">{selected.payload?.vendorName as string || 'Vendor Details'}</h1>
              </div>

              <div className="bg-tertiary-fixed border border-tertiary-fixed-dim rounded-lg p-md flex flex-col sm:flex-row sm:items-start gap-md shadow-sm">
                <span className="material-symbols-outlined text-tertiary-container mt-[2px]" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                <div className="flex-1">
                  <h3 className="font-label-md text-label-md text-tertiary-container font-semibold">Awaiting your approval before this is sent</h3>
                  <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant mt-unit">The AI has drafted a counter-offer based on the strategy. Review the terms below and approve to send to the vendor.</p>
                </div>
                <div className="flex gap-sm shrink-0">
                  <button className="px-md py-sm bg-surface rounded text-on-surface-variant font-label-md text-label-md border border-outline-variant hover:bg-surface-container-lowest transition-colors">Edit Draft</button>
                  <button onClick={() => handleApprove(selected.id)} className="px-md py-sm bg-primary-container text-on-secondary rounded font-label-md text-label-md hover:opacity-90 transition-opacity">Approve & Send</button>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-md pt-md mt-sm">
                <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-outline-variant opacity-50 z-0"></div>

                <div className="relative z-10 flex gap-md mb-xl ml-xl pl-md border-l-2 border-secondary-fixed-dim border-dashed">
                  <div className="absolute -left-[23px] w-6 h-6 rounded-full bg-surface-bright flex items-center justify-center mt-1 border-2 border-outline-variant">
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">analytics</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">AI Evaluation & Strategy</div>
                    <div className="bg-surface-container px-md py-sm rounded-lg border-l-4 border-secondary-container">
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {selected.reasoning || "Analyzed context and generated negotiation strategy based on previous contracts and supplier history."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex gap-md">
                  <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center shrink-0 mt-1 border-2 border-surface-bright">
                    <span className="material-symbols-outlined text-[14px] text-on-secondary-container">draw</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-sm mb-xs">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">Drafted Counter-Offer</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Pending Approval</span>
                    </div>
                    <div className="bg-surface-container-lowest border-2 border-primary-fixed-dim rounded-lg p-md shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>
                      <p className="font-body-md text-body-md text-on-surface mb-md whitespace-pre-wrap">
                        {selected.payload?.emailContent as string || 'Drafted email content will appear here.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-surface-bright text-on-surface-variant">
          Select a negotiation to view details
        </div>
      )}
    </div>
  );
}
