import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BREEDS, HEALTH_STATUSES } from '../../constants';
import { formatDate, calculateAge, downloadCSV } from '../../utils/helpers';
import { Badge, Pagination, EmptyState, PageLoader } from '../../components/common';
import { Plus, Search, Filter, Grid3X3, List, Download, Beef } from 'lucide-react';
import CowForm from './CowForm';

export default function CowList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEdit } = useAuth();
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [activeMainTab, setActiveMainTab] = useState('list');
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
      let query = supabase
        .from('cows')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (filters.search) {
        query = query.or(`tag_number.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }
      if (filters.breed) query = query.eq('breed', filters.breed);
      if (filters.health_status) query = query.eq('health_status', filters.health_status);
      if (filters.is_milking !== '') query = query.eq('is_milking', filters.is_milking === 'true');

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2500));
      const res = await Promise.race([query, timeoutPromise]);
      
      if (res.error) throw res.error;
      
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
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
        {canEdit() && (
          <button
            onClick={() => setActiveMainTab('add')}
            className={`py-3 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeMainTab === 'add' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-farm-text-secondary hover:text-brand-primary'
            }`}
          >
            <Plus size={16} /> Add Cow
          </button>
        )}
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
          action={canEdit() && !filters.search && (
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
              className="card p-4 cursor-pointer hover:shadow-elevated transition-all animate-fade-in"
            >
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
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </>
      )}
    </div>
  );
}
