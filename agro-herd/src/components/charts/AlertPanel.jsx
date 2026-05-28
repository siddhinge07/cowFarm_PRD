import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRelativeTime } from '../../utils/helpers';
import { AlertTriangle, Activity, HeartPulse, Milk, Bell } from 'lucide-react';

const typeIcons = {
  estrus_alert: Activity,
  health_alert: HeartPulse,
  low_milk: Milk,
  expense_alert: AlertTriangle,
};

const priorityBorder = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  medium: 'border-l-yellow-400',
  low: 'border-l-blue-400',
};

export default function AlertPanel() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications', { is_read: false, limit: 8 });
      setAlerts(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}</div>;

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
          <Bell size={20} className="text-success" />
        </div>
        <p className="text-sm font-medium text-farm-text-primary">All clear!</p>
        <p className="text-xs text-farm-text-secondary">No pending alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {alerts.map((alert) => {
        const Icon = typeIcons[alert.type] || AlertTriangle;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border-l-4 bg-white hover:bg-gray-50 transition-colors ${priorityBorder[alert.priority] || ''}`}
          >
            <Icon size={16} className="text-farm-text-secondary mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-farm-text-primary truncate">{alert.title}</p>
              <p className="text-xs text-farm-text-secondary line-clamp-1">{alert.message}</p>
              <p className="text-xs text-farm-text-secondary/50 mt-0.5">{formatRelativeTime(alert.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
