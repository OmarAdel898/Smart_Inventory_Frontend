import { create } from 'zustand';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/api/notifications';
import { API_BASE } from '@/api/_shared';

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
  entityMap: Record<string, string>;
  entitiesLoaded: boolean;
  loadEntities: () => Promise<void>;
  formatMessage: (msg: string) => string;
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
    entityMap: {},
    entitiesLoaded: false,

    loadEntities: async () => {
      if (get().entitiesLoaded) return;
      try {
        const tokenMatch = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
        const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        
        const [skus, vendors, warehouses, users] = await Promise.all([
          fetch(`${API_BASE}/sku`, { headers }).then(r => r.json()),
          fetch(`${API_BASE}/vendors`, { headers }).then(r => r.json()),
          fetch(`${API_BASE}/warehouses`, { headers }).then(r => r.json()),
          fetch(`${API_BASE}/users`, { headers }).then(r => r.json()),
        ]);

        const map: Record<string, string> = {};
        const process = (res: any) => {
          const arr = res?.data || (Array.isArray(res) ? res : []);
          arr.forEach((item: any) => {
            if (item.id && item.name) {
              map[item.id] = item.name;
              map[item.id.substring(0, 8)] = item.name;
            }
          });
        };
        process(skus);
        process(vendors);
        process(warehouses);
        process(users);
        
        set({ entityMap: map, entitiesLoaded: true });
      } catch (e) {
        console.error('Failed to load entities for notifications', e);
      }
    },

    formatMessage: (msg: string) => {
      if (!msg) return msg;
      const { entityMap } = get();
      return msg.replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b|\b[0-9a-f]{8}\b/gi, (match) => {
        return entityMap[match.toLowerCase()] || match;
      });
    },

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
