import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { Spinner } from '../common';

export default function IncomeExpenseChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        start: d.toISOString().split('T')[0],
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      });
    }

    try {
      const result = [];
      for (const m of months) {
        const [incRes, expRes] = await Promise.all([
          api.get('/milk', { from: m.start, to: m.end, limit: 1000 }),
          api.get('/expenses', { from: m.start, to: m.end, limit: 1000 })
        ]);
        const income = (incRes.data || []).reduce((s, r) => s + (Number(r.quantity_liters) * Number(r.price_per_liter)), 0);
        const expenses = (expRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
        result.push({ month: m.label, Income: Math.round(income), Expenses: Math.round(expenses) });
      }

      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Spinner /></div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E8E2" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5A6A5F' }} />
        <YAxis tick={{ fontSize: 11, fill: '#5A6A5F' }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E0E8E2', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, undefined]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Income" fill="#43A047" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#E53935" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
