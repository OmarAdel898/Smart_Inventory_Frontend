import type { Filters } from '@/pages/ApprovalQueue/types';

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
}

export default function FilterBar({ filters, onChange, onApply }: FilterBarProps) {
  return (
    <div className="bg-surface-lowest p-4 rounded-lg border border-outline-variant mb-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Agent Type:</span>
        <select
          value={filters.agentType}
          onChange={(e) => onChange({ ...filters, agentType: e.target.value })}
          className="bg-surface border-outline-variant rounded-md px-3 py-1.5 text-body-sm focus:ring-secondary focus:border-secondary transition-all"
        >
          <option>All Types</option>
          <option>Reorder Agent</option>
          <option>Negotiation Agent</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Status:</span>
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="bg-surface border-outline-variant rounded-md px-3 py-1.5 text-body-sm focus:ring-secondary focus:border-secondary transition-all"
        >
          <option>All Statuses</option>
          <option>Pending Review</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={() => onChange({ agentType: 'All Types', status: 'All Statuses' })}
          className="px-4 py-1.5 text-body-sm font-medium border border-outline-variant rounded-md hover:bg-surface-container-low transition-colors"
        >
          Clear Filters
        </button>
        <button
          onClick={onApply}
          className="px-4 py-1.5 text-body-sm font-medium bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
