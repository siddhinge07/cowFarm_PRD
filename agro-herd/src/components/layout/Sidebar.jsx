import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import {
  LayoutDashboard,
  Beef,
  DollarSign,
  Milk,
  HeartPulse,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
  LogOut,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cows', label: 'Cows', icon: Beef },
  { path: '/alerts', label: 'Alerts', icon: AlertCircle },
  { path: '/milk', label: 'Milk Records', icon: Milk },
  { path: '/expenses', label: 'Expenses', icon: DollarSign },
  { path: '/health', label: 'Health Records', icon: HeartPulse },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { profile, signOut, canViewExpenses } = useAuth();
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!profile) return;
    const fetchSidebarAlerts = async () => {
      try {
        const res = await api.get('/cycles');
        const data = res?.data || [];
        if (!Array.isArray(data)) return;
        const latestCyclesMap = {};
        data.forEach(c => {
          const existing = latestCyclesMap[c.cow_id];
          if (!existing || new Date(c.created_at || c.last_cycle_date) > new Date(existing.created_at || existing.last_cycle_date)) {
            latestCyclesMap[c.cow_id] = c;
          }
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const urgent = Object.values(latestCyclesMap).filter(c => {
          if (['pregnant', 'confirmed_pregnancy'].includes(c.cycle_status)) return false;
          const nextDate = new Date(c.last_cycle_date);
          nextDate.setDate(nextDate.getDate() + 21);
          nextDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((nextDate - today) / 86400000);
          return daysUntil <= 0;
        });
        if (mounted) setAlertsCount(urgent.length);
      } catch (err) {
        // silent
      }
    };
    fetchSidebarAlerts();
    return () => { mounted = false; };
  }, [location.pathname, profile]);

  const filteredNavItems = navItems.filter(item => {
    if ((item.path === '/expenses' || item.path === '/reports') && !canViewExpenses()) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-farm-sidebar z-50
          transition-all duration-300 ease-out flex flex-col
          ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐄</span>
              <div>
                <h1 className="text-white font-heading font-bold text-base tracking-tight leading-tight">
                  {profile?.farm_name || 'AgroHerd'}
                </h1>
                {profile?.farm_code && (
                  <p className="text-emerald-400 font-mono text-[10px] tracking-wider">{profile.farm_code}</p>
                )}
              </div>
            </div>
          )}
          {collapsed && <span className="text-2xl mx-auto">🐄</span>}
          <button
            onClick={mobileOpen ? onMobileClose : onToggle}
            className="text-white/60 hover:text-white transition-colors lg:block hidden"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          {mobileOpen && (
            <button onClick={onMobileClose} className="text-white/60 hover:text-white lg:hidden">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNavItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `sidebar-link relative ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span className="flex-1">{label}</span>}
              {path === '/alerts' && alertsCount > 0 && (
                collapsed ? (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-farm-sidebar animate-pulse" />
                ) : (
                  <span className="bg-red-500 text-white font-bold text-xs px-2 py-0.5 rounded-full ml-auto shadow-sm">
                    {alertsCount}
                  </span>
                )
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-white/10">
          {!collapsed && profile && (
            <div className="px-4 py-2 mb-2">
              <p className="text-white text-sm font-medium truncate">{profile.name}</p>
              <span className={`inline-block px-2 py-0.5 text-[11px] rounded-full font-medium ${
                profile.role === 'admin' ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-400/20 text-blue-300'
              }`}>
                {profile.role === 'admin' ? '👑 Farm Admin' : '🧑‍🌾 Worker'}
              </span>
            </div>
          )}
          <button
            onClick={signOut}
            className={`sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-900/30 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Logout"
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
