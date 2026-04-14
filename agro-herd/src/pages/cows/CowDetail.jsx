import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatCurrency, calculateAge } from '../../utils/helpers';
import { Badge, PageLoader, ConfirmDialog } from '../../components/common';
import { toast } from 'react-toastify';
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

  useEffect(() => {
    fetchCow();
  }, [id]);

  useEffect(() => {
    if (cow) fetchTabData();
  }, [activeTab, cow]);

  const fetchCow = async () => {
    const { data } = await supabase.from('cows').select('*').eq('id', id).single();
    setCow(data);
    setLoading(false);
  };

  const fetchTabData = async () => {
    setTabLoading(true);
    let query;
    switch (activeTab) {
      case 'Milk History':
        query = supabase.from('milk_records').select('*').eq('cow_id', id).order('record_date', { ascending: false }).limit(50);
        break;
      case 'Health Records':
        query = supabase.from('health_records').select('*').eq('cow_id', id).order('record_date', { ascending: false }).limit(50);
        break;
      case 'Expenses':
        query = supabase.from('expenses').select('*').eq('cow_id', id).order('expense_date', { ascending: false }).limit(50);
        break;
      case 'Cycle History':
        query = supabase.from('estrus_cycles').select('*').eq('cow_id', id).order('last_cycle_date', { ascending: false }).limit(50);
        break;
      default:
        setTabData([]);
        setTabLoading(false);
        return;
    }
    const { data } = await query;
    setTabData(data || []);
    setTabLoading(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('cows').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Cow deleted');
    navigate('/cows');
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
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit() && (
              <button onClick={() => navigate(`/cows/${id}/edit`)} className="btn-secondary text-sm flex items-center gap-1.5">
                <Edit size={14} /> Edit
              </button>
            )}
            {isAdmin() && (
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
                </tr></thead>
                <tbody>
                  {tabData.map(r => (
                    <tr key={r.id} className="table-row cursor-default">
                      <td className="px-4 py-3 text-sm">{formatDate(r.record_date)}</td>
                      <td className="px-4 py-3 text-sm capitalize">{r.session?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{r.quantity_liters}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{r.price_per_liter}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium text-success">
                        {formatCurrency(r.quantity_liters * r.price_per_liter)}
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">
                        <Badge variant={r.quality_grade === 'A' ? 'success' : r.quality_grade === 'B' ? 'warning' : 'danger'}>
                          {r.quality_grade}
                        </Badge>
                      </td>
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
    </div>
  );
}
