export interface Approval {
  id: string;
  agentRunId: string;
  agentType: 'reorder' | 'negotiation';
  stepNumber: number;
  payload: Record<string, unknown>;
  reasoning: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApprovalsResponse {
  data: Approval[];
  meta: PaginationMeta;
}

export interface ApproveBody {
  reviewedBy: string;
  editedPayload?: object;
}

export interface RejectBody {
  reviewedBy: string;
}

export interface Filters {
  agentType: string;
  status: string;
}

const AGENT_LABELS: Record<string, string> = {
  reorder: 'Reorder',
  negotiation: 'Negotiation',
};

const STEP_LABELS: Record<string, Record<number, string>> = {
  reorder: { 1: 'Procurement Auth', 2: 'Auto-Fulfill Check', 3: 'Stock Level Override' },
  negotiation: { 1: 'Vendor Counter-Offer', 2: 'Price Negotiation', 3: 'Terms Review' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function formatAgentType(type: string): string {
  return AGENT_LABELS[type] || type;
}

export function formatStep(type: string, step: number): string {
  return STEP_LABELS[type]?.[step] || `Step ${step}`;
}

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function formatRequestId(id: string): string {
  return `#REQ-${id.substring(0, 5).toUpperCase()}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function getProposedValue(payload: Record<string, unknown>): number {
  const items = payload?.items as Array<Record<string, unknown>> | undefined;
  if (items) {
    return items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
  }
  return Number(payload?.proposedValue) || Number(payload?.amount) || 0;
}

export function getConfidenceScore(payload: Record<string, unknown>): number {
  return Number(payload?.confidenceScore) || Number(payload?.confidence) || 0;
}
