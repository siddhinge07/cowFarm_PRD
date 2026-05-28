import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRelativeTime } from '../../utils/helpers';
import { Bell, Check, CheckCheck, X, AlertTriangle, HeartPulse, Milk, Activity, Info } from 'lucide-react';

const typeIcons = {
  estrus_alert: Activity,
  health_alert: HeartPulse,
  expense_alert: AlertTriangle,
  low_milk: Milk,
  system: Info,
};

const priorityColors = {
  critical: 'border-l-red-500 bg-red-50/50',
  high: 'border-l-orange-500 bg-orange-50/30',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

export default function NotificationPanel({ onClose, onUpdate }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications', { limit: 20 });
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}`, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      onUpdate?.();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      await api.post('/notifications/mark-read', { ids: unreadIds });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onUpdate?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="absolute right-0 top-12 w-96 max-h-[500px] bg-white rounded-card shadow-modal border border-farm-border overflow-hidden animate-scale-in z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-farm-border bg-farm-bg">
        <h3 className="font-heading font-semibold text-sm">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="text-xs text-brand-primary hover:text-brand-primary-dark font-medium flex items-center gap-1"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[420px]">
        {loading ? (
          <div className="p-8 text-center text-farm-text-secondary text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={32} className="mx-auto text-farm-text-secondary/30 mb-2" />
            <p className="text-farm-text-secondary text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-farm-border/50 border-l-4 ${
                  priorityColors[n.priority] || ''
                } ${!n.is_read ? 'bg-brand-primary/[0.03]' : ''} hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon size={16} className="text-farm-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-farm-text-primary`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-farm-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-farm-text-secondary/60 mt-1">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1 hover:bg-gray-200 rounded text-farm-text-secondary"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
