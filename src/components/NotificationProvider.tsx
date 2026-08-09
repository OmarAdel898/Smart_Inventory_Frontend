import { useEffect, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '@/api/_shared';
import type { Notification } from '@/api/notifications';
import { useNotificationStore } from '@/store/notificationStore';
import { getAccessTokenFromCookie } from '@/lib/auth';
import NotificationToasts from '@/components/NotificationToasts';

/**
 * Owns the Socket.IO connection for the authenticated session.
 *
 * - Connects once with the JWT access token (handshake.auth.token).
 * - On `notification:created` dedupes by id, prepends to the list, bumps the
 *   unread badge and shows a severity-styled toast.
 * - Falls back to REST polling when the socket cannot connect/disconnects.
 */
export default function NotificationProvider({ children }: { children: ReactNode }) {
  const addIncoming = useNotificationStore((s) => s.addIncoming);
  const addToast = useNotificationStore((s) => s.addToast);
  const refresh = useNotificationStore((s) => s.refresh);
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAccessTokenFromCookie();
    if (!token) return;

    let disposed = false;

    // REST catch-up on mount so a fresh load / reconnect never misses events.
    void refresh();

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const seen = new Set<string>(useNotificationStore.getState().notifications.map((n) => n.id));

    socket.on('connect', () => {
      if (disposed) return;
      void refreshUnreadCount();
    });

    socket.on('notification:created', (notification: Notification) => {
      if (disposed) return;
      if (seen.has(notification.id)) return;
      seen.add(notification.id);
      addIncoming(notification);
      addToast(notification);
    });

    socket.on('connect_error', () => {
      // Socket rejected (bad token / server down) -> keep list fresh via REST.
      if (!disposed) void refresh();
    });

    socket.on('disconnect', () => {
      if (!disposed) void refresh();
    });

    return () => {
      disposed = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addIncoming, addToast, refresh, refreshUnreadCount]);

  return (
    <>
      {children}
      <NotificationToasts />
    </>
  );
}
