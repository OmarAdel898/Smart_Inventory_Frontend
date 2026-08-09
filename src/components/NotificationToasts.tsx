import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { getNotificationLink } from '@/lib/notificationLinks';
import type { NotificationSeverity } from '@/api/notifications';

const AUTO_DISMISS_MS: Record<NotificationSeverity, number | null> = {
  info: 6000,
  warning: 8000,
  critical: null,
};

function ToastCard({ toastKey }: { toastKey: string }) {
  const navigate = useNavigate();
  const notification = useNotificationStore((s) =>
    s.toasts.find((t) => t.key === toastKey)?.notification,
  );
  const removeToast = useNotificationStore((s) => s.removeToast);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  useEffect(() => {
    if (!notification) return;
    const ms = AUTO_DISMISS_MS[notification.severity];
    if (ms == null) return;
    const timer = setTimeout(() => removeToast(toastKey), ms);
    return () => clearTimeout(timer);
  }, [notification, removeToast, toastKey]);

  if (!notification) return null;

  const handleOpen = () => {
    const id = notification.id;
    removeToast(toastKey);
    void markAsRead(id);
    navigate(getNotificationLink(notification));
  };

  const styles: Record<NotificationSeverity, string> = {
    info: 'bg-[#E6F4FF] border-[#0066CC]/20 text-gray-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    critical: 'bg-[#B30024] border-[#B30024] text-white',
  };

  const Icon =
    notification.severity === 'critical'
      ? AlertOctagon
      : notification.severity === 'warning'
        ? AlertTriangle
        : Info;

  const iconColor =
    notification.severity === 'critical' ? 'text-white' : 'text-current';

  return (
    <div
      role="alert"
      onClick={handleOpen}
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-sm pointer-events-auto cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-top-4 hover:shadow-md ${styles[notification.severity]}`}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold leading-snug">{notification.title}</p>
        <p className="text-[13px] mt-0.5 opacity-90 leading-snug line-clamp-2">{notification.message}</p>
      </div>
      <button
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          removeToast(toastKey);
        }}
        className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function NotificationToasts() {
  const toasts = useNotificationStore((s) => s.toasts);

  return (
    <div className="fixed top-[88px] right-6 z-[100] flex flex-col gap-2 max-w-[380px] w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.key} toastKey={t.key} />
      ))}
    </div>
  );
}
