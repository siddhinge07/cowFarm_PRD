import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { CYCLE_STATUSES } from '../../constants';
import { formatDate } from '../../utils/helpers';
import { Badge, Modal, EmptyState, PageLoader, DateInput, ConfirmDialog } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, Activity, AlertCircle, ArrowLeft, Trash } from 'lucide-react';

const ACTIONED_STATUSES = ['observed', 'pregnancy_attempt', 'given_medicine', 'failed', 'missed'];
const PREGNANT_STATUSES = ['pregnant', 'confirmed_pregnancy'];

export default function CycleTracker() {
  const navigate = useNavigate();
  const { canEdit, user } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ cow_id: '', last_cycle_date: '', cycle_status: 'pending', notes: '', pregnancy_date: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('urgent');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cyclesRes, cowsRes] = await Promise.all([
        api.get('/cycles'),
        api.get('/cows')
      ]);
      setCycles(cyclesRes.data || []);
      setCows(cowsRes.data || []);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getNextCycleDate = (lastDate, status) => {
    if (PREGNANT_STATUSES.includes(status)) return null;
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 21);
    return d;
  };

  const getDaysUntil = (nextDate) => {
    if (!nextDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(nextDate);
    next.setHours(0, 0, 0, 0);
    return Math.ceil((next - today) / 86400000);
  };

  const getAlertTier = (daysUntil) => {
    if (daysUntil === null) return null;
    if (daysUntil <= 0) return { tier: 'CRITICAL', color: 'danger', emoji: '🔴' };
    if (daysUntil <= 2) return { tier: 'HIGH', color: 'warning', emoji: '🟠' };
    if (daysUntil <= 5) return { tier: 'MEDIUM', color: 'info', emoji: '🟡' };
    return { tier: 'INFO', color: 'success', emoji: '🟢' };
  };

  const isActioned = (status) => ACTIONED_STATUSES.includes(status);
  const isPregnant = (status) => PREGNANT_STATUSES.includes(status);

  const latestCyclesMap = {};
  cycles.forEach(c => {
    const existing = latestCyclesMap[c.cow_id];
    if (!existing || new Date(c.created_at || c.last_cycle_date) > new Date(existing.created_at || existing.last_cycle_date)) {
      latestCyclesMap[c.cow_id] = c;
    }
  });
  const counts = {
    urgent: latestCycles.filter(c => !isPregnant(c.cycle_status) && getDaysUntil(getNextCycleDate(c.last_cycle_date, c.cycle_status)) <= 0).length,
    upcoming: latestCycles.filter(c => !isPregnant(c.cycle_status) && getDaysUntil(getNextCycleDate(c.last_cycle_date, c.cycle_status)) > 0).length,
    today: latestCycles.filter(c => !isPregnant(c.cycle_status) && getDaysUntil(getNextCycleDate(c.last_cycle_date, c.cycle_status)) === 0).length,
    all: cycles.length,
  };

  const filtered = (filter === 'all' ? cycles : latestCycles)
    .filter(c => {
      if (filter === 'all') return true;
      if (isPregnant(c.cycle_status)) return false;
      const next = getNextCycleDate(c.last_cycle_date, c.cycle_status);
      const days = getDaysUntil(next);
      if (days === null) return false;
      
      if (filter === 'urgent') return days <= 0;
      if (filter === 'today') return days === 0;
      if (filter === 'upcoming') return days > 0;
      return true;
    })
    .sort((a, b) => {
      if (filter === 'all') {
        const dateA = new Date(a.created_at || a.last_cycle_date);
        const dateB = new Date(b.created_at || b.last_cycle_date);
        return dateB - dateA;
      }
      const nextA = getNextCycleDate(a.last_cycle_date, a.cycle_status);
      const nextB = getNextCycleDate(b.last_cycle_date, b.cycle_status);
      if (!nextA && !nextB) return 0;
      if (!nextA) return 1;
      if (!nextB) return -1;
      return nextA - nextB;
    });

  const handleSave = async () => {
    if (!form.cow_id || !form.last_cycle_date) {
      toast.error('Please select a cow and date');
      return;
    }
    if (isPregnant(form.cycle_status) && !form.pregnancy_date) {
      toast.error('Please select pregnancy date');
      return;
    }
    setSaving(true);
    try {
      await api.post('/cycles', {
        cow_id: form.cow_id,
        last_cycle_date: form.last_cycle_date,
        cycle_status: form.cycle_status,
        notes: form.notes || null,
      });

      // If pregnant, update cow status and pregnancy date
      if (isPregnant(form.cycle_status)) {
        await api.put(`/cows/${form.cow_id}`, {
          health_status: 'pregnant',
          pregnancy_date: form.pregnancy_date,
        }).catch(console.error);
      }

      toast.success('Cycle record saved successfully!');
      setModalOpen(false);
      setForm({ cow_id: '', last_cycle_date: new Date().toISOString().split('T')[0], cycle_status: 'pending', notes: '', pregnancy_date: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save cycle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/cycles/${id}`);
      toast.success('Cycle record deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete cycle');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'urgent', label: '🔴 Due & Overdue', count: counts.urgent },
            { id: 'upcoming', label: '⏰ Upcoming', count: counts.upcoming },
            { id: 'today', label: 'Due Today', count: counts.today },
            { id: 'all', label: 'All Records', count: counts.all },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 font-medium ${
                filter === tab.id ? 'bg-brand-primary text-white shadow-sm' : 'bg-white border border-farm-border text-farm-text-secondary hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setForm({
              cow_id: '',
              last_cycle_date: new Date().toISOString().split('T')[0],
              cycle_status: 'pending',
              notes: '',
              pregnancy_date: ''
            });
            setModalOpen(true);
          }}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Plus size={16} /> Record Cycle
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No cycle records" description="Start tracking estrus cycles for your cows" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="px-4 py-3 text-left">Cow</th>
              <th className="px-4 py-3 text-left">Last Cycle Date</th>
              <th className="px-4 py-3 text-left">Last Action</th>
              <th className="px-4 py-3 text-left">Upcoming Date</th>
              <th className="px-4 py-3 text-left">Alert</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Notes</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => {
                const pregnant = isPregnant(c.cycle_status);
                const actioned = isActioned(c.cycle_status);
                const nextDate = getNextCycleDate(c.last_cycle_date, c.cycle_status);
                const days = getDaysUntil(nextDate);
                const alert = getAlertTier(days);
                return (
                  <tr key={c.id} className="table-row cursor-default">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-primary text-sm">{c.tag_number || c.cow_id}</span>
                      {c.name && <span className="text-sm text-farm-text-secondary ml-2">{c.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(c.last_cycle_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        pregnant ? 'pregnant' :
                        actioned ? 'success' :
                        (c.cycle_status === 'missed' || c.cycle_status === 'failed') ? 'danger' : 'warning'
                      }>{c.cycle_status?.replaceAll('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {pregnant ? '—' : formatDate(nextDate)}
                    </td>
                    <td className="px-4 py-3">
                      {pregnant ? (
                        <span className="text-sm font-medium text-purple-600">🤰 Pregnant</span>
                      ) : (filter !== 'all' || !actioned) && alert ? (
                        <span className="text-sm">
                          {alert.emoji} <span className="font-medium">{days <= 0 ? 'Today / Overdue' : `${days} day${days !== 1 ? 's' : ''}`}</span>
                        </span>
                      ) : actioned ? (
                        <span className="text-sm font-medium text-green-600">✅ Updated</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-farm-text-secondary hidden md:table-cell">{c.notes || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!pregnant && (
                          <button
                            onClick={() => {
                              setForm({
                                cow_id: c.cow_id,
                                last_cycle_date: new Date().toISOString().split('T')[0],
                                cycle_status: 'observed',
                                notes: '',
                                pregnancy_date: ''
                              });
                              setModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold transition-colors shadow-xs"
                            title="Perform / Log action for this cow"
                          >
                            Take Action
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedId(c.id); setConfirmOpen(true); }}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                          title="Delete record"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { handleDelete(selectedId); setConfirmOpen(false); }}
        title="Delete Cycle Record"
        message="Are you sure you want to delete this cycle record? This action cannot be undone."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Cycle Action">
        <div className="space-y-4">
          <div>
            <label className="label">Cow *</label>
            <select value={form.cow_id} onChange={e => setForm(f => ({ ...f, cow_id: e.target.value }))} className="select-field">
              <option value="">Select cow</option>
              {cows.map(c => <option key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date of Action *</label>
            <DateInput value={form.last_cycle_date} onChange={e => setForm(f => ({ ...f, last_cycle_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Action Taken / Status</label>
            <select value={form.cycle_status} onChange={e => setForm(f => ({ ...f, cycle_status: e.target.value }))} className="select-field">
              {CYCLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {isPregnant(form.cycle_status) && (
            <div>
              <label className="label">Pregnancy Date *</label>
              <DateInput
                value={form.pregnancy_date}
                onChange={e => setForm(f => ({ ...f, pregnancy_date: e.target.value }))}
                className="input-field"
              />
              <p className="text-xs text-farm-text-secondary mt-1">This date will be saved to the cow's profile as the pregnancy date.</p>
            </div>
          )}
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
