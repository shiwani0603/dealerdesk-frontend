import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, settingsService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Deactivation Block Modal ─────────────────────────────────────────────────
const DeactivationBlockModal = ({ userName, breakdown, onClose, onGoToFilter }) => {
  const total = (breakdown?.insurance || 0) + (breakdown?.service || 0) + (breakdown?.psf || 0);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-xl">⚠️</div>
          <div>
            <h2 className="font-bold text-gray-900">Cannot Deactivate</h2>
            <p className="text-sm text-gray-500">{userName}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          This user has <span className="font-bold text-red-600">{total} active plan{total !== 1 ? 's' : ''}</span> assigned.
          Transfer all plans to another CRE before deactivating.
        </p>
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2">
          {breakdown?.insurance > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">🛡️ Insurance Plans</span>
              <span className="font-semibold text-gray-900">{breakdown.insurance}</span>
            </div>
          )}
          {breakdown?.service > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">🔧 Service Plans</span>
              <span className="font-semibold text-gray-900">{breakdown.service}</span>
            </div>
          )}
          {breakdown?.psf > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">😊 PSF Plans</span>
              <span className="font-semibold text-gray-900">{breakdown.psf}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            Close
          </button>
          <button onClick={onGoToFilter}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            Go to Plan Filter
          </button>
        </div>
      </div>
    </div>
  );
};

const ROLE_STYLES = {
  telecaller:  { label: 'Telecaller',  cls: 'bg-blue-100 text-blue-700' },
  team_leader: { label: 'Team Leader', cls: 'bg-purple-100 text-purple-700' },
  manager:     { label: 'Manager',     cls: 'bg-gray-100 text-gray-700' },
  super_admin: { label: 'Super Admin', cls: 'bg-red-100 text-red-700' },
};

const MODULE_LABELS = { insurance: 'Insurance', service: 'Service', both: 'Both' };

const suggestUsername = (name) =>
  name.toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');

const suggestPassword = (name) => {
  const initials = name.split(' ').map((w) => w[0] || '').join('').toUpperCase().slice(0, 2);
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${initials || 'DD'}@${digits}`;
};

const buildEmptyForm = () => ({
  name: '',
  username: '',
  email: '',
  mobile: '',
  password: '',
  showPassword: false,
  role: 'telecaller',
  locationId: '',
  moduleRights: 'both',
  teamLeaderId: '',
  uploadRights: false,
});

const buildEditForm = (u) => ({
  name: u.name,
  username: u.username || '',
  email: u.email || '',
  mobile: u.mobile || '',
  password: '',
  showPassword: false,
  role: u.role,
  locationId: u.locationId || '',
  moduleRights: u.moduleRights || 'both',
  teamLeaderId: u.teamLeaderId || '',
  uploadRights: u.uploadRights || false,
});

// ─── Slide-in panel ──────────────────────────────────────────────────────────

const UserPanel = ({ editUser, locations, teamLeaders, existingUsernames, isSuperManager, onClose, onSaved }) => {
  const isEdit = !!editUser;

  // Lazy initializer runs once on mount — key={panelKey} guarantees fresh mount each open
  const [form, setForm] = useState(() => isEdit ? buildEditForm(editUser) : buildEmptyForm());
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const makeUniqueUsername = (name) => {
    const base = suggestUsername(name);
    if (!base) return '';
    const taken = existingUsernames.filter((u) => !isEdit || u !== editUser?.username);
    if (!taken.includes(base)) return base;
    let i = 2;
    while (taken.includes(`${base}${i}`)) i++;
    return `${base}${i}`;
  };

  // Single atomic update: name + auto-suggest username together
  const handleNameChange = (val) => {
    setForm((f) => {
      const wasAutoUsername = !f.username || f.username === makeUniqueUsername(f.name);
      return {
        ...f,
        name: val,
        username: (!isEdit && wasAutoUsername) ? makeUniqueUsername(val) : f.username,
      };
    });
  };

  // When module rights change, clear team leader if no longer compatible
  const handleModuleChange = (mod) => {
    setForm((f) => {
      const currentTL = teamLeaders.find((tl) => tl.id === f.teamLeaderId);
      const tlStillCompatible = !currentTL || currentTL.moduleRights === 'both'
        || currentTL.moduleRights === mod || mod === 'both';
      return {
        ...f,
        moduleRights: mod,
        teamLeaderId: tlStillCompatible ? f.teamLeaderId : '',
      };
    });
  };

  const handleGeneratePassword = () => {
    setForm((f) => ({
      ...f,
      password: suggestPassword(f.name || 'User'),
      showPassword: true,
    }));
  };

  const currentRole = isEdit ? editUser.role : form.role;
  const isFieldRole = ['telecaller', 'team_leader', 'manager', 'service_adviser'].includes(currentRole);
  const isTelecaller = currentRole === 'telecaller';

  // Filter team leaders by module compatibility
  const compatibleTLs = teamLeaders.filter((tl) => {
    if (form.moduleRights === 'both') return true;
    if (!tl.moduleRights || tl.moduleRights === 'both') return true;
    return tl.moduleRights === form.moduleRights;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())     { toast.error('Name is required'); return; }
    if (!form.username.trim()) { toast.error('Username is required'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required'); return; }
    if (!form.locationId)      { toast.error('Location is required'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          name: form.name,
          username: form.username,
          email: form.email || null,
          mobile: form.mobile || null,
          locationId: form.locationId,
          moduleRights: form.moduleRights,
          teamLeaderId: form.teamLeaderId || null,
          uploadRights: form.uploadRights,
        };
        if (form.password) payload.password = form.password;
        const res = await userService.update(editUser.id, payload);
        toast.success('User updated');
        onSaved(res.data.user, 'edit');
      } else {
        const res = await userService.create({
          name: form.name,
          username: form.username,
          email: form.email || null,
          mobile: form.mobile || null,
          password: form.password,
          role: form.role,
          locationId: form.locationId,
          moduleRights: form.moduleRights,
          teamLeaderId: form.teamLeaderId || null,
          uploadRights: form.uploadRights,
        });
        toast.success('User created');
        onSaved(res.data.user, 'create');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">{isEdit ? `Edit — ${editUser.name}` : 'Add User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 px-5 py-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Priya Sharma"
            />
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Username * <span className="text-gray-400 font-normal">(used for login)</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => set('username', makeUniqueUsername(form.name || 'user'))}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Suggest username
                </button>
              )}
            </div>
            <input
              value={form.username}
              onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="e.g. priya.sharma"
              autoComplete="off"
            />
            {!isEdit && form.username && (
              <p className="text-xs text-gray-400 mt-1">
                Login as: <span className="font-mono text-blue-600">{form.username}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Password {isEdit ? <span className="text-gray-400 font-normal">(blank = keep current)</span> : '*'}
              </label>
              <button type="button" onClick={handleGeneratePassword} className="text-xs text-blue-600 hover:underline">
                Suggest password
              </button>
            </div>
            <div className="relative">
              <input
                type={form.showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className="w-full px-3 py-2 pr-14 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={isEdit ? 'Enter new password to change' : 'Set password'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => set('showPassword', !form.showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {form.showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Role — create only */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <div className="flex gap-2 flex-wrap">
                {(isSuperManager ? ['telecaller', 'team_leader', 'manager'] : ['telecaller', 'team_leader']).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('role', r)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.role === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ROLE_STYLES[r].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <select
              value={form.locationId}
              onChange={(e) => set('locationId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select location…</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}{loc.city ? ` — ${loc.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Module Rights — telecaller & team leader */}
          {isFieldRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Rights</label>
              <div className="flex gap-2">
                {['insurance', 'service', 'both'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModuleChange(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.moduleRights === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {MODULE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team Leader — telecaller only, filtered by module compatibility */}
          {isTelecaller && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Leader
                {compatibleTLs.length < teamLeaders.length && (
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    (filtered by {MODULE_LABELS[form.moduleRights]} module)
                  </span>
                )}
              </label>
              <select
                value={form.teamLeaderId}
                onChange={(e) => set('teamLeaderId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None (unassigned)</option>
                {compatibleTLs.map((tl) => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
              {compatibleTLs.length === 0 && teamLeaders.length > 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  No active team leaders with {MODULE_LABELS[form.moduleRights]} rights found.
                </p>
              )}
            </div>
          )}

          {/* Upload Rights — telecaller & team leader */}
          {isFieldRole && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Upload Rights</p>
                <p className="text-xs text-gray-400 mt-0.5">Allow uploading data</p>
              </div>
              <button
                type="button"
                onClick={() => set('uploadRights', !form.uploadRights)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.uploadRights ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.uploadRights ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          )}

          {/* Contact info */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">Contact Info (optional)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => set('mobile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10-digit mobile"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [panel, setPanel] = useState({ open: false, editUser: null, v: 0 });
  const [deactivationBlock, setDeactivationBlock] = useState(null);

  const [filterRole, setFilterRole] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterActive, setFilterActive] = useState('active');
  const [canCreateUsers, setCanCreateUsers] = useState(false);

  const teamLeaders = users.filter((u) => u.role === 'team_leader' && u.isActive);

  const { user: currentUser } = useAuth();
  const isSuperManager = currentUser?.role === 'super_manager';

  const loadData = useCallback(async () => {
    try {
      const [usersRes, locsRes, settingsRes] = await Promise.all([
        userService.list(),
        userService.listLocations(),
        settingsService.get().catch(() => null),
      ]);
      setUsers(usersRes.data.users);
      setLocations(locsRes.data.locations);
      // super_manager always can create; manager only if dealership allows
      setCanCreateUsers(isSuperManager || (settingsRes?.data?.settings?.managerCanCreateUsers ?? false));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [isSuperManager]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleActive = async (user) => {
    try {
      const res = await userService.toggleActive(user.id);
      toast.success(res.data.message);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
    } catch (err) {
      if (err.response?.data?.breakdown) {
        setDeactivationBlock({ userName: user.name, breakdown: err.response.data.breakdown });
      } else {
        toast.error(err.response?.data?.error || 'Failed to update status');
      }
    }
  };

  const handleSaved = (savedUser, mode) => {
    setUsers((prev) =>
      mode === 'create' ? [...prev, savedUser] : prev.map((u) => (u.id === savedUser.id ? savedUser : u))
    );
    setPanel((p) => ({ ...p, open: false, editUser: null }));
  };

  const openAdd  = () => setPanel((p) => ({ open: true, editUser: null, v: p.v + 1 }));
  const openEdit = (user) => setPanel((p) => ({ open: true, editUser: user, v: p.v + 1 }));

  // Module filter only applies to roles that have moduleRights
  const showModuleFilter = filterRole === 'all' || filterRole === 'telecaller' || filterRole === 'team_leader';

  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterActive === 'active' && !u.isActive) return false;
    if (filterActive === 'inactive' && u.isActive) return false;
    if (filterModule !== 'all') {
      const hasModuleRights = ['telecaller', 'team_leader'].includes(u.role);
      if (!hasModuleRights) return false;
      if (u.moduleRights !== filterModule) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading users…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">{users.filter((u) => u.isActive).length} active users</p>
          </div>
          {canCreateUsers && (
            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              + Add User
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
          {/* Filter header */}
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="text-sm font-bold text-gray-700">Filter Users</span>
          </div>

          {/* Filter sections */}
          <div className="flex flex-wrap divide-x divide-gray-200">
            {/* Role */}
            <div className="px-5 py-4 min-w-0">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Role</p>
              <div className="flex gap-2 flex-wrap">
                {['all', 'telecaller', 'team_leader', 'manager'].map((r) => (
                  <button
                    key={r}
                    onClick={() => { setFilterRole(r); if (r === 'manager') setFilterModule('all'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterRole === r
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r === 'all' ? 'All Roles' : ROLE_STYLES[r]?.label || r}
                  </button>
                ))}
              </div>
            </div>

            {/* Module — only when roles with module rights selected */}
            {showModuleFilter && (
              <div className="px-5 py-4 min-w-0">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Module</p>
                <div className="flex gap-2 flex-wrap">
                  {[['all', 'All Modules'], ['insurance', '🛡️ Insurance'], ['service', '🔧 Service'], ['both', 'Both']].map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setFilterModule(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filterModule === val
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="px-5 py-4 min-w-0">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Status</p>
              <div className="flex gap-2 flex-wrap">
                {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setFilterActive(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterActive === val
                        ? val === 'active'   ? 'bg-green-600 text-white shadow-sm'
                          : val === 'inactive' ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-gray-800 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-gray-500 font-medium">No users found</p>
              <p className="text-gray-400 text-sm mt-1">Adjust filters or add a new user</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left border-b border-gray-100">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">TL</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Upload</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const roleStyle = ROLE_STYLES[user.role] || { label: user.role, cls: 'bg-gray-100 text-gray-600' };
                    const isFieldRole = ['telecaller', 'team_leader', 'manager', 'service_adviser'].includes(user.role);
                    return (
                      <tr key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          {user.mobile && <p className="text-xs text-gray-400 mt-0.5">{user.mobile}</p>}
                          {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {user.username || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${roleStyle.cls}`}>
                            {roleStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 text-xs">
                          {isFieldRole ? (MODULE_LABELS[user.moduleRights] || '—') : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 text-xs">{user.location?.name || '—'}</td>
                        <td className="px-4 py-3.5 text-gray-600 text-xs">{user.teamLeader?.name || '—'}</td>
                        <td className="px-4 py-3.5">
                          {isFieldRole ? (
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              user.uploadRights ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {user.uploadRights ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                              user.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-500 hover:bg-red-200'
                            }`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => openEdit(user)}
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {panel.open && (
        <UserPanel
          key={panel.v}
          editUser={panel.editUser}
          locations={locations}
          teamLeaders={teamLeaders}
          existingUsernames={users.map((u) => u.username).filter(Boolean)}
          isSuperManager={isSuperManager}
          onClose={() => setPanel((p) => ({ ...p, open: false, editUser: null }))}
          onSaved={handleSaved}
        />
      )}

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelectCustomer={() => setShowSearch(false)}
        />
      )}

      {deactivationBlock && (
        <DeactivationBlockModal
          userName={deactivationBlock.userName}
          breakdown={deactivationBlock.breakdown}
          onClose={() => setDeactivationBlock(null)}
          onGoToFilter={() => { setDeactivationBlock(null); navigate('/search/advanced'); }}
        />
      )}
    </div>
  );
};

export default UserManagement;
