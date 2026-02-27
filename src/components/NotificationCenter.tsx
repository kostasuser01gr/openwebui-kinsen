import { useState, useEffect, useRef } from 'react';
import type { Notification as NotifType } from '../lib/types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotifType[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) setNotifications(await res.json() as NotifType[]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-read', notificationId: id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (!unread.length) return;
    await fetch('/api/notifications', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-all-read', ids: unread }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const typeIcon: Record<string, string> = {
    escalation: '🔴', task: '📋', update: '📝', alert: '⚠️', system: 'ℹ️',
  };

  if (!isOpen) return null;

  return (
    <div className="notification-center" ref={ref}>
      <div className="notification-header">
        <h3>Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h3>
        {unreadCount > 0 && (
          <button className="btn-small" onClick={markAllRead}>Mark all read</button>
        )}
      </div>
      <div className="notification-list">
        {loading && <div className="notification-empty">Loading...</div>}
        {!loading && notifications.length === 0 && (
          <div className="notification-empty">No notifications</div>
        )}
        {notifications.map(n => (
          <div
            key={n.id}
            className={`notification-item ${n.read ? 'read' : 'unread'}`}
            onClick={() => !n.read && markRead(n.id)}
          >
            <span className="notification-icon">{typeIcon[n.type] || 'ℹ️'}</span>
            <div className="notification-content">
              <div className="notification-title">{n.title}</div>
              <div className="notification-body">{n.body}</div>
              <div className="notification-time">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationBell({ onClick, unreadCount }: { onClick: () => void; unreadCount: number }) {
  return (
    <button className="notification-bell" onClick={onClick} title="Notifications">
      🔔
      {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
    </button>
  );
}
