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
            <img
              className="w-8 h-8 rounded-full object-cover border border-outline-variant"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmWl0Epkp4EQQsMilOhaLPYoxXDZ_F8n8O7NQ75EcWRZseyyvy95iuMZFegaY1YORzuFXDJgJCBvDBCD3b87zFjnBpPbI3kjyOmmG5glr5qR4kyiMxRA668tpgDJvbddjAc4ZSvd-2qh9dbLlQDQKu2rHBypHW70quRC7a2OjWU7_JuIPXB7s5vMIto-cikDAtOdEMIvOInDsARWlifbV-uzloUFyUG542Cg-WYfgAbOYD1S-naSOmjd23GJKZMEW-PdvIICq-B7M"
              alt="User avatar"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
