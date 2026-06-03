import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NavBtn = ({ label, path, active, onClick, activeClass = 'bg-blue-100 text-blue-700' }) => {
  const cls = active ? activeClass : 'text-gray-600 hover:bg-gray-100';
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${cls}`}>
      {label}
    </button>
  );
};

const Navbar = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isSuperAdmin   = user?.role === 'super_admin';
  const isSuperManager = user?.role === 'super_manager';
  const isManager      = user?.role === 'manager';
  const isTL           = user?.role === 'team_leader';
  const canUpload      = ['manager', 'super_manager', 'team_leader'].includes(user?.role);
  const canViewTeam    = isManager || isSuperManager;
  const canManageUsers = isManager || isSuperManager;

  const homeRoute = isSuperAdmin ? '/admin' : '/dashboard';

  return (
    <div className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(homeRoute)}>
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

          {/* ── Super Admin: only admin-panel links ── */}
          {isSuperAdmin && (
            <NavBtn label="🏢 Dealerships" path="/admin"
              active={isActive('/admin')} activeClass="bg-gray-100 text-gray-700"
              onClick={() => navigate('/admin')} />
          )}

          {isSuperAdmin && (
            <NavBtn label="🔧 Intervals" path="/admin/service-intervals"
              active={isActive('/admin/service-intervals')} activeClass="bg-gray-100 text-gray-700"
              onClick={() => navigate('/admin/service-intervals')} />
          )}

          {isSuperAdmin && (
            <NavBtn label="📊 Overview" path="/admin/overview"
              active={isActive('/admin/overview')} activeClass="bg-gray-100 text-gray-700"
              onClick={() => navigate('/admin/overview')} />
          )}

          {/* ── Telecaller / TL / Manager: dealership links ── */}
          {!isSuperAdmin && (
            <NavBtn label="📋 Plans" path="/dashboard"
              active={isActive('/dashboard')} onClick={() => navigate('/dashboard')} />
          )}

          {isTL && (
            <NavBtn label="👥 Team" active={isActive('/team-leader')}
              onClick={() => navigate('/team-leader')} />
          )}

          {canViewTeam && (
            <NavBtn label="👥 Team"
              active={isActive('/manager-dashboard') || isActive('/manager')}
              activeClass="bg-purple-100 text-purple-700"
              onClick={() => navigate('/manager-dashboard')} />
          )}

          {canManageUsers && (
            <NavBtn label="👤 Users" active={isActive('/users')}
              onClick={() => navigate('/users')} />
          )}

          {(canViewTeam || isTL) && (
            <NavBtn label="📊 Reports" active={isActive('/reports') || isActive('/reports/daily-calls')}
              activeClass="bg-amber-100 text-amber-700"
              onClick={() => navigate('/reports')} />
          )}

          {(canViewTeam || isTL) && (
            <NavBtn label="🎯 Campaigns" active={isActive('/campaigns')}
              activeClass="bg-indigo-100 text-indigo-700"
              onClick={() => navigate('/campaigns')} />
          )}

          {(canViewTeam || isTL) && (
            <NavBtn label="🔎 Plan Filter" active={isActive('/search/advanced')}
              onClick={() => navigate('/search/advanced')} />
          )}

          {canUpload && (
            <NavBtn label="📤 Upload" active={isActive('/upload')}
              onClick={() => navigate('/upload')} />
          )}

          {!isSuperAdmin && (
            <button onClick={onSearchClick}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              🔍 Quick Find
            </button>
          )}

          {(canViewTeam || isTL) && <NotificationBell />}

          {(canViewTeam || isTL) && (
            <NavBtn label="⚙️ Settings" active={isActive('/settings')}
              activeClass="bg-gray-100 text-gray-700"
              onClick={() => navigate('/settings')} />
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
