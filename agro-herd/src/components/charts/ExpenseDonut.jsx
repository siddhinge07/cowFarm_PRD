import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import { Spinner } from '../common';

const COLORS = ['#2E7D32', '#1565C0', '#F9A825', '#E53935', '#7B1FA2', '#00897B', '#5D4037'];

export default function ExpenseDonut() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    const { data: expenses } = await supabase
      .from('expenses')
      .select('category, amount')
      .gte('expense_date', start)
      .lte('expense_date', end);

    const grouped = {};
    (expenses || []).forEach(e => {
      grouped[e.category] = (grouped[e.category] || 0) + Number(e.amount);
    });

    setData(
      Object.entries(grouped)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
    );
    setLoading(false);
  };

  if (loading) return <div className="h-48 flex items-center justify-center"><Spinner /></div>;
  if (data.length === 0) return <p className="text-sm text-farm-text-secondary text-center py-8">No expenses this month</p>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1 text-xs text-farm-text-secondary">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
