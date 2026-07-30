import { NavLink, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';

const linkConfig = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', perm: 'sidebar.dashboard' as const },
  { to: '/users', label: 'Users', icon: 'group', perm: 'sidebar.users' as const },
  { to: '/inventory', label: 'Inventory', icon: 'inventory_2', perm: 'sidebar.inventory' as const },
  { to: '/warehouses', label: 'Warehouses', icon: 'warehouse', perm: 'sidebar.warehouses' as const },
  { to: '/vendors', label: 'Vendors', icon: 'handshake', perm: 'sidebar.vendors' as const },
  { to: '/approvals', label: 'Approvals', icon: 'fact_check', perm: 'sidebar.approvals' as const },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: 'contract', perm: 'sidebar.purchaseOrders' as const },
  { to: '/negotiations', label: 'Negotiations', icon: 'contract', perm: 'sidebar.negotiations' as const },
  { to: '/anomalies', label: 'Anomalies', icon: 'warning', perm: 'sidebar.anomalies' as const },
  { to: '/assistant', label: 'Assistant', icon: 'assistant', perm: 'sidebar.assistant' as const },
];

export default function Sidebar() {
  const { can } = usePermissions();
  const links = linkConfig.filter((l) => can(l.perm));
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
      <div className="mt-auto pt-4 border-t border-outline-variant">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 ease-in-out text-error hover:bg-error/10"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
