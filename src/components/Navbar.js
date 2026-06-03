import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NavBtn = ({ label, path, active, onClick, activeClass = 'bg-blue-100 text-blue-700' }) => {
  const cls = active ? activeClass : 'text-gray-600 hover:bg-gray-100';
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${cls}`}>
      {label}
    </button>
  );
};

const Navbar = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isSuperAdmin   = user?.role === 'super_admin';
  const isSuperManager = user?.role === 'super_manager';
  const isManager      = user?.role === 'manager';
  const isTL           = user?.role === 'team_leader';
  const canUpload      = ['manager', 'super_manager', 'team_leader'].includes(user?.role);
  const canViewTeam    = isManager || isSuperManager;
  const canManageUsers = isManager || isSuperManager;

  const homeRoute = isSuperAdmin ? '/admin' : '/dashboard';

  const nav = (path) => { navigate(path); setMobileOpen(false); };

  const roleLabel = {
    super_admin: 'Super Admin', super_manager: 'Super Manager',
    manager: 'Manager', team_leader: 'Team Leader',
    telecaller: 'Telecaller', service_adviser: 'Service Adviser',
  }[user?.role] || user?.role;

  return (
    <div className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate(homeRoute)}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-gray-900 text-sm leading-tight">DealerDesk CRM</p>
            <p className="text-xs text-gray-500 leading-tight">{user?.name || user?.email} · {roleLabel}</p>
          </div>
        </div>

        {/* Nav links — scrollable on small screens */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 justify-end">
          {isSuperAdmin && <>
            <NavBtn label="🏢 Dealerships" active={isActive('/admin') && !isActive('/admin/service-intervals') && !isActive('/admin/overview')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/admin')} />
            <NavBtn label="🔧 Intervals" active={isActive('/admin/service-intervals')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/admin/service-intervals')} />
            <NavBtn label="📊 Overview" active={isActive('/admin/overview')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/admin/overview')} />
          </>}

          {!isSuperAdmin && <NavBtn label="📋 Plans" active={isActive('/dashboard')} onClick={() => nav('/dashboard')} />}
          {isTL && <NavBtn label="👥 Team" active={isActive('/team-leader')} onClick={() => nav('/team-leader')} />}
          {canViewTeam && <NavBtn label="👥 Team" active={isActive('/manager-dashboard') || isActive('/manager')} activeClass="bg-purple-100 text-purple-700" onClick={() => nav('/manager-dashboard')} />}
          {canManageUsers && <NavBtn label="👤 Users" active={isActive('/users')} onClick={() => nav('/users')} />}
          {(canViewTeam || isTL) && <NavBtn label="📊 Reports" active={isActive('/reports')} activeClass="bg-amber-100 text-amber-700" onClick={() => nav('/reports')} />}
          {(canViewTeam || isTL) && <NavBtn label="🎯 Campaigns" active={isActive('/campaigns')} activeClass="bg-indigo-100 text-indigo-700" onClick={() => nav('/campaigns')} />}
          {(canViewTeam || isTL) && <NavBtn label="🔎 Plan Filter" active={isActive('/search/advanced')} onClick={() => nav('/search/advanced')} />}
          {canUpload && <NavBtn label="📤 Upload" active={isActive('/upload')} onClick={() => nav('/upload')} />}
          {!isSuperAdmin && (
            <button onClick={onSearchClick} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap">
              🔍 Quick Find
            </button>
          )}
          {(canViewTeam || isTL) && <NotificationBell />}
          {(canViewTeam || isTL) && <NavBtn label="⚙️ Settings" active={isActive('/settings')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/settings')} />}
          <button onClick={logout} className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors ml-1 whitespace-nowrap">
            Logout
          </button>
        </div>

        {/* Mobile: bell + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {(canViewTeam || isTL) && <NotificationBell />}
          <button onClick={() => setMobileOpen(o => !o)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1 shadow-lg">
          {isSuperAdmin && <>
            <MobileNavItem label="🏢 Dealerships" active={isActive('/admin') && !isActive('/admin/service-intervals') && !isActive('/admin/overview')} onClick={() => nav('/admin')} />
            <MobileNavItem label="🔧 Service Intervals" active={isActive('/admin/service-intervals')} onClick={() => nav('/admin/service-intervals')} />
            <MobileNavItem label="📊 Admin Overview" active={isActive('/admin/overview')} onClick={() => nav('/admin/overview')} />
          </>}
          {!isSuperAdmin && <MobileNavItem label="📋 Plans" active={isActive('/dashboard')} onClick={() => nav('/dashboard')} />}
          {isTL && <MobileNavItem label="👥 Team" active={isActive('/team-leader')} onClick={() => nav('/team-leader')} />}
          {canViewTeam && <MobileNavItem label="👥 Team" active={isActive('/manager-dashboard')} onClick={() => nav('/manager-dashboard')} />}
          {canManageUsers && <MobileNavItem label="👤 Users" active={isActive('/users')} onClick={() => nav('/users')} />}
          {(canViewTeam || isTL) && <MobileNavItem label="📊 Reports" active={isActive('/reports')} onClick={() => nav('/reports')} />}
          {(canViewTeam || isTL) && <MobileNavItem label="🎯 Campaigns" active={isActive('/campaigns')} onClick={() => nav('/campaigns')} />}
          {(canViewTeam || isTL) && <MobileNavItem label="🔎 Plan Filter" active={isActive('/search/advanced')} onClick={() => nav('/search/advanced')} />}
          {canUpload && <MobileNavItem label="📤 Upload" active={isActive('/upload')} onClick={() => nav('/upload')} />}
          {!isSuperAdmin && <MobileNavItem label="🔍 Quick Find" active={false} onClick={() => { onSearchClick?.(); setMobileOpen(false); }} />}
          {(canViewTeam || isTL) && <MobileNavItem label="⚙️ Settings" active={isActive('/settings')} onClick={() => nav('/settings')} />}
          <button onClick={logout} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-1">
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
};

const MobileNavItem = ({ label, active, onClick }) => (
  <button onClick={onClick}
    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
    {label}
  </button>
);

export default Navbar;
