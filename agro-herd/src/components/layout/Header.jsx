import { Menu, Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationPanel from '../notifications/NotificationPanel';
import { isBackupDue } from '../../utils/backupService';

const pageTitles = {
  '/': 'Dashboard',
  '/cows': 'Cow Management',
  '/cycles': 'Cycle Tracker',
  '/milk': 'Milk Records',
  '/expenses': 'Expenses',
  '/health': 'Health Records',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const title = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/cows/') ? 'Cow Details' : 'AgroHerd');

  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/count');
      const backupDue = isBackupDue() ? 1 : 0;
      setUnreadCount((res.count || 0) + backupDue);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cows?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-farm-border h-16 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <h2 className="page-title text-xl md:text-2xl">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
          <Search size={16} className="absolute left-3 text-farm-text-secondary" />
          <input
            type="text"
            placeholder="Search cows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 pr-4 py-2 w-56 text-sm"
          />
        </form>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-farm-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse-soft">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationPanel
              onClose={() => setShowNotifications(false)}
              onUpdate={fetchUnreadCount}
            />
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-farm-border">
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
            <User size={16} className="text-brand-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-farm-text-primary leading-tight">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-farm-text-secondary capitalize">
              {user?.role || 'worker'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
