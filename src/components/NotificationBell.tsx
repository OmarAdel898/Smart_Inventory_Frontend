import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Inbox, ExternalLink } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { getNotificationIcon, getNotificationLink } from '@/lib/notificationLinks';
import type { Notification } from '@/api/notifications';

const MAX_PREVIEW = 8;

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const formatMessage = useNotificationStore((s) => s.formatMessage);
  const loadEntities = useNotificationStore((s) => s.loadEntities);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadEntities();
    }
  }, [isOpen, loadEntities]);

  const preview = useMemo(() => notifications.slice(0, MAX_PREVIEW), [notifications]);

  const handleItemClick = (notification: Notification) => {
    setIsOpen(false);
    void markAsRead(notification.id);
    navigate(getNotificationLink(notification));
  };

  return (
    <div className="relative flex items-center h-full" ref={dropdownRef}>
      <button
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative text-[#6C5CE7] hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell className="w-[22px] h-[22px]" fill="currentColor" strokeWidth={0} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#6C5CE7] text-white text-[10px] font-bold flex items-center justify-center border-[2px] border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[68px] right-0 w-[380px] bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[16px] font-bold text-gray-900">Notifications</span>
            <button
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0066CC] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          </div>

          <div className="h-[1px] bg-gray-100" />

          {preview.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Inbox className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-[14px] font-semibold text-gray-700">You're all caught up</p>
              <p className="text-[13px] text-gray-500 mt-1">New alerts will appear here.</p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
              {preview.map((notification) => {
                const { icon: Icon, className: iconClass } = getNotificationIcon(notification.type);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleItemClick(notification)}
                    className={`w-full flex items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 ${
                      !notification.isRead ? 'bg-[#E6F4FF]/40' : ''
                    }`}
                  >
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${iconClass}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={`text-[14px] font-bold truncate ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 shrink-0 rounded-full bg-[#6C5CE7]" />
                        )}
                      </span>
                      <span className="block text-[13px] text-gray-500 mt-0.5 truncate">
                        {formatMessage(notification.message)}
                      </span>
                      <span className="block text-[11px] text-gray-400 mt-1 font-medium">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="h-[1px] bg-gray-100" />
          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/notifications');
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-[#0066CC] hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
