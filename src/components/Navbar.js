import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const canUpload = ['manager', 'team_leader', 'super_admin'].includes(user?.role);
  const canViewTeam = ['manager', 'super_admin'].includes(user?.role);
  const isTL = user?.role === 'team_leader';
  const canManageUsers = ['manager', 'super_admin'].includes(user?.role);

  return (
    <div className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-gray-900 text-sm leading-tight">DealerDesk CRM</p>
            <p className="text-xs text-gray-500 leading-tight">{user?.name || user?.email} • {user?.role}</p>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/dashboard')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 Plans
          </button>

          {isTL && (
            <button
              onClick={() => navigate('/team-leader')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/team-leader') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👥 Team
            </button>
          )}

          {canViewTeam && (
            <button
              onClick={() => navigate('/manager-dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/manager-dashboard') || isActive('/manager') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👥 Team
            </button>
          )}

          {canManageUsers && (
            <button
              onClick={() => navigate('/users')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/users') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👤 Users
            </button>
          )}

          {(canViewTeam || isTL) && (
            <button
              onClick={() => navigate('/reports/daily-calls')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/reports/daily-calls') ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📊 Daily Report
            </button>
          )}

          {(canViewTeam || isTL) && (
            <button
              onClick={() => navigate('/search/advanced')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/search/advanced') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🔎 Plan Filter
            </button>
          )}

          {canUpload && (
            <button
              onClick={() => navigate('/upload')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/upload') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📤 Upload
            </button>
          )}

          <button
            onClick={onSearchClick}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            🔍 Quick Find
          </button>

          {(canViewTeam || isTL) && <NotificationBell />}

          {(canViewTeam || isTL) && (
            <button
              onClick={() => navigate('/settings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/settings') ? 'bg-gray-100 text-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ⚙️ Settings
            </button>
          )}

          {user?.role === 'super_admin' && (
            <button
              onClick={() => navigate('/admin')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin') ? 'bg-gray-100 text-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🏢 Admin
            </button>
          )}

          <button
            onClick={logout}
            className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors ml-2"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
