import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../common';

export default function MilkTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const { data: records } = await supabase
      .from('milk_records')
      .select('record_date, quantity_liters')
      .gte('record_date', start.toISOString().split('T')[0])
      .lte('record_date', end.toISOString().split('T')[0])
      .order('record_date');

    // Group by date
    const grouped = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      grouped[key] = 0;
    }
    (records || []).forEach(r => {
      if (grouped[r.record_date] !== undefined) {
        grouped[r.record_date] += Number(r.quantity_liters);
      }
    });

    setData(
      Object.entries(grouped).map(([date, liters]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        liters: Math.round(liters * 100) / 100,
      }))
    );
    setLoading(false);
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Spinner /></div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E8E2" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5A6A5F' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#5A6A5F' }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E0E8E2', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          formatter={(value) => [`${value} L`, 'Milk']}
        />
        <Area type="monotone" dataKey="liters" stroke="#2E7D32" strokeWidth={2} fill="url(#milkGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
