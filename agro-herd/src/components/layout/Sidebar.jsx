import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  const { profile, signOut } = useAuth();

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
              <h1 className="text-white font-heading font-bold text-lg tracking-tight">
                AgroHerd
              </h1>
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
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-white/10">
          {!collapsed && profile && (
            <div className="px-4 py-2 mb-2">
              <p className="text-white text-sm font-medium truncate">{profile.name}</p>
              <p className="text-white/50 text-xs capitalize">{profile.role}</p>
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
