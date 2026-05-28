import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Beef, Milk, DollarSign, AlertCircle, Activity } from 'lucide-react';
import { PageLoader, Badge } from '../../components/common';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/helpers';

const PREGNANT_STATUSES = ['pregnant', 'confirmed_pregnancy'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/cycles/summary');
      if (!data) { setAlerts([]); return; }

      const upcoming = data
        .filter(c => !PREGNANT_STATUSES.includes(c.cycle_status)) // exclude pregnant cows
        .map(c => {
          const nextDate = new Date(c.last_cycle_date);
          nextDate.setDate(nextDate.getDate() + 21);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          nextDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((nextDate - today) / 86400000);
          return { ...c, nextDate, daysUntil };
        })
        .filter(c => c.daysUntil >= 0) // Only future upcoming dates (including today)
        .sort((a, b) => a.daysUntil - b.daysUntil); // nearest first

      setAlerts(upcoming);
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
          Welcome to AgroHerd
        </h1>
        <p className="text-lg text-farm-text-secondary">
          Manage your farm efficiently. Select an option below to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl animate-slide-up mb-10">
        <button onClick={() => navigate('/cows')} className="card p-10 bg-brand-primary text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
          <Beef size={64} />
          <span className="text-xl font-heading font-bold">Track Cows</span>
          <span className="text-sm opacity-80">Manage herd, add cows, and track health</span>
        </button>
        
        <button onClick={() => navigate('/expenses')} className="card p-10 bg-amber-500 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
          <DollarSign size={64} />
          <span className="text-xl font-heading font-bold">Expenses</span>
          <span className="text-sm opacity-80">Add and monitor farm expenditures</span>
        </button>

        <button onClick={() => navigate('/milk')} className="card p-10 bg-indigo-500 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
          <Milk size={64} />
          <span className="text-xl font-heading font-bold">Milk Records</span>
          <span className="text-sm opacity-80">Log and analyze daily milk production</span>
        </button>

        <button onClick={() => navigate('/alerts')} className="card p-10 bg-red-500 text-white flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer relative">
          <AlertCircle size={64} />
          <span className="text-xl font-heading font-bold">Alerts</span>
          <span className="text-sm opacity-80 font-medium">
            {alertsLoading ? 'Loading alerts...' : `${alerts.length} upcoming cycle${alerts.length !== 1 ? 's' : ''}`}
          </span>
          {!alertsLoading && alerts.length > 0 && (
            <span className="absolute top-4 right-4 bg-white text-red-500 font-bold px-2.5 py-1 rounded-full text-xs animate-pulse">
              {alerts.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
