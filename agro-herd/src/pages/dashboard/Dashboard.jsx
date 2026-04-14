import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatNumber, getDateRange } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { Beef, Milk, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import MilkTrendChart from '../../components/charts/MilkTrendChart';
import IncomeExpenseChart from '../../components/charts/IncomeExpenseChart';
import ExpenseDonut from '../../components/charts/ExpenseDonut';
import CowHealthChart from '../../components/charts/CowHealthChart';
import AlertPanel from '../../components/charts/AlertPanel';
import { PageLoader } from '../../components/common';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthRange = getDateRange('month');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch all data in parallel
      const [cowsRes, todayMilkRes, yesterdayMilkRes, monthIncomeRes, monthExpenseRes, alertsRes] = await Promise.all([
        supabase.from('cows').select('id, health_status', { count: 'exact' }),
        supabase.from('milk_records').select('quantity_liters, price_per_liter').eq('record_date', today),
        supabase.from('milk_records').select('quantity_liters, price_per_liter').eq('record_date', yesterdayStr),
        supabase.from('milk_records').select('quantity_liters, price_per_liter').gte('record_date', monthRange.start).lte('record_date', monthRange.end),
        supabase.from('expenses').select('amount').gte('expense_date', monthRange.start).lte('expense_date', monthRange.end),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
      ]);

      const cows = cowsRes.data || [];
      const todayMilk = todayMilkRes.data || [];
      const yesterdayMilk = yesterdayMilkRes.data || [];
      const monthMilk = monthIncomeRes.data || [];
      const monthExp = monthExpenseRes.data || [];

      const todayLiters = todayMilk.reduce((s, r) => s + Number(r.quantity_liters), 0);
      const yesterdayLiters = yesterdayMilk.reduce((s, r) => s + Number(r.quantity_liters), 0);
      const monthIncome = monthMilk.reduce((s, r) => s + (Number(r.quantity_liters) * Number(r.price_per_liter)), 0);
      const monthExpenses = monthExp.reduce((s, r) => s + Number(r.amount), 0);

      setStats({
        totalCows: cows.length,
        healthyCows: cows.filter(c => c.health_status === 'healthy').length,
        sickCows: cows.filter(c => c.health_status === 'sick').length,
        todayMilk: todayLiters,
        yesterdayMilk: yesterdayLiters,
        milkChange: yesterdayLiters ? ((todayLiters - yesterdayLiters) / yesterdayLiters * 100).toFixed(1) : 0,
        monthIncome,
        monthExpenses,
        netProfit: monthIncome - monthExpenses,
        activeAlerts: alertsRes.count || 0,
        cowsByHealth: {
          healthy: cows.filter(c => c.health_status === 'healthy').length,
          sick: cows.filter(c => c.health_status === 'sick').length,
          pregnant: cows.filter(c => c.health_status === 'pregnant').length,
          dry: cows.filter(c => c.health_status === 'dry').length,
        },
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  const kpiCards = [
    {
      title: 'Total Cows',
      value: stats?.totalCows || 0,
      subtitle: `${stats?.healthyCows || 0} healthy · ${stats?.sickCows || 0} sick`,
      icon: Beef,
      color: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
    },
    {
      title: "Today's Milk",
      value: `${formatNumber(stats?.todayMilk || 0)} L`,
      subtitle: stats?.milkChange > 0
        ? `↑ ${stats.milkChange}% vs yesterday`
        : stats?.milkChange < 0
        ? `↓ ${Math.abs(stats.milkChange)}% vs yesterday`
        : 'Same as yesterday',
      icon: Milk,
      color: 'text-brand-secondary',
      bg: 'bg-brand-secondary/10',
      trend: stats?.milkChange,
    },
    {
      title: 'Monthly Income',
      value: formatCurrency(stats?.monthIncome || 0),
      subtitle: 'Current month',
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      title: 'Monthly Expenses',
      value: formatCurrency(stats?.monthExpenses || 0),
      subtitle: 'Current month',
      icon: DollarSign,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(stats?.netProfit || 0),
      subtitle: 'Income − Expenses',
      icon: stats?.netProfit >= 0 ? TrendingUp : TrendingDown,
      color: stats?.netProfit >= 0 ? 'text-success' : 'text-danger',
      bg: stats?.netProfit >= 0 ? 'bg-success/10' : 'bg-danger/10',
    },
    {
      title: 'Active Alerts',
      value: stats?.activeAlerts || 0,
      subtitle: 'Unread notifications',
      icon: AlertTriangle,
      color: stats?.activeAlerts > 0 ? 'text-danger' : 'text-farm-text-secondary',
      bg: stats?.activeAlerts > 0 ? 'bg-danger/10' : 'bg-gray-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, idx) => (
          <div key={card.title} className="kpi-card animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-farm-text-secondary uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-heading ${card.color}`}>
              {card.value}
            </p>
            <p className="text-xs text-farm-text-secondary">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="section-title mb-4">Milk Production Trend</h3>
          <MilkTrendChart />
        </div>
        <div className="card p-6">
          <h3 className="section-title mb-4">Active Alerts</h3>
          <AlertPanel />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="section-title mb-4">Income vs Expenses</h3>
          <IncomeExpenseChart />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">Expense Breakdown</h3>
            <ExpenseDonut />
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">Cow Health Status</h3>
            <CowHealthChart />
          </div>
        </div>
      </div>
    </div>
  );
}
