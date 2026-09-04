import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Beef, Milk, DollarSign, AlertCircle, Activity, HeartPulse } from 'lucide-react';
import { PageLoader, Badge } from '../../components/common';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/helpers';

const PREGNANT_STATUSES = ['pregnant', 'confirmed_pregnancy'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { loading, canViewExpenses, profile } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/cycles');
      const data = res?.data || [];
      if (!Array.isArray(data) || data.length === 0) {
        setAlerts([]);
        return;
      }

      // Group by latest cycle per cow
      const latestCyclesMap = {};
      data.forEach(c => {
        const existing = latestCyclesMap[c.cow_id];
        if (!existing || new Date(c.created_at || c.last_cycle_date) > new Date(existing.created_at || existing.last_cycle_date)) {
          latestCyclesMap[c.cow_id] = c;
        }
      });
      const latestCycles = Object.values(latestCyclesMap);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeAlerts = latestCycles
        .filter(c => !PREGNANT_STATUSES.includes(c.cycle_status))
        .map(c => {
          const nextDate = new Date(c.last_cycle_date);
          nextDate.setDate(nextDate.getDate() + 21);
          nextDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((nextDate - today) / 86400000);
          return { ...c, nextDate, daysUntil };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setAlerts(activeAlerts);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const getAlertEmoji = (days) => {
    if (days <= 0) return '🔴';
    if (days <= 2) return '🟠';
    if (days <= 5) return '🟡';
    return '🟢';
  };

  const getAlertBadgeVariant = (days) => {
    if (days <= 0) return 'danger';
    if (days <= 2) return 'warning';
    if (days <= 5) return 'info';
    return 'success';
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 py-6">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-brand-primary mb-3">
          Welcome to {profile?.farm_name || 'AgroHerd'}
        </h1>
        <p className="text-lg text-farm-text-secondary">
          {profile?.role === 'admin' ? 'Manage your farm efficiently. Select an option below to get started.' : 'Herd Operations Dashboard. Select an option below to log or view records.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl animate-slide-up mb-10">
        <button onClick={() => navigate('/cows')} className="card p-10 bg-brand-primary text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
          <Beef size={64} />
          <span className="text-xl font-heading font-bold">Track Cows</span>
          <span className="text-sm opacity-80">Manage herd and view health records</span>
        </button>
        
        {canViewExpenses() ? (
          <button onClick={() => navigate('/expenses')} className="card p-10 bg-amber-500 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
            <DollarSign size={64} />
            <span className="text-xl font-heading font-bold">Expenses</span>
            <span className="text-sm opacity-80">Add and monitor farm expenditures</span>
          </button>
        ) : (
          <button onClick={() => navigate('/health')} className="card p-10 bg-emerald-600 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
            <HeartPulse size={64} />
            <span className="text-xl font-heading font-bold">Health Records</span>
            <span className="text-sm opacity-80">Log treatments, checkups & vaccines</span>
          </button>
        )}

        <button onClick={() => navigate('/milk')} className="card p-10 bg-indigo-500 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
          <Milk size={64} />
          <span className="text-xl font-heading font-bold">Milk Records</span>
          <span className="text-sm opacity-80">Log and analyze daily milk production</span>
        </button>

        <button onClick={() => navigate('/alerts')} className="card p-10 bg-red-500 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer relative shadow-md">
          <AlertCircle size={64} />
          <span className="text-xl font-heading font-bold">Alerts</span>
          <span className="text-sm opacity-90 font-medium">
            {alertsLoading
              ? 'Loading alerts...'
              : alerts.length > 0
                ? `${alerts.length} active cycle alert${alerts.length !== 1 ? 's' : ''}`
                : 'All cycles up to date'}
          </span>
          {!alertsLoading && alerts.length > 0 && (
            <span className="absolute top-4 right-4 bg-white text-red-600 font-extrabold px-3 py-1 rounded-full text-xs shadow-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping" />
              {alerts.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
