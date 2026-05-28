import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { Spinner } from '../common';

export default function MilkTrendChart({ from, to }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [from, to]);

  const fetchData = async () => {
    setLoading(true);
    const startStr = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endStr = to || new Date().toISOString().split('T')[0];

    try {
      const { data: records } = await api.get('/milk', {
        from: startStr,
        to: endStr,
        limit: 1000
      });

      const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
      const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
      const startDate = new Date(sYear, sMonth - 1, sDay);
      const endDate = new Date(eYear, eMonth - 1, eDay);

      const timeDiff = endDate - startDate;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      const isWideRange = daysDiff > 90;

      const grouped = {};

      if (isWideRange) {
        // Group by month
        let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (d <= endDate) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const key = `${year}-${month}`;
          grouped[key] = 0;
          d.setMonth(d.getMonth() + 1);
        }

        (records || []).forEach(r => {
          const [yr, mo] = r.record_date.split('-');
          const key = `${yr}-${mo}`;
          if (grouped[key] !== undefined) {
            grouped[key] += Number(r.quantity_liters);
          }
        });

        setData(
          Object.entries(grouped).map(([monthStr, liters]) => {
            const [yr, mo] = monthStr.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthLabel = monthNames[parseInt(mo, 10) - 1];
            return {
              date: `${monthLabel} '${yr.slice(-2)}`,
              liters: Math.round(liters * 100) / 100,
            };
          })
        );
      } else {
        // Group by day
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${year}-${month}-${day}`;
          grouped[key] = 0;
        }

        (records || []).forEach(r => {
          if (grouped[r.record_date] !== undefined) {
            grouped[r.record_date] += Number(r.quantity_liters);
          }
        });

        setData(
          Object.entries(grouped).map(([dateStr, liters]) => {
            const [yr, mo, dy] = dateStr.split('-');
            return {
              date: `${dy}/${mo}`,
              liters: Math.round(liters * 100) / 100,
            };
          })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5A6A5F' }} interval={data.length > 15 ? Math.ceil(data.length / 8) : 0} height={30} tickMargin={6} />
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
