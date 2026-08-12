import { useState, useEffect } from 'react';
import { fetchApprovals, approveApproval, rejectApproval } from '@/api/approvals';
import type { Approval } from '@/pages/ApprovalQueue/types';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

export default function Negotiations() {
  const [negotiations, setNegotiations] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
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
    if (!user || !selected) return;
    try {
      // Send edited content if it was changed
      const payload = { reviewedBy: user.id } as any;
      if (editedContent && editedContent !== selected.payload?.emailContent) {
        payload.editedPayload = {
          ...selected.payload,
          emailContent: editedContent
        };
      }
      
      await approveApproval(id, payload);
      setNegotiations(prev => prev.filter(n => n.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const selected = negotiations.find(n => n.id === selectedId);

  useEffect(() => {
    if (selected) {
      setIsEditing(false);
      setEditedContent((selected.payload?.emailContent as string) || '');
    }
  }, [selectedId, selected]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">Loading negotiations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4 text-red-700 shadow-sm">
        <span className="material-symbols-outlined text-2xl">error</span>
        <div>
          <h3 className="font-semibold text-lg">Error loading data</h3>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (negotiations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-500 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm m-4">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="material-symbols-outlined text-[48px] text-green-500">task_alt</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
        <p className="text-gray-500 max-w-md text-center">No pending negotiations require your approval right now. You're doing great!</p>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-8 bg-gray-50/50">
      {/* List Sidebar */}
      <div className="w-80 border-r border-gray-200/60 bg-white/80 backdrop-blur-xl flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-gray-100 z-10 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-lg">handshake</span>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Negotiations</h2>
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {negotiations.length} Pending Approval
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
          {negotiations.map(neg => {
            const isSelected = selectedId === neg.id;
            return (
              <button
                key={neg.id}
                onClick={() => setSelectedId(neg.id)}
                className={`group relative p-4 text-left rounded-xl transition-all duration-300 ${
                  isSelected 
                    ? 'bg-gradient-to-br from-indigo-50 to-blue-50/50 shadow-sm border border-indigo-100/50' 
                    : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                )}
                
                <div className="flex justify-between items-start mb-1.5">
                  <span className={`font-semibold truncate pr-2 ${isSelected ? 'text-indigo-950' : 'text-gray-900 group-hover:text-indigo-600 transition-colors'}`}>
                    {neg.payload?.vendorName as string || 'Vendor Negotiation'}
                  </span>
                  <span className={`text-xs whitespace-nowrap mt-1 ${isSelected ? 'text-indigo-500 font-medium' : 'text-gray-400'}`}>
                    {format(new Date(neg.createdAt), 'MMM d')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="material-symbols-outlined text-[16px] opacity-70">inventory_2</span>
                  <p className="truncate">SKU: {neg.payload?.skuId as string || 'Multiple'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Detail Area */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#FAFBFF]">
          {/* Header */}
          <div className="bg-white px-8 py-6 border-b border-gray-100 shadow-sm z-10 shrink-0">
            <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-2">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">Negotiations</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  <span className="text-indigo-600 font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded-md">
                    NEG-{selected.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {selected.payload?.vendorName as string || 'Vendor Details'}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  Edit Draft
                </button>
                <button 
                  onClick={() => handleApprove(selected.id)} 
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Approve & Send
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12 relative z-10">
              
              {/* Action Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/60 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0 shadow-inner z-10 border border-amber-200/50">
                  <span className="material-symbols-outlined text-amber-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                </div>
                <div className="flex-1 z-10">
                  <h3 className="text-lg font-bold text-amber-900 mb-1">Awaiting your approval</h3>
                  <p className="text-amber-700 text-sm leading-relaxed max-w-2xl">
                    The AI agent has drafted an outreach offer based on current market dynamics and previous history. 
                    Review the terms below and approve to initiate contact with the vendor.
                  </p>
                </div>
              </div>

              {/* Enhanced Timeline */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative">
                <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">history</span>
                  Negotiation Timeline
                </h3>
                
                <div className="relative pl-6">
                  {/* Vertical Line */}
                  <div className="absolute top-4 bottom-4 left-[23px] w-[2px] bg-gradient-to-b from-indigo-200 via-gray-200 to-gray-200 z-0"></div>

                  {/* Step 1 */}
                  <div className="relative z-10 flex gap-6 mb-12">
                    <div className="absolute -left-1.5 w-10 h-10 rounded-full bg-indigo-50 border-4 border-white flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                    </div>
                    <div className="flex-1 ml-6">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-bold text-gray-900">AI Evaluation & Strategy</h4>
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-md border border-green-200/50">Completed</span>
                      </div>
                      <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100/50 shadow-sm">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {selected.reasoning || "Analyzed context and generated negotiation strategy based on previous contracts and supplier history."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative z-10 flex gap-6">
                    <div className="absolute -left-1.5 w-10 h-10 rounded-full bg-white border-4 border-amber-100 flex items-center justify-center shadow-[0_0_0_2px_rgba(251,191,36,0.2)]">
                      <div className="absolute inset-0 rounded-full border-2 border-amber-400 border-dashed animate-[spin_4s_linear_infinite]"></div>
                      <span className="material-symbols-outlined text-[18px] text-amber-600 relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>draw</span>
                    </div>
                    <div className="flex-1 ml-6">
                      <div className="flex items-center gap-3 mb-3 mt-1">
                        <h4 className="text-base font-bold text-gray-900">Drafted Offer</h4>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-200/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending Approval
                        </span>
                      </div>
                      <div className="bg-white border-2 border-gray-100 rounded-xl shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-colors">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-blue-500"></div>
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-lg">mail</span>
                            <span className="text-sm font-semibold text-gray-700">Email Draft</span>
                          </div>
                          {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                              Edit
                            </button>
                          )}
                        </div>
                        <div className="p-6">
                          {isEditing ? (
                            <div className="flex flex-col gap-3">
                              <textarea
                                className="w-full h-48 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-800 font-sans resize-y bg-white"
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => {
                                  setIsEditing(false);
                                  setEditedContent((selected.payload?.emailContent as string) || '');
                                }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm shadow-indigo-200">Done</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                              {editedContent || 'Drafted email content will appear here.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FAFBFF]">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[40px] text-gray-400">handshake</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Negotiation Selected</h3>
          <p className="text-gray-500 max-w-sm text-center">Select a pending negotiation from the sidebar to review the AI's drafted offer and strategy.</p>
        </div>
      )}
    </div>
  );
}