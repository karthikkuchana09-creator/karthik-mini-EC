import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { useWebSocket } from '../hooks/useWebSocket';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      const list = Array.isArray(data) ? data : data.notifications || data.results || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch {}
    setLoading(false);
  }, []);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'notification') {
      toast(data.message || 'New notification', {
        icon: '🔔',
        duration: 4000,
      });
      setUnreadCount((prev) => prev + 1);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  useWebSocket({ onMessage: handleWsMessage });

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 60000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, loading, refreshNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
