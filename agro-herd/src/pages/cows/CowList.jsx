import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { BREEDS, HEALTH_STATUSES } from '../../constants';
import { formatDate, calculateAge, downloadCSV } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader, ConfirmDialog } from '../../components/common';
import { Plus, Search, Filter, Grid3X3, List, Download, Beef, ArrowLeft, Trash2, Edit, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import CowForm from './CowForm';

export default function CowList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEdit } = useAuth();
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [activeMainTab, setActiveMainTab] = useState('list');
  const [cowToDelete, setCowToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    breed: '',
    health_status: '',
    is_milking: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchCows();
  }, [page, filters]);

  const fetchCows = async () => {
    setLoading(true);
    let isRequesting = true;
    
    // Failsafe timeout to prevent infinite spinner
    const failsafe = setTimeout(() => {
      if (isRequesting) setLoading(false);
    }, 5000);

    try {
      const res = await api.get('/cows', {
        page,
        limit,
        search: filters.search,
        breed: filters.breed,
        health_status: filters.health_status,
        is_milking: filters.is_milking
      });
      
      setCows(res.data || []);
      setTotal(res.count || 0);
    } catch (err) {
      console.warn('Fallback to local mock DB due to error:', err.message);
      
      const localCows = JSON.parse(localStorage.getItem('mock_cows') || '[]');
      let filtered = localCows;
      
      if (filters.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(c => c.tag_number?.toLowerCase().includes(s) || c.name?.toLowerCase().includes(s));
      }
      if (filters.breed) filtered = filtered.filter(c => c.breed === filters.breed);
      if (filters.health_status) filtered = filtered.filter(c => c.health_status === filters.health_status);
      if (filters.is_milking !== '') filtered = filtered.filter(c => c.is_milking === (filters.is_milking === 'true'));
      
      setCows(filtered);
      setTotal(filtered.length);
    } finally {
      isRequesting = false;
      clearTimeout(failsafe);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = cows.map(c => ({
      Tag: c.tag_number,
      Name: c.name || '—',
      Breed: c.breed,
      'Date of Birth': c.date_of_birth || '—',
      'Health Status': c.health_status,
      'Is Milking': c.is_milking ? 'Yes' : 'No',
      'Weight (kg)': c.weight_kg || '—',
      Color: c.color || '—',
    }));
    downloadCSV(exportData, 'cows');
  };

  const handleDeleteCow = async () => {
    if (!cowToDelete) return;
    try {
      await api.delete(`/cows/${cowToDelete.id}`);
      toast.success('Cow deleted successfully');
      setCowToDelete(null);
      fetchCows();
    } catch (err) {
      toast.error(err.message || 'Failed to delete cow');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1.5 -ml-2 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Main Feature Tabs */}
      <div className="flex gap-4 border-b border-farm-border mb-4">
        <button
          onClick={() => setActiveMainTab('list')}
          className={`py-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeMainTab === 'list' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-farm-text-secondary hover:text-brand-primary'
          }`}
        >
          Cow List
        </button>
        <button
          onClick={() => setActiveMainTab('add')}
          className={`py-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === 'add' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-farm-text-secondary hover:text-brand-primary'
          }`}
        >
          <Plus size={16} /> Add Cow
        </button>
      </div>

      {activeMainTab === 'add' ? (
        <div className="animate-fade-in">
          <CowForm onSuccess={() => { setActiveMainTab('list'); fetchCows(); }} hideBackBtn />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <p className="text-sm text-farm-text-secondary">{total} cow{total !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 md:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-farm-text-secondary" />
            <input
              type="text"
              placeholder="Search tag or name..."
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              className="input-field pl-9 py-2 text-sm w-full md:w-52"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary py-2 px-3 text-sm ${showFilters ? 'ring-2 ring-brand-primary/20' : ''}`}>
            <Filter size={16} />
          </button>
          <div className="flex items-center border border-farm-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-brand-primary text-white' : 'bg-white text-farm-text-secondary hover:bg-gray-50'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('card')} className={`p-2 ${viewMode === 'card' ? 'bg-brand-primary text-white' : 'bg-white text-farm-text-secondary hover:bg-gray-50'}`}>
              <Grid3X3 size={16} />
            </button>
          </div>
          <button onClick={handleExportCSV} className="btn-secondary py-2 px-3 text-sm" title="Export CSV">
            <Download size={16} />
          </button>
          <button
            onClick={() => setActiveMainTab('add')}
            className="btn-primary py-2 px-3 text-sm flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> Add Cow
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Breed</label>
              <select value={filters.breed} onChange={(e) => { setFilters(f => ({ ...f, breed: e.target.value })); setPage(1); }} className="select-field text-sm py-2">
                <option value="">All breeds</option>
                {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Health Status</label>
              <select value={filters.health_status} onChange={(e) => { setFilters(f => ({ ...f, health_status: e.target.value })); setPage(1); }} className="select-field text-sm py-2">
                <option value="">All statuses</option>
                {HEALTH_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Milking</label>
              <select value={filters.is_milking} onChange={(e) => { setFilters(f => ({ ...f, is_milking: e.target.value })); setPage(1); }} className="select-field text-sm py-2">
                <option value="">All</option>
                <option value="true">Currently milking</option>
                <option value="false">Not milking</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : cows.length === 0 ? (
        <EmptyState
          icon={Beef}
          title="No cows found"
          description={filters.search ? 'Try a different search term' : 'Start by adding your first cow'}
          action={!filters.search && (
            <button onClick={() => setActiveMainTab('add')} className="btn-primary text-sm">
              <Plus size={16} className="mr-1.5 inline" /> Add First Cow
            </button>
          )}
        />
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Tag</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Breed</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Age</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Milking</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cows.map((cow) => (
                  <tr key={cow.id} className="table-row" onClick={() => navigate(`/cows/${cow.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-primary text-sm">{cow.tag_number}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{cow.name || '—'}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell text-farm-text-secondary">{cow.breed}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell text-farm-text-secondary">
                      {calculateAge(cow.date_of_birth)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cow.health_status}>{cow.health_status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${cow.is_milking ? 'text-success' : 'text-farm-text-secondary'}`}>
                        {cow.is_milking ? '🥛 Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell text-farm-text-secondary">
                      {formatDate(cow.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/cows/${cow.id}`)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-farm-text-secondary hover:text-brand-primary transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/cows/${cow.id}/edit`)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-farm-text-secondary hover:text-brand-primary transition-colors"
                          title="Edit Cow"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setCowToDelete(cow)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-farm-text-secondary hover:text-red-600 transition-colors"
                          title="Delete Cow"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cows.map((cow) => (
            <div
              key={cow.id}
              onClick={() => navigate(`/cows/${cow.id}`)}
              className="card p-4 cursor-pointer hover:shadow-elevated transition-all animate-fade-in flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-xl">
                    🐄
                  </div>
                  <Badge variant={cow.health_status}>{cow.health_status}</Badge>
                </div>
                <h4 className="font-heading font-semibold">{cow.name || cow.tag_number}</h4>
                <p className="text-sm text-farm-text-secondary">Tag: <span className="font-mono">{cow.tag_number}</span></p>
                <div className="mt-3 flex items-center justify-between text-xs text-farm-text-secondary">
                  <span>{cow.breed}</span>
                  <span>{calculateAge(cow.date_of_birth)}</span>
                </div>
                {cow.is_milking && (
                  <div className="mt-2 text-xs text-success font-medium">🥛 Currently milking</div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-farm-border flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/cows/${cow.id}`)}
                  className="text-xs text-brand-primary hover:underline font-medium"
                >
                  View details →
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/cows/${cow.id}/edit`)}
                    className="p-1.5 hover:bg-gray-100 rounded text-farm-text-secondary hover:text-brand-primary"
                    title="Edit Cow"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setCowToDelete(cow)}
                    className="p-1.5 hover:bg-red-50 rounded text-farm-text-secondary hover:text-red-600"
                    title="Delete Cow"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </>
      )}

      <ConfirmDialog
        isOpen={!!cowToDelete}
        onClose={() => setCowToDelete(null)}
        onConfirm={handleDeleteCow}
        title="Delete Cow"
        message={`Are you sure you want to delete cow "${cowToDelete?.name || cowToDelete?.tag_number}"? This will permanently remove this cow and its records.`}
        confirmText="Delete Cow"
        variant="danger"
      />
    </div>
  );
}
