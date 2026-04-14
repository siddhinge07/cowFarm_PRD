import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { EXPENSE_CATEGORIES } from '../../constants';
import { formatDate, formatCurrency, downloadCSV, getDateRange } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader, Modal } from '../../components/common';
import { toast } from 'react-toastify';
import { Plus, Search, Download, DollarSign, Trash2 } from 'lucide-react';

export default function ExpenseList() {
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
    supabase.from('cows').select('id, tag_number, name').order('tag_number').then(({ data }) => setCows(data || []));
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
    let query = supabase
      .from('expenses')
      .select('*, cows(tag_number, name)', { count: 'exact' })
      .order('expense_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (filters.category) query = query.eq('category', filters.category);
    if (filters.cow_id) query = query.eq('cow_id', filters.cow_id);
    if (filters.from) query = query.gte('expense_date', filters.from);
    if (filters.to) query = query.lte('expense_date', filters.to);

    const { data, count } = await query;
    setExpenses(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.amount || !form.expense_date) {
      toast.error('Amount and date are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        cow_id: form.cow_id || null,
        category: form.category,
        sub_category: form.sub_category || null,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        vendor: form.vendor || null,
        notes: form.notes || null,
        added_by: user?.id,
      });
      if (error) throw error;
      toast.success('Expense added');
      setModalOpen(false);
      setForm({ cow_id: '', category: 'food', sub_category: '', amount: '', expense_date: new Date().toISOString().split('T')[0], vendor: '', notes: '' });
      fetchExpenses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('Expense deleted');
    fetchExpenses();
  };

  const handleExport = () => {
    const data = expenses.map(e => ({
      Date: e.expense_date,
      Category: e.category,
      'Sub-category': e.sub_category || '',
      Amount: e.amount,
      Cow: e.cows?.tag_number || 'Farm-wide',
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
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input-field text-sm py-2 w-36" placeholder="From" />
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input-field text-sm py-2 w-36" placeholder="To" />
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
              <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} className="input-field" />
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
