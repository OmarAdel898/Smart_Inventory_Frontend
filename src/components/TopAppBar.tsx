import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '@/api/_shared';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/NotificationBell';
import {
  BookOpen,
  Sun,
  Moon,
  Monitor,
  Store,
  Share2,
  Settings,
  LogOut,
  Search
} from 'lucide-react';

export default function TopAppBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatarUrl]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const avatarSrc = useMemo(() => {
    const value = user?.avatarUrl?.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${API_BASE}${value}`;
    if (value.includes('/')) return `${API_BASE}/${value}`;
    return `${API_BASE}/uploads/avatars/${value}`;
  }, [user?.avatarUrl]);

  const initials = useMemo(() => {
    const source = (user?.name || user?.email || 'U').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }, [user?.email, user?.name]);

  const formattedDate = useMemo(() => {
    const d = new Date();
    const day = d.getDate();
    const ordinal = day + (day > 0 ? ['th', 'st', 'nd', 'rd'][(day > 3 && day < 21) || day % 10 > 3 ? 0 : day % 10] : '');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${ordinal} ${month}`;
  }, []);

  // Mock theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  return (
    <header className="h-[76px] shrink-0 bg-white flex items-center justify-between px-8 border-b border-gray-100 z-30 relative">
      <div className="flex items-center text-[15px] text-[#556987]">
        {formattedDate}
      </div>

      <div className="flex items-center gap-6 h-full">
        {/* Actions */}
        <div className="flex items-center gap-5">
          <NotificationBell />
        </div>

        {/* Divider */}
        <div className="w-[1px] h-8 bg-gray-200" />

        {/* Profile Dropdown */}
        <div className="relative flex items-center h-full" ref={dropdownRef}>
          <button
            className="flex items-center gap-2 cursor-pointer focus:outline-none transition-transform hover:scale-105"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#FFD9DF] text-[#B30024] flex items-center justify-center shadow-sm">
              {avatarSrc && !avatarFailed ? (
                <img
                  className="w-full h-full object-cover"
                  src={avatarSrc}
                  alt="User avatar"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="text-[14px] font-bold">
                  {initials}
                </span>
              )}
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-[68px] right-0 w-[300px] bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 py-3 z-50 transform origin-top-right transition-all">
              {/* User Info */}
              <div className="flex items-center gap-3 px-6 py-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FFD9DF] text-[#B30024] flex items-center justify-center shrink-0">
                  {avatarSrc && !avatarFailed ? (
                    <img
                      className="w-full h-full object-cover"
                      src={avatarSrc}
                      alt="User avatar"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span className="text-[16px] font-bold">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[16px] font-bold text-gray-900 truncate">
                    {user?.name || user?.username || 'Devon Lane'}
                  </span>
                  <span className="text-[14px] font-medium text-gray-500 truncate">
                    {user?.email || 'info@example.com'}
                  </span>
                </div>
              </div>

              <div className="h-[1px] bg-gray-100 mx-5 my-2" />

              {/* Links */}
              <div className="py-1 flex flex-col">
                <Link to="/profile" className="flex items-center gap-4 px-6 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors font-semibold text-[15px]" onClick={() => setIsDropdownOpen(false)}>
                  <Settings className="w-[22px] h-[22px] text-gray-400" strokeWidth={2.5} />
                  Settings
                </Link>
              </div>

              <div className="h-[1px] bg-gray-100 mx-5 my-2" />

              {/* Log out */}
              <div className="py-1">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-6 py-2.5 hover:bg-[#FFD9DF]/50 text-gray-600 hover:text-[#B30024] transition-colors font-semibold text-[15px]"
                >
                  <LogOut className="w-[22px] h-[22px] text-gray-400" strokeWidth={2.5} />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
