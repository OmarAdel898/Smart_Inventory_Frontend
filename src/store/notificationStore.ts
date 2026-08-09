import { create } from 'zustand';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/api/notifications';

const MAX_LIST = 50;
const FALLBACK_LIMIT = 20;

export interface NotificationToast {
  key: string;
  notification: Notification;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  toasts: NotificationToast[];
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  addIncoming: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addToast: (notification: Notification) => void;
  removeToast: (key: string) => void;
}

const CHANNEL_NAME = 'stocksavvy:notifications';

function broadcastCount(count: number): void {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'unread-count', count });
    channel.close();
  } catch {
    /* ignore */
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        const message = event.data as { type?: string; count?: number };
        if (message?.type === 'unread-count' && typeof message.count === 'number') {
          set((state) => (state.unreadCount === message.count ? state : { unreadCount: message.count }));
        }
      };
    } catch {
      /* ignore */
    }
  }

  return {
    notifications: [],
    unreadCount: 0,
    toasts: [],
    loaded: false,
    error: null,

    refresh: async () => {
      try {
        const [list, count] = await Promise.all([
          fetchNotifications({ page: 1, limit: FALLBACK_LIMIT }),
          fetchUnreadCount(),
        ]);
        set((state) => {
          const merged = [...list.data, ...state.notifications];
          const unique = new Map(merged.map((n) => [n.id, n])).values();
          return {
            notifications: Array.from(unique).slice(0, MAX_LIST),
            unreadCount: count,
            loaded: true,
            error: null,
          };
        });
      } catch {
        set({ loaded: true });
      }
    },

    refreshUnreadCount: async () => {
      try {
        const count = await fetchUnreadCount();
        if (count !== get().unreadCount) {
          set({ unreadCount: count });
          broadcastCount(count);
        }
      } catch {
        /* ignore */
      }
    },

    addIncoming: (notification) => {
      set((state) => {
        const exists = state.notifications.some((n) => n.id === notification.id);
        if (exists) {
          return {
            notifications: state.notifications.map((n) =>
              n.id === notification.id ? { ...n, ...notification } : n,
            ),
          };
        }
        const unreadCount = state.unreadCount + (notification.isRead ? 0 : 1);
        broadcastCount(unreadCount);
        return {
          notifications: [notification, ...state.notifications].slice(0, MAX_LIST),
          unreadCount,
          error: null,
        };
      });
    },

    markAsRead: async (id) => {
      const wasUnread = get().notifications.some((n) => n.id === id && !n.isRead);
      if (wasUnread) {
        set((state) => {
          const unreadCount = Math.max(0, state.unreadCount - 1);
          broadcastCount(unreadCount);
          return {
            unreadCount,
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() } : n,
            ),
          };
        });
      }
      try {
        const updated = await markNotificationRead(id);
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...updated } : n)),
        }));
      } catch {
        await get().refreshUnreadCount();
      }
    },

    markAllAsRead: async () => {
      if (get().unreadCount === 0) return;
      set((state) => ({
        unreadCount: 0,
        notifications: state.notifications.map((n) => (n.isRead ? n : { ...n, isRead: true })),
      }));
      broadcastCount(0);
      try {
        await markAllNotificationsRead();
      } catch {
        await get().refreshUnreadCount();
      }
    },

    addToast: (notification) => {
      set((state) => {
        if (state.toasts.some((t) => t.key === notification.id)) return state;
        return { toasts: [...state.toasts, { key: notification.id, notification }].slice(-5) };
      });
    },

    removeToast: (key) => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.key !== key) }));
    },
  };
});
