import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/approvals', label: 'Approvals' },
  { to: '/anomalies', label: 'Anomalies' },
  { to: '/purchase-orders', label: 'Purchase Orders' },
  { to: '/negotiations', label: 'Negotiations' },
  { to: '/assistant', label: 'Assistant' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-navy text-on-primary flex flex-col shrink-0">
      <div className="flex items-center gap-2.5 px-6 pb-6 pt-6 border-b border-white/10 mb-4">
        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-lg">
          <span className="material-symbols-outlined">inventory_2</span>
        </div>
        <span className="text-lg font-semibold">StockSavvy</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/12 text-on-primary'
                  : 'text-white/70 hover:bg-white/8 hover:text-on-primary'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
