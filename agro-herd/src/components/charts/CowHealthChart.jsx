import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../common';

const STATUS_COLORS = {
  healthy: '#43A047',
  sick: '#E53935',
  pregnant: '#7B1FA2',
  dry: '#FB8C00',
  sold: '#78909C',
  deceased: '#B0BEC5',
};

export default function CowHealthChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: cows } = await supabase.from('cows').select('health_status');
    const counts = {};
    (cows || []).forEach(c => {
      counts[c.health_status] = (counts[c.health_status] || 0) + 1;
    });
    setData(
      Object.entries(counts)
        .map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          key: status,
        }))
        .sort((a, b) => b.count - a.count)
    );
    setLoading(false);
  };

  if (loading) return <div className="h-48 flex items-center justify-center"><Spinner /></div>;
  if (data.length === 0) return <p className="text-sm text-farm-text-secondary text-center py-8">No cows registered</p>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E8E2" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#5A6A5F' }} />
        <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#5A6A5F' }} width={70} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E8E2' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#78909C'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
