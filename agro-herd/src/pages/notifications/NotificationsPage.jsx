import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatRelativeTime } from '../../utils/helpers';
import { Badge, EmptyState, PageLoader } from '../../components/common';
import { toast } from 'react-toastify';
import { Bell, Check, CheckCheck, Trash2, Activity, HeartPulse, AlertTriangle, Milk, Info } from 'lucide-react';

const typeIcons = {
  estrus_alert: Activity, health_alert: HeartPulse, expense_alert: AlertTriangle,
  low_milk: Milk, system: Info,
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifications(); }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${profile.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = filter === 'all' ? notifications :
    filter === 'unread' ? notifications.filter(n => !n.is_read) :
    notifications.filter(n => n.is_read);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['all', 'unread', 'read'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                filter === f ? 'bg-brand-primary text-white' : 'bg-white border border-farm-border text-farm-text-secondary hover:bg-gray-50'
              }`}>
              {f} {f === 'unread' && `(${notifications.filter(n => !n.is_read).length})`}
            </button>
          ))}
        </div>
        <button onClick={markAllRead} className="btn-secondary text-sm py-1.5 flex items-center gap-1.5">
          <CheckCheck size={14} /> Mark All Read
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div key={n.id} className={`card p-4 flex items-start gap-3 ${!n.is_read ? 'border-l-4 border-l-brand-primary' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  n.priority === 'critical' ? 'bg-danger/10' :
                  n.priority === 'high' ? 'bg-warning/10' :
                  'bg-farm-bg'
                }`}>
                  <Icon size={18} className={
                    n.priority === 'critical' ? 'text-danger' :
                    n.priority === 'high' ? 'text-warning' :
                    'text-farm-text-secondary'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                    <Badge variant={
                      n.priority === 'critical' ? 'danger' :
                      n.priority === 'high' ? 'warning' :
                      n.priority === 'medium' ? 'info' : 'default'
                    }>{n.priority}</Badge>
                  </div>
                  <p className="text-sm text-farm-text-secondary">{n.message}</p>
                  <p className="text-xs text-farm-text-secondary/50 mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && (
                    <button onClick={() => markAsRead(n.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-farm-text-secondary" title="Mark as read">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-farm-text-secondary hover:text-danger" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
