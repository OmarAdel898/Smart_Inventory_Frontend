import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory_2' },
  { to: '/vendors', label: 'Vendors', icon: 'handshake' },
  { to: '/approvals', label: 'Approvals', icon: 'fact_check' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: 'contract' },
  { to: '/negotiations', label: 'Negotiations', icon: 'contract' },
  { to: '/anomalies', label: 'Anomalies', icon: 'warning' },
  { to: '/assistant', label: 'Assistant', icon: 'assistant' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen border-r border-outline-variant bg-surface-container-low flex flex-col p-4 z-40">
      <div className="px-2 py-6 mb-6">
        <h1 className="text-xl font-semibold text-primary">StockSavvy</h1>
        <p className="text-[11px] font-semibold uppercase tracking-wider mt-1 text-on-surface-variant">
          Enterprise Inventory
        </p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 ease-in-out ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-medium'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
