import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatCurrency, formatNumber, getDateRange, downloadCSV, formatDate } from '../../utils/helpers';
import { PageLoader } from '../../components/common';
import { Download, BarChart3, TrendingUp, DollarSign, Milk, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Reports() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ income: 0, expenses: 0, profit: 0, liters: 0, milkRecords: [], expenseRecords: [] });

  useEffect(() => { fetchReport(); }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    const range = getDateRange(period);
    
    try {
      const [milkRes, expRes] = await Promise.all([
        api.get('/milk', { from: range.start, to: range.end, limit: 1000 }),
        api.get('/expenses', { from: range.start, to: range.end, limit: 1000 })
      ]);

      const milkRecords = milkRes.data || [];
      const expenseRecords = expRes.data || [];
      
      const income = milkRecords.reduce((s, r) => s + (Number(r.quantity_liters) * Number(r.price_per_liter)), 0);
      const liters = milkRecords.reduce((s, r) => s + Number(r.quantity_liters), 0);
      const expenses = expenseRecords.reduce((s, r) => s + Number(r.amount), 0);

      setData({ income, expenses, profit: income - expenses, liters, milkRecords, expenseRecords });
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportMilkCSV = () => {
    downloadCSV(data.milkRecords.map(r => ({
      Date: formatDate(r.record_date), Cow: r.cows?.tag_number || r.tag_number || r.cow_id, Session: r.session,
      Liters: r.quantity_liters, 'Price/L': r.price_per_liter,
      Income: (r.quantity_liters * r.price_per_liter).toFixed(2), Grade: r.quality_grade,
    })), 'milk_report');
  };

  const exportExpenseCSV = () => {
    downloadCSV(data.expenseRecords.map(e => ({
      Date: formatDate(e.expense_date), Category: e.category, 'Sub-category': e.sub_category || '',
      Amount: e.amount, Cow: e.cows?.tag_number || e.cow_id || 'Farm-wide', Vendor: e.vendor || '',
    })), 'expense_report');
  };

  const profitMargin = data.income > 0 ? ((data.profit / data.income) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
      {/* Period Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: 'today', label: 'Today' },
          { value: '7d', label: '7 Days' },
          { value: '15d', label: '15 Days' },
          { value: 'month', label: 'This Month' },
          { value: 'quarter', label: 'This Quarter' },
          { value: 'year', label: 'This Year' },
        ].map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              period === p.value ? 'bg-brand-primary text-white' : 'bg-white border border-farm-border text-farm-text-secondary hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Total Income', value: formatCurrency(data.income), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
              { title: 'Total Expenses', value: formatCurrency(data.expenses), icon: DollarSign, color: 'text-danger', bg: 'bg-danger/10' },
              { title: 'Net Profit', value: formatCurrency(data.profit), icon: BarChart3, color: data.profit >= 0 ? 'text-success' : 'text-danger', bg: data.profit >= 0 ? 'bg-success/10' : 'bg-danger/10' },
              { title: 'Total Milk', value: `${formatNumber(data.liters)} L`, icon: Milk, color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
            ].map(card => (
              <div key={card.title} className="kpi-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-farm-text-secondary uppercase tracking-wider">{card.title}</span>
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon size={18} className={card.color} />
                  </div>
                </div>
                <p className={`text-2xl font-bold font-heading ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Profit Margin */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Profit Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-farm-bg">
                <p className="text-sm text-farm-text-secondary mb-1">Revenue</p>
                <p className="text-xl font-bold font-heading text-success">{formatCurrency(data.income)}</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-farm-bg">
                <p className="text-sm text-farm-text-secondary mb-1">Costs</p>
                <p className="text-xl font-bold font-heading text-danger">{formatCurrency(data.expenses)}</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-farm-bg">
                <p className="text-sm text-farm-text-secondary mb-1">Profit Margin</p>
                <p className={`text-xl font-bold font-heading ${data.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {profitMargin}%
                </p>
              </div>
            </div>
          </div>

          {/* Milk Report */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Milk Income Report ({data.milkRecords.length} records)</h3>
              <button onClick={exportMilkCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                <Download size={14} /> Export CSV
              </button>
            </div>
            {data.milkRecords.length > 0 ? (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="table-header">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Cow</th>
                    <th className="px-3 py-2 text-right">Liters</th>
                    <th className="px-3 py-2 text-right">Income</th>
                  </tr></thead>
                  <tbody>
                    {data.milkRecords.slice(0, 50).map(r => (
                      <tr key={r.id} className="border-b border-farm-border/30">
                        <td className="px-3 py-2">{formatDate(r.record_date)}</td>
                        <td className="px-3 py-2 font-mono text-brand-primary">{r.cows?.tag_number || r.tag_number || r.cow_id}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.quantity_liters}</td>
                        <td className="px-3 py-2 text-right font-mono text-success">{formatCurrency(r.quantity_liters * r.price_per_liter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-farm-text-secondary text-center py-4">No records in this period</p>}
          </div>

          {/* Expense Report */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Expense Report ({data.expenseRecords.length} records)</h3>
              <button onClick={exportExpenseCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                <Download size={14} /> Export CSV
              </button>
            </div>
            {data.expenseRecords.length > 0 ? (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white"><tr className="table-header">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Cow</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {data.expenseRecords.slice(0, 50).map(e => (
                      <tr key={e.id} className="border-b border-farm-border/30">
                        <td className="px-3 py-2">{formatDate(e.expense_date)}</td>
                        <td className="px-3 py-2 capitalize">{e.category}</td>
                        <td className="px-3 py-2 font-mono text-brand-primary">{e.cows?.tag_number || e.cow_id || 'Farm'}</td>
                        <td className="px-3 py-2 text-right font-mono text-danger">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-farm-text-secondary text-center py-4">No expenses in this period</p>}
          </div>
        </>
      )}
    </div>
  );
}
