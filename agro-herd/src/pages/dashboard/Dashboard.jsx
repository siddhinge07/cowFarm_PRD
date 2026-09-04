import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Beef, Milk, DollarSign, AlertCircle, Activity, HeartPulse, Download } from 'lucide-react';
import { PageLoader, Badge } from '../../components/common';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/helpers';
import { isBackupDue, getDaysSinceLastBackup, downloadOverallHistoryCSV, dismissBackupForToday } from '../../utils/backupService';
import { toast } from 'react-toastify';

const PREGNANT_STATUSES = ['pregnant', 'confirmed_pregnancy'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { loading, canViewExpenses, profile } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [backupDue, setBackupDue] = useState(false);
  const [daysSinceBackup, setDaysSinceBackup] = useState(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  useEffect(() => {
    fetchAlerts();
    checkBackupAlert();
  }, []);

  const checkBackupAlert = () => {
    const due = isBackupDue();
    setBackupDue(due);
    setDaysSinceBackup(getDaysSinceLastBackup());
  };

  const handleQuickBackup = async () => {
    setDownloadingBackup(true);
    try {
      const count = await downloadOverallHistoryCSV(api);
      toast.success(`Weekly backup downloaded (${count} records)! Next reminder in 7 days.`);
      setBackupDue(false);
    } catch (err) {
      toast.error('Failed to download backup');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleDismissBackup = () => {
    dismissBackupForToday();
    setBackupDue(false);
    toast.info('Backup reminder snoozed until tomorrow');
  };

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

      const urgentAlerts = latestCycles
        .filter(c => !PREGNANT_STATUSES.includes(c.cycle_status))
        .map(c => {
          const nextDate = new Date(c.last_cycle_date);
          nextDate.setDate(nextDate.getDate() + 21);
          nextDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((nextDate - today) / 86400000);
          return { ...c, nextDate, daysUntil };
        })
        .filter(c => c.daysUntil <= 0) // Only due today (0) and overdue (< 0)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setAlerts(urgentAlerts);
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

      {/* 7-Day Routine Backup Alert Banner */}
      {backupDue && (
        <div className="w-full max-w-5xl mb-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base md:text-lg">⏰ 7-Day Routine Backup Due</span>
                <span className="bg-amber-400 text-amber-950 text-xs font-black uppercase px-2 py-0.5 rounded-full tracking-wide">
                  Recommended
                </span>
              </div>
              <p className="text-xs md:text-sm text-emerald-100 mt-0.5 leading-relaxed">
                {daysSinceBackup === null
                  ? 'You have not taken an offline backup yet. Download a copy to safeguard all farm records.'
                  : `It has been ${daysSinceBackup} days since your last backup. Keep your farm data safe from loss.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            <button
              onClick={handleQuickBackup}
              disabled={downloadingBackup}
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs md:text-sm py-2 px-4 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {downloadingBackup ? (
                <div className="w-4 h-4 border-2 border-emerald-800/30 border-t-emerald-800 rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>{downloadingBackup ? 'Downloading...' : 'Download Backup Now'}</span>
            </button>
            <button
              onClick={handleDismissBackup}
              className="text-white/80 hover:text-white hover:bg-white/10 text-xs py-2 px-2.5 rounded-xl transition-colors cursor-pointer"
              title="Remind me tomorrow"
            >
              ✕ Snooze
            </button>
          </div>
        </div>
      )}

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
                ? `${alerts.length} due today or overdue${backupDue ? ' • 💾 Backup Due' : ''}`
                : backupDue
                  ? '0 estrus alerts • 💾 7-Day Backup Due'
                  : '0 due today or overdue'}
          </span>
          {!alertsLoading && (alerts.length > 0 || backupDue) && (
            <span className="absolute top-4 right-4 bg-white text-red-600 font-extrabold px-3 py-1 rounded-full text-xs shadow-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping" />
              {alerts.length + (backupDue ? 1 : 0)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
