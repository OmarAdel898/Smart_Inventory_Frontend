import type { Filters } from '@/pages/ApprovalQueue/types';

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
}

export default function FilterBar({ filters, onChange, onApply }: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-100 gap-4">
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] bg-white shadow-sm">
          <span className="text-gray-400 font-semibold">Agent Type:</span>
          <select
            value={filters.agentType}
            onChange={(e) => onChange({ ...filters, agentType: e.target.value })}
            className="bg-transparent border-none p-0 focus:ring-0 text-gray-900 font-medium cursor-pointer outline-none w-[130px]"
          >
            <option>All Types</option>
            <option>Reorder Agent</option>
            <option>Negotiation Agent</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] bg-white shadow-sm">
          <span className="text-gray-400 font-semibold">Status:</span>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="bg-transparent border-none p-0 focus:ring-0 text-gray-900 font-medium cursor-pointer outline-none w-[130px]"
          >
            <option>All Statuses</option>
            <option>Pending Review</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      </div>
      <div className="ml-auto flex gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={() => { onChange({ agentType: 'All Types', status: 'All Statuses' }); setTimeout(onApply, 50); }}
          className="px-4 py-1.5 text-[13px] font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors bg-white shadow-sm"
        >
          Clear
        </button>
        <button
          onClick={onApply}
          className="px-4 py-1.5 text-[13px] font-bold rounded-full text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
