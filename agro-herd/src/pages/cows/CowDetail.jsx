import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatCurrency, calculateAge } from '../../utils/helpers';
import { Badge, PageLoader, ConfirmDialog, Modal, DateInput } from '../../components/common';
import { toast } from 'react-toastify';
import { MILK_SESSIONS, QUALITY_GRADES } from '../../constants';
import {
  ArrowLeft, Edit, Trash2, Milk, DollarSign, HeartPulse, Activity,
  Calendar, Weight, Tag, Heart
} from 'lucide-react';

const tabs = ['Overview', 'Milk History', 'Health Records', 'Expenses', 'Cycle History'];

export default function CowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const [cow, setCow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [tabData, setTabData] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const [avgMilk, setAvgMilk] = useState(0);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodDate, setPeriodDate] = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [milkModalOpen, setMilkModalOpen] = useState(false);
  const [savingMilk, setSavingMilk] = useState(false);
  const [milkDeleteOpen, setMilkDeleteOpen] = useState(false);
  const [milkRecordToDelete, setMilkRecordToDelete] = useState(null);
  const [milkForm, setMilkForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    session: 'full_day',
    quantity_liters: '',
    price_per_liter: '',
    quality_grade: 'A',
    fat_percentage: '',
    notes: '',
  });

  const resetMilkForm = () => {
    setMilkForm({
      record_date: new Date().toISOString().split('T')[0],
      session: 'full_day',
      quantity_liters: '',
      price_per_liter: '',
      quality_grade: 'A',
      fat_percentage: '',
      notes: '',
    });
  };

  useEffect(() => {
    fetchCow();
  }, [id]);

  useEffect(() => {
    if (cow) fetchTabData();
  }, [activeTab, cow]);

  const fetchCow = async () => {
    try {
      const { data } = await api.get(`/cows/${id}`);
      
      const milkRes = await api.get('/milk', { cow_id: id }).catch(() => ({ data: [] }));
      const milkRecords = milkRes?.data || [];
      
      if (milkRecords.length > 0) {
        const total = milkRecords.reduce((sum, r) => sum + Number(r.quantity_liters), 0);
        setAvgMilk((total / milkRecords.length).toFixed(1));
      } else {
        setAvgMilk(0);
      }
      
      setCow(data);
    } catch (err) {
      toast.error('Failed to load cow details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    setTabLoading(true);
    try {
      let endpoint;
      switch (activeTab) {
        case 'Milk History': endpoint = '/milk'; break;
        case 'Health Records': endpoint = '/health'; break;
        case 'Expenses': endpoint = '/expenses'; break;
        case 'Cycle History': endpoint = '/cycles'; break;
        default:
          setTabData([]);
          setTabLoading(false);
          return;
      }
      
      const { data } = await api.get(endpoint, { cow_id: id });
      setTabData(data || []);
    } catch (err) {
      toast.error(`Failed to load ${activeTab}`);
      setTabData([]);
    } finally {
      setTabLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/cows/${id}`);
      toast.success('Cow deleted');
      navigate('/cows');
    } catch(err) {
      toast.error('Failed to delete');
    }
  };

  const handleSavePeriod = async () => {
    if (!periodDate) return;
    setSavingPeriod(true);
    try {
      await api.post('/cycles', {
        cow_id: id,
        last_cycle_date: periodDate,
        cycle_status: 'pending'
      });
      toast.success('Period date added!');
      setPeriodModalOpen(false);
      setPeriodDate('');
      if (activeTab === 'Cycle History') fetchTabData();
    } catch (err) {
      toast.error('Failed to add period date');
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleSaveMilk = async () => {
    if (!milkForm.quantity_liters) {
      toast.error('Quantity is required');
      return;
    }
    setSavingMilk(true);
    try {
      await api.post('/milk', {
        cow_id: id,
        record_date: milkForm.record_date,
        session: milkForm.session,
        quantity_liters: parseFloat(milkForm.quantity_liters),
        price_per_liter: milkForm.price_per_liter ? parseFloat(milkForm.price_per_liter) : null,
        quality_grade: milkForm.quality_grade,
        fat_percentage: milkForm.fat_percentage ? parseFloat(milkForm.fat_percentage) : null,
        notes: milkForm.notes || null,
      });
      toast.success('Milk record added successfully!');
      setMilkModalOpen(false);
      resetMilkForm();
      fetchCow();
      if (activeTab === 'Milk History') fetchTabData();
    } catch (err) {
      toast.error(err.message || 'Failed to add milk record');
    } finally {
      setSavingMilk(false);
    }
  };

  const handleDeleteMilkClick = (recordId) => {
    setMilkRecordToDelete(recordId);
    setMilkDeleteOpen(true);
  };

  const handleDeleteMilkConfirm = async () => {
    try {
      await api.delete(`/milk/${milkRecordToDelete}`);
      toast.success('Milk record deleted successfully!');
      setMilkDeleteOpen(false);
      setMilkRecordToDelete(null);
      fetchCow();
      if (activeTab === 'Milk History') fetchTabData();
    } catch (err) {
      toast.error('Failed to delete milk record');
    }
  };

  if (loading) return <PageLoader />;
  if (!cow) return <div className="text-center py-8">Cow not found</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/cows')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2">
        <ArrowLeft size={16} /> Back to Cows
      </button>

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-4xl shrink-0">
            🐄
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-heading font-bold">{cow.name || cow.tag_number}</h2>
              <Badge variant={cow.health_status}>{cow.health_status}</Badge>
              {cow.is_milking && <Badge variant="success">🥛 Milking</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-farm-text-secondary mt-2">
              <span className="flex items-center gap-1.5"><Tag size={14} /> {cow.tag_number}</span>
              <span className="flex items-center gap-1.5"><Heart size={14} /> {cow.breed}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {calculateAge(cow.date_of_birth)} old</span>
              {cow.weight_kg && <span className="flex items-center gap-1.5"><Weight size={14} /> {cow.weight_kg} kg</span>}
              {cow.color && <span>Color: {cow.color}</span>}
              <span className="flex items-center gap-1.5 font-semibold text-brand-primary ml-2 bg-brand-primary/10 px-2 py-0.5 rounded-md"><Milk size={14} /> Avg Milk: {avgMilk} L/day</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {canEdit() && (
              <button onClick={() => setPeriodModalOpen(true)} className="btn-primary text-sm flex items-center gap-1.5 shadow-md">
                <Calendar size={14} /> Update Period
              </button>
            )}
            {canEdit() && (
              <button onClick={() => setMilkModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white px-4 py-2 text-sm flex items-center gap-1.5 shadow-md transition-all">
                <Milk size={14} /> Add Milk
              </button>
            )}
            {canEdit() && (
              <button onClick={() => navigate(`/expenses?add=true&cow_id=${id}`)} className="btn-warning text-white text-sm flex items-center gap-1.5 shadow-md">
                <DollarSign size={14} /> Add Expense
              </button>
            )}
            {canEdit() && (
              <button onClick={() => navigate(`/cows/${id}/edit`)} className="btn-secondary text-sm flex items-center gap-1.5">
                <Edit size={14} /> Edit
              </button>
            )}
            {canEdit() && (
              <button onClick={() => setDeleteOpen(true)} className="btn-danger text-sm flex items-center gap-1.5">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-farm-border">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-farm-text-secondary hover:text-brand-primary/70 hover:border-brand-primary/30'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 space-y-4">
              <h3 className="section-title">Details</h3>
              {[
                ['Tag Number', cow.tag_number],
                ['Name', cow.name || '—'],
                ['Breed', cow.breed],
                ['Date of Birth', formatDate(cow.date_of_birth)],
                ['Age', calculateAge(cow.date_of_birth)],
                ['Weight', cow.weight_kg ? `${cow.weight_kg} kg` : '—'],
                ['Color', cow.color || '—'],
                ...(cow.health_status === 'pregnant' && cow.pregnancy_date ? [['Pregnancy Date', formatDate(cow.pregnancy_date)]] : []),
                ['Purchase Date', formatDate(cow.purchase_date)],
                ['Purchase Price', cow.purchase_price ? formatCurrency(cow.purchase_price) : '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center border-b border-farm-border/30 pb-2 last:border-0">
                  <span className="text-sm text-farm-text-secondary">{label}</span>
                  <span className="text-sm font-medium">{val}</span>
                </div>
              ))}
            </div>
            {cow.notes && (
              <div className="card p-6">
                <h3 className="section-title mb-3">Notes</h3>
                <p className="text-sm text-farm-text-secondary whitespace-pre-wrap">{cow.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Milk History' && (
          <div className="card overflow-hidden">
            {tabLoading ? <div className="p-8 text-center text-farm-text-secondary">Loading...</div> :
            tabData.length === 0 ? <div className="p-8 text-center text-farm-text-secondary text-sm">No milk records</div> : (
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
                  {tabData.map(r => (
                    <tr key={r.id} className="table-row cursor-default">
                      <td className="px-4 py-3 text-sm">{formatDate(r.record_date)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{r.session?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{r.quantity_liters}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{r.price_per_liter !== null ? r.price_per_liter : '—'}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-success">
                        {r.price_per_liter !== null ? formatCurrency(r.quantity_liters * r.price_per_liter) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        <Badge variant={r.quality_grade === 'A' ? 'success' : r.quality_grade === 'B' ? 'warning' : 'danger'}>
                          {r.quality_grade}
                        </Badge>
                      </td>
                      {canEdit() && (
                        <td className="px-4 py-3 text-sm text-right">
                          <button onClick={() => handleDeleteMilkClick(r.id)} className="text-danger hover:text-danger/80 transition-colors p-1 rounded-md hover:bg-danger/10">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'Health Records' && (
          <div className="card overflow-hidden">
            {tabLoading ? <div className="p-8 text-center text-farm-text-secondary">Loading...</div> :
            tabData.length === 0 ? <div className="p-8 text-center text-farm-text-secondary text-sm">No health records</div> : (
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Diagnosis</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Vet</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                </tr></thead>
                <tbody>
                  {tabData.map(r => (
                    <tr key={r.id} className="table-row cursor-default">
                      <td className="px-4 py-3 text-sm">{formatDate(r.record_date)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{r.record_type}</td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell text-farm-text-secondary">{r.diagnosis || '—'}</td>
                      <td className="px-4 py-3 text-sm hidden lg:table-cell text-farm-text-secondary">{r.vet_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{r.cost ? formatCurrency(r.cost) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'Expenses' && (
          <div className="card overflow-hidden">
            {tabLoading ? <div className="p-8 text-center text-farm-text-secondary">Loading...</div> :
            tabData.length === 0 ? <div className="p-8 text-center text-farm-text-secondary text-sm">No expenses</div> : (
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Sub-category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {tabData.map(r => (
                    <tr key={r.id} className="table-row cursor-default">
                      <td className="px-4 py-3 text-sm">{formatDate(r.expense_date)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{r.category}</td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell text-farm-text-secondary">{r.sub_category || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-danger">{formatCurrency(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'Cycle History' && (
          <div className="card overflow-hidden">
            {tabLoading ? <div className="p-8 text-center text-farm-text-secondary">Loading...</div> :
            tabData.length === 0 ? <div className="p-8 text-center text-farm-text-secondary text-sm">No cycle records</div> : (
              <table className="w-full">
                <thead><tr className="table-header">
                  <th className="px-4 py-3 text-left">Last Cycle</th>
                  <th className="px-4 py-3 text-left">Next Expected</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Notes</th>
                </tr></thead>
                <tbody>
                  {tabData.map(r => {
                    const nextDate = new Date(r.last_cycle_date);
                    nextDate.setDate(nextDate.getDate() + 21);
                    return (
                      <tr key={r.id} className="table-row cursor-default">
                        <td className="px-4 py-3 text-sm">{formatDate(r.last_cycle_date)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(nextDate)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            r.cycle_status === 'confirmed_pregnancy' ? 'pregnant' :
                            r.cycle_status === 'observed' ? 'success' :
                            r.cycle_status === 'missed' ? 'danger' : 'warning'
                          }>{r.cycle_status?.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm hidden md:table-cell text-farm-text-secondary">{r.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Cow"
        message={`Are you sure you want to delete ${cow.name || cow.tag_number}? This will also remove all associated records.`}
      />

      <Modal isOpen={periodModalOpen} onClose={() => setPeriodModalOpen(false)} title="Update Period Date">
        <div className="space-y-4">
          <div>
            <label className="label">Last Period Date</label>
            <DateInput value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} className="input-field" max={new Date().toISOString().split('T')[0]} />
            <p className="text-xs text-farm-text-secondary mt-1">A Smart Alert will automatically trigger 21 days after this date.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setPeriodModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSavePeriod} disabled={savingPeriod || !periodDate} className="btn-primary flex items-center gap-2">
              {savingPeriod && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Period Date
            </button>
          </div>
        </div>
      </Modal>
 
      <Modal isOpen={milkModalOpen} onClose={() => setMilkModalOpen(false)} title={`Add Milk Record for ${cow.name || cow.tag_number}`} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <DateInput value={milkForm.record_date} onChange={e => setMilkForm(f => ({ ...f, record_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Session *</label>
              <select value={milkForm.session} onChange={e => setMilkForm(f => ({ ...f, session: e.target.value }))} className="select-field">
                {MILK_SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Liters *</label>
              <input type="number" value={milkForm.quantity_liters} onChange={e => setMilkForm(f => ({ ...f, quantity_liters: e.target.value }))} className="input-field" placeholder="0" step="0.1" />
            </div>
            <div>
              <label className="label">₹ per Liter (Optional)</label>
              <input type="number" value={milkForm.price_per_liter} onChange={e => setMilkForm(f => ({ ...f, price_per_liter: e.target.value }))} className="input-field" placeholder="Optional" step="0.1" />
            </div>
            <div>
              <label className="label">Quality Grade</label>
              <select value={milkForm.quality_grade} onChange={e => setMilkForm(f => ({ ...f, quality_grade: e.target.value }))} className="select-field">
                {QUALITY_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fat %</label>
              <input type="number" value={milkForm.fat_percentage} onChange={e => setMilkForm(f => ({ ...f, fat_percentage: e.target.value }))} className="input-field" placeholder="3.5" step="0.1" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input value={milkForm.notes} onChange={e => setMilkForm(f => ({ ...f, notes: e.target.value }))} className="input-field" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setMilkModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveMilk} disabled={savingMilk} className="btn-primary flex items-center gap-2">
              {savingMilk && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Record
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={milkDeleteOpen}
        onClose={() => setMilkDeleteOpen(false)}
        onConfirm={handleDeleteMilkConfirm}
        title="Delete Milk Record"
        message="Are you sure you want to delete this milk record?"
      />
    </div>
  );
}
