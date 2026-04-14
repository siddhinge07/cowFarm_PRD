import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { HEALTH_RECORD_TYPES } from '../../constants';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader, Modal } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, HeartPulse, Trash2 } from 'lucide-react';

export default function HealthList() {
  const { canEdit, isAdmin, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ record_type: '', cow_id: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: '', record_date: new Date().toISOString().split('T')[0], record_type: 'checkup',
    diagnosis: '', treatment: '', medication: '', dosage: '', vet_name: '', vet_contact: '',
    follow_up_date: '', cost: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => {
    supabase.from('cows').select('id, tag_number, name').order('tag_number').then(({ data }) => setCows(data || []));
  }, []);

  useEffect(() => { fetchRecords(); }, [page, filters]);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('health_records')
      .select('*, cows(tag_number, name)', { count: 'exact' })
      .order('record_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (filters.record_type) query = query.eq('record_type', filters.record_type);
    if (filters.cow_id) query = query.eq('cow_id', filters.cow_id);

    const { data, count } = await query;
    setRecords(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.cow_id || !form.record_date) { toast.error('Cow and date are required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('health_records').insert({
        cow_id: form.cow_id, record_date: form.record_date, record_type: form.record_type,
        diagnosis: form.diagnosis || null, treatment: form.treatment || null,
        medication: form.medication || null, dosage: form.dosage || null,
        vet_name: form.vet_name || null, vet_contact: form.vet_contact || null,
        follow_up_date: form.follow_up_date || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        notes: form.notes || null, recorded_by: user?.id,
      });
      if (error) throw error;
      toast.success('Health record added');
      setModalOpen(false);
      setForm({
        cow_id: '', record_date: new Date().toISOString().split('T')[0], record_type: 'checkup',
        diagnosis: '', treatment: '', medication: '', dosage: '', vet_name: '', vet_contact: '',
        follow_up_date: '', cost: '', notes: '',
      });
      fetchRecords();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await supabase.from('health_records').delete().eq('id', id);
    toast.success('Record deleted');
    fetchRecords();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-sm text-farm-text-secondary">{total} health record{total !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filters.record_type} onChange={e => { setFilters(f => ({ ...f, record_type: e.target.value })); setPage(1); }} className="select-field text-sm py-2 w-36">
            <option value="">All types</option>
            {HEALTH_RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {canEdit() && (
            <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
              <Plus size={16} /> Add Record
            </button>
          )}
        </div>
      </div>

      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState icon={HeartPulse} title="No health records" description="Start tracking health records for your cattle" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Cow</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Diagnosis</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Vet</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Follow-up</th>
              <th className="px-4 py-3 text-right">Cost</th>
              {isAdmin() && <th className="px-4 py-3 w-10"></th>}
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="table-row cursor-default">
                  <td className="px-4 py-3 text-sm">{formatDate(r.record_date)}</td>
                  <td className="px-4 py-3"><span className="font-mono text-brand-primary text-sm">{r.cows?.tag_number}</span></td>
                  <td className="px-4 py-3"><Badge variant="primary">{r.record_type}</Badge></td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell text-farm-text-secondary truncate max-w-[200px]">{r.diagnosis || '—'}</td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell text-farm-text-secondary">{r.vet_name || '—'}</td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell">{r.follow_up_date ? formatDate(r.follow_up_date) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{r.cost ? formatCurrency(r.cost) : '—'}</td>
                  {isAdmin() && (
                    <td className="px-4 py-3"><button onClick={() => handleDelete(r.id)} className="p-1 text-farm-text-secondary hover:text-danger"><Trash2 size={14} /></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Health Record" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Cow *</label>
              <select value={form.cow_id} onChange={e => setForm(f => ({ ...f, cow_id: e.target.value }))} className="select-field">
                <option value="">Select cow</option>
                {cows.map(c => <option key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Type *</label>
              <select value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value }))} className="select-field">
                {HEALTH_RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Diagnosis</label>
              <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Medication</label>
              <input value={form.medication} onChange={e => setForm(f => ({ ...f, medication: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Treatment</label>
            <textarea value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))} className="input-field min-h-[60px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Dosage</label>
              <input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Vet Name</label>
              <input value={form.vet_name} onChange={e => setForm(f => ({ ...f, vet_name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Cost (₹)</label>
              <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="input-field" placeholder="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field min-h-[60px]" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />}
              Save Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
