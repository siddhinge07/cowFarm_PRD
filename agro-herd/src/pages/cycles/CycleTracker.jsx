import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CYCLE_STATUSES } from '../../constants';
import { formatDate } from '../../utils/helpers';
import { Badge, Modal, EmptyState, PageLoader } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, Activity, AlertCircle } from 'lucide-react';

export default function CycleTracker() {
  const { canEdit, user } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ cow_id: '', last_cycle_date: '', cycle_status: 'pending', notes: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all'); // all, upcoming, today

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [cyclesRes, cowsRes] = await Promise.all([
      supabase.from('estrus_cycles').select('*, cows(tag_number, name)').order('last_cycle_date', { ascending: false }),
      supabase.from('cows').select('id, tag_number, name').order('tag_number'),
    ]);
    setCycles(cyclesRes.data || []);
    setCows(cowsRes.data || []);
    setLoading(false);
  };

  const getNextCycleDate = (lastDate) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 21);
    return d;
  };

  const getDaysUntil = (nextDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(nextDate);
    next.setHours(0, 0, 0, 0);
    return Math.ceil((next - today) / 86400000);
  };

  const getAlertTier = (daysUntil) => {
    if (daysUntil <= 0) return { tier: 'CRITICAL', color: 'danger', emoji: '🔴' };
    if (daysUntil <= 2) return { tier: 'HIGH', color: 'warning', emoji: '🟠' };
    if (daysUntil <= 5) return { tier: 'MEDIUM', color: 'info', emoji: '🟡' };
    return { tier: 'INFO', color: 'success', emoji: '🟢' };
  };

  const filtered = cycles.filter(c => {
    if (filter === 'all') return true;
    const next = getNextCycleDate(c.last_cycle_date);
    const days = getDaysUntil(next);
    if (filter === 'today') return days === 0;
    if (filter === 'upcoming') return days >= 0 && days <= 5;
    return true;
  });

  const handleSave = async () => {
    if (!form.cow_id || !form.last_cycle_date) {
      toast.error('Please select a cow and date');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('estrus_cycles').insert({
        cow_id: form.cow_id,
        last_cycle_date: form.last_cycle_date,
        cycle_status: form.cycle_status,
        notes: form.notes || null,
        recorded_by: user?.id,
      });
      if (error) throw error;
      toast.success('Cycle recorded');
      setModalOpen(false);
      setForm({ cow_id: '', last_cycle_date: '', cycle_status: 'pending', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'upcoming', 'today'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                filter === f ? 'bg-brand-primary text-white' : 'bg-white border border-farm-border text-farm-text-secondary hover:bg-gray-50'
              }`}
            >
              {f === 'upcoming' ? '⏰ Upcoming (5 days)' : f === 'today' ? '🔴 Due Today' : 'All Records'}
            </button>
          ))}
        </div>
        {canEdit() && (
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={16} /> Record Cycle
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No cycle records" description="Start tracking estrus cycles for your cows" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="px-4 py-3 text-left">Cow</th>
              <th className="px-4 py-3 text-left">Last Cycle</th>
              <th className="px-4 py-3 text-left">Next Expected</th>
              <th className="px-4 py-3 text-left">Alert</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Notes</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => {
                const nextDate = getNextCycleDate(c.last_cycle_date);
                const days = getDaysUntil(nextDate);
                const alert = getAlertTier(days);
                return (
                  <tr key={c.id} className="table-row cursor-default">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-primary text-sm">{c.cows?.tag_number}</span>
                      {c.cows?.name && <span className="text-sm text-farm-text-secondary ml-2">{c.cows.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(c.last_cycle_date)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(nextDate)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {alert.emoji} <span className="font-medium">{days <= 0 ? 'Today / Overdue' : `${days} day${days !== 1 ? 's' : ''}`}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        c.cycle_status === 'confirmed_pregnancy' ? 'pregnant' :
                        c.cycle_status === 'observed' ? 'success' :
                        c.cycle_status === 'missed' ? 'danger' : 'warning'
                      }>{c.cycle_status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-farm-text-secondary hidden md:table-cell">{c.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Estrus Cycle">
        <div className="space-y-4">
          <div>
            <label className="label">Cow *</label>
            <select value={form.cow_id} onChange={e => setForm(f => ({ ...f, cow_id: e.target.value }))} className="select-field">
              <option value="">Select cow</option>
              {cows.map(c => <option key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Last Cycle Date *</label>
            <input type="date" value={form.last_cycle_date} onChange={e => setForm(f => ({ ...f, last_cycle_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.cycle_status} onChange={e => setForm(f => ({ ...f, cycle_status: e.target.value }))} className="select-field">
              {CYCLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field min-h-[80px]" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
