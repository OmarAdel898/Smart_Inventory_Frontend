import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '@/api/_shared';
import { useAuthStore } from '@/store/authStore';

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function TopAppBar() {
  const user = useAuthStore((s) => s.user);
  const roleLabel = user?.role ? formatRole(user.role) : '';
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatarUrl]);

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

  return (
    <header className="h-16 shrink-0 border-b border-outline-variant bg-surface flex items-center justify-between px-8">
      <div className="flex items-center relative w-96">
        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-[20px]">
          search
        </span>
        <input
          className="w-full h-10 pl-10 pr-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary text-sm outline-none transition-colors placeholder:text-outline"
          placeholder="Search SKUs, Vendors, or Actions..."
          type="text"
        />
      </div>
      <div className="flex items-center gap-6">
        <button className="text-on-surface-variant hover:text-primary transition-opacity relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-3">
          {roleLabel && (
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider hidden md:block">
              {roleLabel}
            </span>
          )}
          <button className="text-on-surface-variant hover:text-primary transition-opacity flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-container-lowest flex items-center justify-center shadow-sm">
              {avatarSrc && !avatarFailed ? (
                <img
                  className="w-full h-full object-cover"
                  src={avatarSrc}
                  alt="User avatar"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="text-[11px] font-semibold text-on-surface-variant">
                  {initials}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
