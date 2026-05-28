import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { MILK_SESSIONS, QUALITY_GRADES } from '../../constants';
import { formatDate, formatCurrency, downloadCSV } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader, Modal, ConfirmDialog, DateInput } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, Download, Milk, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MilkTrendChart from '../../components/charts/MilkTrendChart';

export default function MilkList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEdit } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ from: '', to: '', session: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    record_date: new Date().toISOString().split('T')[0], session: 'full_day',
    quantity_liters: '', price_per_liter: '', quality_grade: 'A', fat_percentage: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [chartKey, setChartKey] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const limit = 20;

  useEffect(() => {
    fetchRecords();
  }, [page, filters]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/milk', {
        page,
        limit,
        session: filters.session,
        from: filters.from,
        to: filters.to
      });
      setRecords(res.data || []);
      setTotal(res.count || 0);
    } catch (err) {
      toast.error('Failed to fetch milk records');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.quantity_liters || !form.price_per_liter) {
      toast.error('Quantity and price are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/milk', {
        record_date: form.record_date,
        session: form.session,
        quantity_liters: parseFloat(form.quantity_liters),
        price_per_liter: parseFloat(form.price_per_liter),
        quality_grade: form.quality_grade,
        fat_percentage: form.fat_percentage ? parseFloat(form.fat_percentage) : null,
        notes: form.notes || null,
      });
      toast.success('Milk record added');
      setModalOpen(false);
      resetForm();
      setChartKey(prev => prev + 1);
      fetchRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setRecordToDelete(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/milk/${recordToDelete}`);
      toast.success('Milk record deleted successfully!');
      setDeleteOpen(false);
      setRecordToDelete(null);
      setChartKey(prev => prev + 1);
      fetchRecords();
    } catch (err) {
      toast.error('Failed to delete milk record');
    }
  };

  const resetForm = () => {
    setForm({
      record_date: new Date().toISOString().split('T')[0], session: 'full_day',
      quantity_liters: '', price_per_liter: '', quality_grade: 'A', fat_percentage: '', notes: '',
    });
  };

  const handleExport = () => {
    downloadCSV(records.map(r => ({
      Date: formatDate(r.record_date), Session: r.session,
      'Liters': r.quantity_liters, '₹/L': r.price_per_liter,
      Income: (r.quantity_liters * r.price_per_liter).toFixed(2), Grade: r.quality_grade,
    })), 'milk_records');
  };

  const totalLiters = records.reduce((s, r) => s + Number(r.quantity_liters), 0);
  const totalIncome = records.reduce((s, r) => s + (Number(r.quantity_liters) * Number(r.price_per_liter)), 0);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
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
          <DateInput value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input-field text-sm py-2 w-36" />
          <DateInput value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input-field text-sm py-2 w-36" />
          <button onClick={handleExport} className="btn-secondary py-2 px-3 text-sm"><Download size={16} /></button>
          {canEdit() && (
            <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
              <Plus size={16} /> Add Record
            </button>
          )}
        </div>
      </div>

      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState icon={Milk} title="No milk records" description="Start recording daily milk production" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Session</th>
              <th className="px-4 py-3 text-right">Liters</th>
              <th className="px-4 py-3 text-right">₹/L</th>
              <th className="px-4 py-3 text-right">Income</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Grade</th>
              {canEdit() && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="table-row cursor-default">
                  <td className="px-4 py-3 text-sm">{formatDate(r.record_date)}</td>
                  <td className="px-4 py-3 text-sm capitalize">{r.session?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{r.quantity_liters}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{r.price_per_liter}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-success">
                    {formatCurrency(r.quantity_liters * r.price_per_liter)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={r.quality_grade === 'A' ? 'success' : r.quality_grade === 'B' ? 'warning' : 'danger'}>{r.quality_grade}</Badge>
                  </td>
                  {canEdit() && (
                    <td className="px-4 py-3 text-sm text-right">
                      <button onClick={() => handleDeleteClick(r.id)} className="text-danger hover:text-danger/80 transition-colors p-1 rounded-md hover:bg-danger/10">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Milk Trend Chart */}
      <div className="card p-5 mt-6">
        <h3 className="text-sm font-semibold text-farm-text-secondary mb-3 flex items-center gap-1.5">
          <Milk size={16} className="text-brand-secondary" /> Farm Production Trend
        </h3>
        <div className="w-full">
          <MilkTrendChart key={chartKey} from={filters.from} to={filters.to} />
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Daily Milk Record" size="md">
        <div className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <DateInput value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Session *</label>
              <select value={form.session} onChange={e => setForm(f => ({ ...f, session: e.target.value }))} className="select-field">
                {MILK_SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
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

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />}
              Save Record
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Milk Record"
        message="Are you sure you want to delete this daily milk record?"
      />
    </div>
  );
}
