import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  UserCircle,
  Users,
  Package,
  Tags,
  Building2,
  ArrowRightLeft,
  Briefcase,
  FileCheck,
  FileText,
  AlertOctagon,
  Bot,
  Bell,
  LogOut,
  Menu,
  MoreVertical,
  Moon,
  Sun
} from 'lucide-react';

const overviewLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'sidebar.dashboard' as const },
  { to: '/notifications', label: 'Notifications', icon: Bell, perm: 'sidebar.notifications' as const },
  { to: '/inventory', label: 'Inventory', icon: Package, perm: 'sidebar.inventory' as const },
  { to: '/categories', label: 'Categories', icon: Tags, perm: 'sidebar.inventory' as const },
  { to: '/warehouses', label: 'Warehouses', icon: Building2, perm: 'sidebar.warehouses' as const },
  { to: '/stock-movements', label: 'Movements', icon: ArrowRightLeft, perm: 'sidebar.movements' as const },
  { to: '/vendors', label: 'Vendors', icon: Briefcase, perm: 'sidebar.vendors' as const },
  { to: '/approvals', label: 'Approvals', icon: FileCheck, perm: 'sidebar.approvals' as const },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: FileText, perm: 'sidebar.purchaseOrders' as const },
  { to: '/negotiations', label: 'Negotiations', icon: FileText, perm: 'sidebar.negotiations' as const },
  { to: '/anomalies', label: 'Anomalies', icon: AlertOctagon, perm: 'sidebar.anomalies' as const },
  { to: '/users', label: 'Users', icon: Users, perm: 'sidebar.users' as const },
  { to: '/assistant', label: 'Assistant', icon: Bot, perm: 'sidebar.assistant' as const },
];

export default function Sidebar() {
  const { can } = usePermissions();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const overview = overviewLinks.filter((l) => can(l.perm));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside 
      className={`shrink-0 h-screen border-r border-gray-100 bg-white flex flex-col z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[84px]' : 'w-64'}`}
    >
      {/* Top Header */}
      <div className={`flex items-center px-4 py-6 mb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div 
          className={`flex items-center gap-3 overflow-hidden whitespace-nowrap ${isCollapsed ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => isCollapsed && setIsCollapsed(false)}
          title={isCollapsed ? "Expand Sidebar" : undefined}
        >
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#0066CC] flex items-center justify-center text-white font-black text-lg shadow-sm">
            S
          </div>
          {!isCollapsed && (
            <span className="text-[20px] font-black text-gray-900 tracking-tight transition-opacity duration-300">
              StockSavvy
            </span>
          )}
        </div>
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3">
        {overview.length > 0 && (
          <div className="mb-6">
            {!isCollapsed && (
              <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 whitespace-nowrap">
                Overview
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {overview.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    title={isCollapsed ? link.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-in-out whitespace-nowrap ${
                        isActive
                          ? 'bg-[#E6F4FF] text-[#0066CC] font-bold shadow-sm'
                          : 'text-gray-500 font-semibold hover:bg-gray-50 hover:text-gray-900'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                    {!isCollapsed && <span className="text-[14px] leading-none">{link.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

      </nav>
    </aside>
  );
}
