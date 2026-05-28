import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { EXPENSE_CATEGORIES } from '../../constants';
import { formatDate, formatCurrency, downloadCSV, getDateRange } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader, Modal, DateInput } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, Search, Download, DollarSign, Trash2, ArrowLeft } from 'lucide-react';

export default function ExpenseList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEdit, isAdmin, user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ category: '', cow_id: '', from: '', to: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: '', category: 'food', sub_category: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
    vendor: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  useEffect(() => {
    api.get('/cows').then(({ data }) => setCows(data || []));
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [page, filters]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      const routeCowId = searchParams.get('cow_id');
      if (routeCowId) {
        setForm(f => ({ ...f, cow_id: routeCowId }));
      }
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, count } = await api.get('/expenses', {
        page,
        limit,
        category: filters.category,
        cow_id: filters.cow_id,
        from: filters.from,
        to: filters.to
      });
      setExpenses(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.amount || !form.expense_date) {
      toast.error('Amount and date are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/expenses', {
        cow_id: form.cow_id || null,
        category: form.category,
        sub_category: form.sub_category || null,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        vendor: form.vendor || null,
        notes: form.notes || null,
      });
      toast.success('Expense added');
      setModalOpen(false);
      setForm({ cow_id: '', category: 'food', sub_category: '', amount: '', expense_date: new Date().toISOString().split('T')[0], vendor: '', notes: '' });
      fetchExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete expense');
    }
  };

  const handleExport = () => {
    const data = expenses.map(e => ({
      Date: e.expense_date,
      Category: e.category,
      'Sub-category': e.sub_category || '',
      Amount: e.amount,
      Cow: e.cows?.tag_number || e.cow_id || 'Farm-wide',
      Vendor: e.vendor || '',
      Notes: e.notes || '',
    }));
    downloadCSV(data, 'expenses');
  };

  const currentCategory = EXPENSE_CATEGORIES.find(c => c.value === form.category);
  const totalPages = Math.ceil(total / limit);
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-farm-text-secondary">{total} expense{total !== 1 ? 's' : ''}</p>
          <span className="text-sm font-mono font-semibold text-danger">
            Total: {formatCurrency(totalAmount)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }} className="select-field text-sm py-2 w-36">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <DateInput value={filters.from} onChange={val => setFilters(f => ({ ...f, from: val }))} className="input-field text-sm py-2 w-36" placeholder="From" />
          <DateInput value={filters.to} onChange={val => setFilters(f => ({ ...f, to: val }))} className="input-field text-sm py-2 w-36" placeholder="To" />
          <button onClick={handleExport} className="btn-secondary py-2 px-3 text-sm"><Download size={16} /></button>
          {canEdit() && (
            <button onClick={() => setModalOpen(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
              <Plus size={16} /> Add Expense
            </button>
          )}
        </div>
      </div>

      {loading ? <PageLoader /> : expenses.length === 0 ? (
        <EmptyState icon={DollarSign} title="No expenses found" description="Start tracking your farm expenses" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Sub-category</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Cow</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Vendor</th>
              <th className="px-4 py-3 text-right">Amount</th>
              {isAdmin() && <th className="px-4 py-3 text-center w-10"></th>}
            </tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="table-row cursor-default">
                  <td className="px-4 py-3 text-sm">{formatDate(e.expense_date)}</td>
                  <td className="px-4 py-3"><Badge variant="default">{e.category}</Badge></td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell text-farm-text-secondary">{e.sub_category || '—'}</td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell">
                    {e.cows ? <span className="font-mono text-brand-primary">{e.cows.tag_number}</span> : <span className="text-farm-text-secondary">Farm-wide</span>}
                  </td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell text-farm-text-secondary">{e.vendor || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-danger">{formatCurrency(e.amount)}</td>
                  {isAdmin() && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(e.id)} className="p-1 text-farm-text-secondary hover:text-danger transition-colors"><Trash2 size={14} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, sub_category: '' }))} className="select-field">
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sub-category</label>
              <select value={form.sub_category} onChange={e => setForm(f => ({ ...f, sub_category: e.target.value }))} className="select-field">
                <option value="">Select</option>
                {currentCategory?.subs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" placeholder="0" step="0.01" />
            </div>
            <div>
              <label className="label">Date *</label>
              <DateInput value={form.expense_date} onChange={val => setForm(f => ({ ...f, expense_date: val }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Cow (leave empty for farm-wide)</label>
            <select value={form.cow_id} onChange={e => setForm(f => ({ ...f, cow_id: e.target.value }))} className="select-field">
              <option value="">Farm-wide expense</option>
              {cows.map(c => <option key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vendor</label>
            <input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className="input-field" placeholder="Vendor name" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field min-h-[60px]" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />}
              Save Expense
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
