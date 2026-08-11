import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Inbox, Loader2, RefreshCw } from 'lucide-react';
import {
  fetchNotifications,
  type Notification,
  type NotificationType,
} from '@/api/notifications';
import { useNotificationStore } from '@/store/notificationStore';
import { getNotificationIcon, getNotificationLink } from '@/lib/notificationLinks';

const PAGE_SIZE = 15;
const TYPE_LABELS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'approval.requested', label: 'Approval requests' },
  { value: 'lowstock.detected', label: 'Low stock' },
  { value: 'po.received', label: 'Purchase orders' },
  { value: 'vendor.responded', label: 'Vendor offers' },
];

type ReadFilter = 'all' | 'unread' | 'read';

export default function Notifications() {
  const navigate = useNavigate();
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const localUnread = useNotificationStore((s) => s.unreadCount);

  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const pageRef = useRef(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (page: number, append: boolean, overrides?: { read?: ReadFilter; type?: string }) => {
      const read = overrides?.read ?? readFilter;
      const type = overrides?.type ?? typeFilter;
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const res = await fetchNotifications({
          page,
          limit: PAGE_SIZE,
          ...(read !== 'all' ? { isRead: read === 'read' } : {}),
          ...(type ? { type: type as NotificationType } : {}),
        });
        if (!mountedRef.current) return;
        setItems((prev) => (append ? [...prev, ...res.data] : res.data));
        setTotal(res.meta?.total ?? 0);
        setHasNext(res.meta?.hasNextPage ?? false);
        pageRef.current = page;
        setError('');
      } catch (err) {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [readFilter, typeFilter],
  );

  useEffect(() => {
    pageRef.current = 1;
    void load(1, false);
  }, [load]);

  const handleFilterChange = (nextRead: ReadFilter, nextType: string) => {
    setReadFilter(nextRead);
    setTypeFilter(nextType);
    pageRef.current = 1;
    void load(1, false, { read: nextRead, type: nextType });
  };

  const handleItemClick = (notification: Notification) => {
    void markAsRead(notification.id);
    navigate(getNotificationLink(notification));
  };

  const tabs: { value: ReadFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread', count: localUnread },
    { value: 'read', label: 'Read' },
  ];

  return (
    <div className="bg-[#F8F9FA] min-h-[calc(100vh-4rem)] p-8 font-sans -m-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight tracking-tight">Notifications</h1>
          <p className="text-[15px] text-gray-500 mt-1">Keep track of approvals, alerts, and workflow updates.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load(1, false)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => void markAllAsRead()}
            disabled={localUnread === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all disabled:opacity-40"
          >
            <CheckCheck className="w-4 h-4 text-gray-500" /> Mark all read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value, typeFilter)}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                readFilter === tab.value ? 'bg-[#E6F4FF] text-[#0066CC]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#6C5CE7] text-white text-[10px] font-bold">
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => handleFilterChange(readFilter, e.target.value)}
          className="h-9 px-3 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
        >
          {TYPE_LABELS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#0066CC] animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-[14px] text-[#B30024]">{error}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-[16px] font-bold text-gray-800">You're all caught up</p>
          <p className="text-[14px] text-gray-500 mt-1">No notifications match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((notification) => {
            const { icon: Icon, className: iconClass } = getNotificationIcon(notification.type);
            return (
              <button
                key={notification.id}
                onClick={() => handleItemClick(notification)}
                className={`w-full flex items-start gap-4 p-4 bg-white border rounded-xl text-left shadow-sm hover:shadow-md transition-all ${
                  notification.isRead ? 'border-gray-200' : 'border-[#6C5CE7]/30 bg-[#F7F4FF]'
                }`}
              >
                <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${iconClass}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[15px] font-bold truncate ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notification.title}
                    </p>
                    <span className="text-[12px] text-gray-400 font-medium whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[14px] text-gray-500 mt-0.5">{notification.message}</p>
                </div>
                {!notification.isRead && <span className="w-2.5 h-2.5 mt-1.5 shrink-0 rounded-full bg-[#6C5CE7]" />}
              </button>
            );
          })}

          <div className="flex items-center justify-between pt-2 text-[13px] text-gray-500">
            <span>
              Showing {items.length} of {total} notifications
            </span>
            {hasNext && (
              <button
                onClick={() => void load(pageRef.current + 1, true)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] transition-all disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                Load more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
