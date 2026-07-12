import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NavBtn = ({ label, path, active, onClick, activeClass = 'bg-blue-100 text-blue-700' }) => {
  const cls = active ? activeClass : 'text-gray-600 hover:bg-gray-100';
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${cls}`}>
      {label}
    </button>
  );
};

const Navbar = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isSuperAdmin   = user?.role === 'super_admin';
  const isSuperManager = user?.role === 'super_manager';
  const isManager      = user?.role === 'manager';
  const isTL           = user?.role === 'team_leader';
  const canUpload      = ['manager', 'super_manager', 'team_leader'].includes(user?.role);
  const canViewTeam    = isManager || isSuperManager;
  const canManageUsers = isManager || isSuperManager;

  const homeRoute = isSuperAdmin ? '/admin' : '/dashboard';

  const nav = (path) => { navigate(path); setMobileOpen(false); setUserMenuOpen(false); };

  const roleLabel = {
    super_admin: 'Super Admin', super_manager: 'Super Manager',
    manager: 'Manager', team_leader: 'Team Leader',
    telecaller: 'Telecaller', service_adviser: 'Service Adviser',
  }[user?.role] || user?.role;

  // Initials for avatar
  const initials = (user?.name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">

        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0 mr-2" onClick={() => navigate(homeRoute)}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-gray-900 text-sm leading-tight">DealerDesk CRM</p>
            {!isSuperAdmin && user?.dealershipName && (
              <p className="text-xs text-blue-600 font-medium leading-tight truncate max-w-[180px]">{user.dealershipName}</p>
            )}
          </div>
        </div>

        {/* Main nav links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {isSuperAdmin && <>
            <NavBtn label="🏢 Dealerships" active={isActive('/admin') && !isActive('/admin/service-intervals') && !isActive('/admin/overview')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/admin')} />
            <NavBtn label="🔧 Intervals"   active={isActive('/admin/service-intervals')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/admin/service-intervals')} />
            <NavBtn label="📊 Overview"    active={isActive('/admin/overview')} activeClass="bg-gray-100 text-gray-700" onClick={() => nav('/admin/overview')} />
          </>}

          {!isSuperAdmin && <NavBtn label="📋 Plans"       active={isActive('/dashboard')} onClick={() => nav('/dashboard')} />}
          {isTL          && <NavBtn label="👥 Team"        active={isActive('/team-leader')} onClick={() => nav('/team-leader')} />}
          {canViewTeam   && <NavBtn label="👥 Team"        active={isActive('/manager-dashboard') || isActive('/manager')} activeClass="bg-purple-100 text-purple-700" onClick={() => nav('/manager-dashboard')} />}
          {canManageUsers && <NavBtn label="👤 Users"      active={isActive('/users')} onClick={() => nav('/users')} />}
          {(canViewTeam || isTL) && <NavBtn label="📊 Reports"   active={isActive('/reports')} activeClass="bg-amber-100 text-amber-700" onClick={() => nav('/reports')} />}
          {(canViewTeam || isTL) && <NavBtn label="🎯 Campaigns" active={isActive('/campaigns')} activeClass="bg-indigo-100 text-indigo-700" onClick={() => nav('/campaigns')} />}
          {(canViewTeam || isTL) && <NavBtn label="🔎 Plan Search" active={isActive('/search/advanced')} onClick={() => nav('/search/advanced')} />}
          {canUpload     && <NavBtn label="📤 Upload"      active={isActive('/upload')} onClick={() => nav('/upload')} />}
          {!isSuperAdmin && (
            <button onClick={onSearchClick} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1">
              🔍 Find
            </button>
          )}
        </div>

        {/* Right side: bell + user avatar dropdown */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto">
          {(canViewTeam || isTL) && <NotificationBell />}

          {/* User avatar dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-400 leading-tight">{roleLabel}</p>
              </div>
              <span className="text-gray-400 text-xs">▾</span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                {/* User info header */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name || user?.email}</p>
                  <p className="text-xs text-gray-400">{roleLabel}</p>
                  {!isSuperAdmin && user?.dealershipName && (
                    <p className="text-xs text-blue-600 font-medium mt-0.5">{user.dealershipName}</p>
                  )}
                </div>

                {(canViewTeam || isTL) && (
                  <button onClick={() => nav('/settings')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${isActive('/settings') ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span>⚙️</span> Settings
                  </button>
                )}

                {!isSuperAdmin && (
                  <button onClick={() => nav('/change-password')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${isActive('/change-password') ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span>🔑</span> Change Password
                  </button>
                )}

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 text-red-500 hover:bg-red-50 transition-colors">
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: bell + hamburger */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          {(canViewTeam || isTL) && <NotificationBell />}
          <button onClick={() => setMobileOpen(o => !o)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
          {/* User info */}
          <div className="flex items-center gap-3 pb-3 mb-2 border-b border-gray-100">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user?.name || user?.email}</p>
              <p className="text-xs text-gray-400">{roleLabel}</p>
              {!isSuperAdmin && user?.dealershipName && (
                <p className="text-xs text-blue-600 font-medium">{user.dealershipName}</p>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            {isSuperAdmin && <>
              <MobileNavItem label="🏢 Dealerships"     active={isActive('/admin') && !isActive('/admin/service-intervals') && !isActive('/admin/overview')} onClick={() => nav('/admin')} />
              <MobileNavItem label="🔧 Service Intervals" active={isActive('/admin/service-intervals')} onClick={() => nav('/admin/service-intervals')} />
              <MobileNavItem label="📊 Admin Overview"  active={isActive('/admin/overview')} onClick={() => nav('/admin/overview')} />
            </>}
            {!isSuperAdmin && <MobileNavItem label="📋 Plans"      active={isActive('/dashboard')} onClick={() => nav('/dashboard')} />}
            {isTL          && <MobileNavItem label="👥 Team"       active={isActive('/team-leader')} onClick={() => nav('/team-leader')} />}
            {canViewTeam   && <MobileNavItem label="👥 Team"       active={isActive('/manager-dashboard')} onClick={() => nav('/manager-dashboard')} />}
            {canManageUsers && <MobileNavItem label="👤 Users"     active={isActive('/users')} onClick={() => nav('/users')} />}
            {(canViewTeam || isTL) && <MobileNavItem label="📊 Reports"   active={isActive('/reports')} onClick={() => nav('/reports')} />}
            {(canViewTeam || isTL) && <MobileNavItem label="🎯 Campaigns" active={isActive('/campaigns')} onClick={() => nav('/campaigns')} />}
            {(canViewTeam || isTL) && <MobileNavItem label="🔎 Plan Search" active={isActive('/search/advanced')} onClick={() => nav('/search/advanced')} />}
            {canUpload     && <MobileNavItem label="📤 Upload"     active={isActive('/upload')} onClick={() => nav('/upload')} />}
            {!isSuperAdmin && <MobileNavItem label="🔍 Quick Find" active={false} onClick={() => { onSearchClick?.(); setMobileOpen(false); }} />}

            <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5">
              {(canViewTeam || isTL) && <MobileNavItem label="⚙️ Settings"        active={isActive('/settings')} onClick={() => nav('/settings')} />}
              {!isSuperAdmin         && <MobileNavItem label="🔑 Change Password"  active={isActive('/change-password')} onClick={() => nav('/change-password')} />}
              <button onClick={logout} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                🚪 Logout
              </button>
            </div>
          </div>
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
