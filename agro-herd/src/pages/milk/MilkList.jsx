import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MILK_SESSIONS, QUALITY_GRADES } from '../../constants';
import { formatDate, formatCurrency, downloadCSV, getDateRange } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader, Modal } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, Download, Milk, Calendar, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MilkList() {
  const navigate = useNavigate();
  const { canEdit, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ cow_id: '', from: '', to: '', session: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [form, setForm] = useState({
    cow_id: '', record_date: new Date().toISOString().split('T')[0], session: 'morning',
    quantity_liters: '', price_per_liter: '', quality_grade: 'A', fat_percentage: '', notes: '',
  });
  const [bulkEntries, setBulkEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => {
    supabase.from('cows').select('id, tag_number, name, is_milking').order('tag_number').then(({ data }) => {
      setCows(data || []);
    });
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [page, filters]);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('milk_records')
      .select('*, cows(tag_number, name)', { count: 'exact' })
      .order('record_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (filters.cow_id) query = query.eq('cow_id', filters.cow_id);
    if (filters.session) query = query.eq('session', filters.session);
    if (filters.from) query = query.gte('record_date', filters.from);
    if (filters.to) query = query.lte('record_date', filters.to);

    const { data, count } = await query;
    setRecords(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const handleSingleSave = async () => {
    if (!form.cow_id || !form.quantity_liters || !form.price_per_liter) {
      toast.error('Cow, quantity and price are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('milk_records').insert({
        cow_id: form.cow_id,
        record_date: form.record_date,
        session: form.session,
        quantity_liters: parseFloat(form.quantity_liters),
        price_per_liter: parseFloat(form.price_per_liter),
        quality_grade: form.quality_grade,
        fat_percentage: form.fat_percentage ? parseFloat(form.fat_percentage) : null,
        notes: form.notes || null,
        recorded_by: user?.id,
      });
      if (error) throw error;
      toast.success('Milk record added');
      setModalOpen(false);
      resetForm();
      fetchRecords();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openBulkMode = () => {
    const milkingCows = cows.filter(c => c.is_milking);
    setBulkEntries(milkingCows.map(c => ({
      cow_id: c.id, tag: c.tag_number, name: c.name,
      quantity_liters: '', price_per_liter: '30', quality_grade: 'A',
    })));
    setBulkMode(true);
    setModalOpen(true);
  };

  const handleBulkSave = async () => {
    const entries = bulkEntries.filter(e => e.quantity_liters && parseFloat(e.quantity_liters) > 0);
    if (entries.length === 0) { toast.error('Enter at least one record'); return; }
    setSaving(true);
    try {
      const records = entries.map(e => ({
        cow_id: e.cow_id,
        record_date: form.record_date,
        session: form.session,
        quantity_liters: parseFloat(e.quantity_liters),
        price_per_liter: parseFloat(e.price_per_liter),
        quality_grade: e.quality_grade,
        recorded_by: user?.id,
      }));
      const { error } = await supabase.from('milk_records').insert(records);
      if (error) throw error;
      toast.success(`${entries.length} milk records added`);
      setModalOpen(false);
      setBulkMode(false);
      fetchRecords();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      cow_id: '', record_date: new Date().toISOString().split('T')[0], session: 'morning',
      quantity_liters: '', price_per_liter: '', quality_grade: 'A', fat_percentage: '', notes: '',
    });
  };

  const handleExport = () => {
    downloadCSV(records.map(r => ({
      Date: r.record_date, Cow: r.cows?.tag_number || '', Session: r.session,
      'Liters': r.quantity_liters, '₹/L': r.price_per_liter,
      Income: (r.quantity_liters * r.price_per_liter).toFixed(2), Grade: r.quality_grade,
    })), 'milk_records');
  };

  const totalLiters = records.reduce((s, r) => s + Number(r.quantity_liters), 0);
  const totalIncome = records.reduce((s, r) => s + (Number(r.quantity_liters) * Number(r.price_per_liter)), 0);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-farm-text-secondary">{total} record{total !== 1 ? 's' : ''}</p>
          <span className="text-sm font-mono">🥛 {totalLiters.toFixed(1)} L</span>
          <span className="text-sm font-mono font-semibold text-success">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filters.session} onChange={e => { setFilters(f => ({ ...f, session: e.target.value })); setPage(1); }} className="select-field text-sm py-2 w-32">
            <option value="">All sessions</option>
            {MILK_SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input-field text-sm py-2 w-36" />
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input-field text-sm py-2 w-36" />
          <button onClick={handleExport} className="btn-secondary py-2 px-3 text-sm"><Download size={16} /></button>
          <button onClick={openBulkMode} className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5">
            <ClipboardList size={16} /> Bulk Entry
          </button>
          <button onClick={() => { setBulkMode(false); setModalOpen(true); }} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={16} /> Add Record
          </button>
        </div>
      </div>

      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState icon={Milk} title="No milk records" description="Start recording daily milk production" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Cow</th>
              <th className="px-4 py-3 text-left">Session</th>
              <th className="px-4 py-3 text-right">Liters</th>
              <th className="px-4 py-3 text-right">₹/L</th>
              <th className="px-4 py-3 text-right">Income</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Grade</th>
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="table-row cursor-default">
                  <td className="px-4 py-3 text-sm">{formatDate(r.record_date)}</td>
                  <td className="px-4 py-3"><span className="font-mono text-brand-primary text-sm">{r.cows?.tag_number}</span></td>
                  <td className="px-4 py-3 text-sm capitalize">{r.session?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{r.quantity_liters}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{r.price_per_liter}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-success">
                    {formatCurrency(r.quantity_liters * r.price_per_liter)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={r.quality_grade === 'A' ? 'success' : r.quality_grade === 'B' ? 'warning' : 'danger'}>{r.quality_grade}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Single / Bulk Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setBulkMode(false); }} title={bulkMode ? 'Bulk Milk Entry' : 'Add Milk Record'} size={bulkMode ? 'xl' : 'md'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Session *</label>
              <select value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))} className="select-field">
                {MILK_SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {bulkMode ? (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="table-header">
                  <th className="px-3 py-2 text-left">Cow</th>
                  <th className="px-3 py-2 text-left w-28">Liters *</th>
                  <th className="px-3 py-2 text-left w-24">₹/L *</th>
                  <th className="px-3 py-2 text-left w-20">Grade</th>
                </tr></thead>
                <tbody>
                  {bulkEntries.map((entry, i) => (
                    <tr key={entry.cow_id} className="border-b border-farm-border/30">
                      <td className="px-3 py-2">
                        <span className="font-mono text-brand-primary">{entry.tag}</span>
                        {entry.name && <span className="text-farm-text-secondary ml-1.5">{entry.name}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={entry.quantity_liters}
                          onChange={e => setBulkEntries(prev => prev.map((p, j) => j === i ? { ...p, quantity_liters: e.target.value } : p))}
                          className="input-field py-1 text-sm" placeholder="0" step="0.1" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={entry.price_per_liter}
                          onChange={e => setBulkEntries(prev => prev.map((p, j) => j === i ? { ...p, price_per_liter: e.target.value } : p))}
                          className="input-field py-1 text-sm" step="0.1" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={entry.quality_grade}
                          onChange={e => setBulkEntries(prev => prev.map((p, j) => j === i ? { ...p, quality_grade: e.target.value } : p))}
                          className="select-field py-1 text-sm">
                          {QUALITY_GRADES.map(g => <option key={g.value} value={g.value}>{g.value}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bulkEntries.length === 0 && <p className="text-center text-farm-text-secondary py-4 text-sm">No milking cows found</p>}
            </div>
          ) : (
            <>
              <div>
                <label className="label">Cow *</label>
                <select value={form.cow_id} onChange={e => setForm(f => ({ ...f, cow_id: e.target.value }))} className="select-field">
                  <option value="">Select cow</option>
                  {cows.map(c => <option key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Liters *</label>
                  <input type="number" value={form.quantity_liters} onChange={e => setForm(f => ({ ...f, quantity_liters: e.target.value }))} className="input-field" placeholder="0" step="0.1" />
                </div>
                <div>
                  <label className="label">₹ per Liter *</label>
                  <input type="number" value={form.price_per_liter} onChange={e => setForm(f => ({ ...f, price_per_liter: e.target.value }))} className="input-field" placeholder="30" step="0.1" />
                </div>
                <div>
                  <label className="label">Quality Grade</label>
                  <select value={form.quality_grade} onChange={e => setForm(f => ({ ...f, quality_grade: e.target.value }))} className="select-field">
                    {QUALITY_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fat %</label>
                  <input type="number" value={form.fat_percentage} onChange={e => setForm(f => ({ ...f, fat_percentage: e.target.value }))} className="input-field" placeholder="3.5" step="0.1" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setModalOpen(false); setBulkMode(false); }} className="btn-secondary">Cancel</button>
            <button onClick={bulkMode ? handleBulkSave : handleSingleSave} disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />}
              {bulkMode ? 'Save All Records' : 'Save Record'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
