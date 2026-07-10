import React, { useState, useEffect, useCallback } from 'react';
import { dealershipService, userService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;
  const base = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 0; i < 6; i++) base.push(all[Math.floor(Math.random() * all.length)]);
  return base.sort(() => 0.5 - Math.random()).join('');
}

function generateUsername(name, existingUsernames = []) {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  if (!base) return '';
  if (!existingUsernames.includes(base)) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!existingUsernames.includes(candidate)) return candidate;
  }
  return base;
}

const ROLE_LABELS = {
  super_manager: 'Super Manager',
  manager: 'Manager',
  team_leader: 'Team Leader',
  telecaller: 'Telecaller',
  service_adviser: 'Service Adviser',
};

const ROLE_COLORS = {
  super_manager: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  team_leader: 'bg-teal-100 text-teal-700',
  telecaller: 'bg-gray-100 text-gray-600',
  service_adviser: 'bg-orange-100 text-orange-700',
};

const MODULE_LABELS = { insurance: '🛡️ Insurance', service: '🔧 Service', both: '🔀 Both' };

const MODULE_ICONS = { insurance: '🛡️', service: '🔧', psf: '😊', tyre_policy: '🔵', presale: '🚗', vas: '✨' };

const ALL_MAKES = [
  { value: 'tata', label: 'Tata' },
  { value: 'maruti', label: 'Maruti Suzuki' },
  { value: 'hyundai', label: 'Hyundai' },
  { value: 'honda', label: 'Honda' },
  { value: 'toyota', label: 'Toyota' },
  { value: 'mahindra', label: 'Mahindra' },
  { value: 'kia', label: 'Kia' },
  { value: 'mg', label: 'MG' },
  { value: 'renault', label: 'Renault' },
  { value: 'nissan', label: 'Nissan' },
  { value: 'volkswagen', label: 'Volkswagen' },
  { value: 'skoda', label: 'Skoda' },
  { value: 'jeep', label: 'Jeep' },
  { value: 'ford', label: 'Ford' },
  { value: 'mercedes', label: 'Mercedes-Benz' },
  { value: 'bmw', label: 'BMW' },
  { value: 'audi', label: 'Audi' },
  { value: 'volvo', label: 'Volvo' },
  { value: 'isuzu', label: 'Isuzu' },
  { value: 'force', label: 'Force' },
];
const MAKE_LABEL_MAP = Object.fromEntries(ALL_MAKES.map(m => [m.value, m.label]));

// ─── Credentials Modal ────────────────────────────────────────────────────────

const CredentialField = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-mono font-bold text-gray-900 mt-0.5 break-all">{value}</p>
      </div>
      <button onClick={copy}
        className="text-xs font-semibold flex-shrink-0 px-2 py-1 rounded-lg transition-colors text-blue-600 hover:bg-blue-50">
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
};

const CredentialsModal = ({ name, username, password, onClose }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">✅</div>
          <h2 className="text-lg font-bold text-gray-900">User Created</h2>
          <p className="text-sm text-gray-500 mt-1">
            Share these login credentials with <span className="font-semibold text-gray-700">{name}</span>
          </p>
        </div>
        <div className="space-y-3 mb-4">
          <CredentialField label="Username / Login ID" value={username} />
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 font-medium mb-1">Temporary Password</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-mono font-bold text-gray-900 break-all">
                {showPassword ? password : '•'.repeat(password.length)}
              </p>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setShowPassword(s => !s)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
                  {showPassword ? 'Hide' : 'Reveal'}
                </button>
                <CredentialField label="" value={password} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-blue-700 font-semibold mb-1">🔒 Password policy</p>
          <p className="text-xs text-blue-600">The user will be asked to set their own password on first login. After that, <strong>you cannot see or recover their password</strong>.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
          <p className="text-xs text-amber-700">
            ⚠️ Copy the temporary password now — it won't be shown again.
          </p>
        </div>
        <button onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
          Done — Credentials Noted
        </button>
      </div>
    </div>
  );
};

// ─── Add / Edit User Modal ────────────────────────────────────────────────────

const AddDealershipUserModal = ({ dealership, existingUser, dealershipUsers, onClose, onSaved }) => {
  const isEdit = !!existingUser;

  const [form, setForm] = useState(() => ({
    name: existingUser?.name || '',
    username: existingUser?.username || '',
    usernameTouched: isEdit,
    email: existingUser?.email || '',
    mobile: existingUser?.mobile || '',
    password: isEdit ? '' : generatePassword(),
    showPassword: false,
    role: existingUser?.role || 'telecaller',
    locationId: existingUser?.locationId || (dealership.locations?.[0]?.id || ''),
    managedLocationIds: existingUser?.managedLocationIds || [],
    teamLeaderId: existingUser?.teamLeaderId || '',
    moduleRights: existingUser?.moduleRights || 'both',
    uploadRights: existingUser?.uploadRights || false,
    allowedMakes: existingUser?.allowedMakes || [],
  }));
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const needsModuleRights = ['telecaller', 'team_leader', 'service_adviser', 'manager'].includes(form.role);
  const needsTeamLeader  = ['telecaller', 'service_adviser'].includes(form.role);
  const isManagerRole    = ['manager', 'super_manager'].includes(form.role);
  // super_manager is dealership admin — no module restriction, no team leader

  const existingUsernames = (dealershipUsers || [])
    .filter(u => !existingUser || u.id !== existingUser.id)
    .map(u => u.username).filter(Boolean);
  const usernameTaken = !!form.username && existingUsernames.includes(form.username);

  const dealershipMakes = Array.isArray(dealership.allowedMakes) ? dealership.allowedMakes : [];

  const allTeamLeaders = (dealershipUsers || []).filter(u => u.role === 'team_leader' && u.isActive);
  const teamLeaders = allTeamLeaders.filter(u => {
    // Module filter
    const moduleOk = !needsModuleRights || form.moduleRights === 'both' ||
      !u.moduleRights || u.moduleRights === 'both' || u.moduleRights === form.moduleRights;
    if (!moduleOk) return false;
    // Location filter — TL must be at the same location as the telecaller
    if (form.locationId && u.locationId && u.locationId !== form.locationId) return false;
    return true;
  });
  const hiddenTLCount = allTeamLeaders.length - teamLeaders.length;

  const toggleManagedLocation = (locId) => {
    setForm(f => {
      const current = f.managedLocationIds || [];
      return {
        ...f,
        managedLocationIds: current.includes(locId)
          ? current.filter(id => id !== locId)
          : [...current, locId],
      };
    });
  };

  const toggleAllowedMake = (make) => {
    setForm(f => {
      const current = f.allowedMakes || [];
      return {
        ...f,
        allowedMakes: current.includes(make)
          ? current.filter(m => m !== make)
          : [...current, make],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.username.trim()) { toast.error('Username is required'); return; }
    if (usernameTaken) { toast.error('Username is already taken'); return; }
    if (!isEdit && !form.password.trim()) { toast.error('Password is required'); return; }
    if (!form.locationId) { toast.error('Location is required'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        role: form.role,
        locationId: form.locationId,
        teamLeaderId: needsTeamLeader ? (form.teamLeaderId || null) : null,
        moduleRights: needsModuleRights ? form.moduleRights : null,
        uploadRights: form.uploadRights,
        managedLocationIds: isManagerRole ? (form.managedLocationIds || []) : [],
        allowedMakes: form.allowedMakes || [],
      };

      if (!isEdit) {
        payload.password = form.password;
        await dealershipService.createUser(dealership.id, payload);
        onSaved({ name: form.name, username: form.username, password: form.password });
      } else {
        if (form.password.trim()) payload.password = form.password.trim();
        await dealershipService.updateUser(dealership.id, existingUser.id, payload);
        onSaved(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit User' : 'Add User'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{dealership.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Username */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input value={form.name}
                onChange={e => {
                  const v = e.target.value;
                  setForm(f => {
                    const updates = { name: v };
                    if (!f.usernameTouched && v.trim()) {
                      updates.username = generateUsername(v, existingUsernames);
                    }
                    return { ...f, ...updates };
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Ravi Kumar" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Username * <span className="text-gray-400 font-normal">(login)</span></label>
              <input value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase(), usernameTouched: true }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
                  usernameTaken ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="e.g. ravi.kumar" />
              {usernameTaken && (
                <p className="text-xs text-red-500 mt-1">Username already taken in this dealership</p>
              )}
              {!usernameTaken && form.username && !form.usernameTouched && (
                <p className="text-xs text-green-600 mt-1">✓ Auto-suggested — edit if needed</p>
              )}
            </div>
          </div>

          {/* Mobile + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10-digit number" type="tel" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="optional" type="email" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Password {isEdit ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span> : '*'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input value={form.password} onChange={e => set('password', e.target.value)}
                  type={form.showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-14 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isEdit ? 'New password…' : ''} />
                <button type="button" onClick={() => set('showPassword', !form.showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {form.showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {!isEdit && (
                <button type="button" onClick={() => set('password', generatePassword())}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 flex-shrink-0 transition-colors"
                  title="Generate new password">
                  🔄
                </button>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => set('role', val)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all text-center ${
                    form.role === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {isManagerRole ? 'Primary Location *' : 'Location *'}
            </label>
            {dealership.locations?.length === 0
              ? <p className="text-xs text-red-500">No locations — add a location to this dealership first.</p>
              : (
                <select value={form.locationId} onChange={e => set('locationId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select location…</option>
                  {dealership.locations?.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}{loc.city ? ` — ${loc.city}` : ''}</option>
                  ))}
                </select>
              )
            }
          </div>

          {/* Managed Locations (manager / super_manager only) */}
          {isManagerRole && dealership.locations?.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Managed Locations <span className="text-gray-400 font-normal">(all locations if none selected)</span>
              </label>
              <div className="space-y-1.5">
                {dealership.locations?.map(loc => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.managedLocationIds || []).includes(loc.id)}
                      onChange={() => toggleManagedLocation(loc.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{loc.name}{loc.city ? ` — ${loc.city}` : ''}</span>
                  </label>
                ))}
              </div>
              {(form.managedLocationIds || []).length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No restriction — manager can see all locations</p>
              )}
            </div>
          )}

          {/* Module Rights */}
          {needsModuleRights && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Module Access</label>
              <div className="flex gap-2">
                {Object.entries(MODULE_LABELS).map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => set('moduleRights', val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all text-center ${
                      form.moduleRights === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team Leader */}
          {needsTeamLeader && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Team Leader <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {teamLeaders.length === 0 && allTeamLeaders.length === 0 && (
                <p className="text-xs text-gray-400">No active team leaders found. You can assign one later.</p>
              )}
              {teamLeaders.length === 0 && allTeamLeaders.length > 0 && (
                <p className="text-xs text-amber-600">
                  No {MODULE_LABELS[form.moduleRights]} team leaders found.
                  {hiddenTLCount > 0 && ` (${hiddenTLCount} TL${hiddenTLCount > 1 ? 's' : ''} have a different module)`}
                </p>
              )}
              {teamLeaders.length > 0 && (
                <>
                  <select value={form.teamLeaderId} onChange={e => set('teamLeaderId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Unassigned —</option>
                    {teamLeaders.map(tl => (
                      <option key={tl.id} value={tl.id}>{tl.name}</option>
                    ))}
                  </select>
                  {hiddenTLCount > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {hiddenTLCount} TL{hiddenTLCount > 1 ? 's' : ''} hidden — different module
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Upload Rights */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Upload Rights</p>
              <p className="text-xs text-gray-400">Allow this user to upload data files</p>
            </div>
            <button type="button" onClick={() => set('uploadRights', !form.uploadRights)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.uploadRights ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.uploadRights ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Make Rights */}
          {dealershipMakes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Make Access <span className="text-gray-400 font-normal">(all makes if none selected)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {dealershipMakes.map(make => {
                  const selected = (form.allowedMakes || []).includes(make);
                  return (
                    <button
                      key={make}
                      type="button"
                      onClick={() => toggleAllowedMake(make)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {make}
                    </button>
                  );
                })}
              </div>
              {(form.allowedMakes || []).length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No restriction — user can see all makes</p>
              )}
            </div>
          )}

          <button type="submit" disabled={saving || (!isEdit && !form.locationId)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Dealership Form Modal ────────────────────────────────────────────────────

const DealershipModal = ({ existing, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name || '',
    dealershipCode: existing?.workshopCode || '',
    modulesEnabled: existing?.modulesEnabled || {
      insurance: false, service: false, psf: false,
      tyre_policy: false, presale: false, vas: false,
    },
    allowedMakes: Array.isArray(existing?.allowedMakes) ? existing.allowedMakes : [],
    isActive: existing?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleModule = (mod) => setForm(f => ({
    ...f,
    modulesEnabled: { ...f.modulesEnabled, [mod]: !f.modulesEnabled[mod] },
  }));
  const toggleMake = (val) => setForm(f => ({
    ...f,
    allowedMakes: f.allowedMakes.includes(val)
      ? f.allowedMakes.filter(m => m !== val)
      : [...f.allowedMakes, val],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Dealership name is required'); return; }
    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await dealershipService.update(existing.id, {
          name: form.name,
          workshopCode: form.dealershipCode || null,
          modulesEnabled: form.modulesEnabled,
          allowedMakes: form.allowedMakes,
          isActive: form.isActive,
        });
      } else {
        res = await dealershipService.create({ name: form.name, workshopCode: form.dealershipCode || null });
        await dealershipService.update(res.data.dealership.id, {
          modulesEnabled: form.modulesEnabled,
          allowedMakes: form.allowedMakes,
        });
      }
      toast.success(isEdit ? 'Dealership updated' : 'Dealership created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const MODULE_FORM_LABELS = {
    insurance: '🛡️ Insurance', service: '🔧 Service', psf: '😊 PSF',
    tyre_policy: '🔵 Tyre Policy', presale: '🚗 Presale', vas: '✨ VAS',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Dealership' : 'New Dealership'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dealership Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Sai Honda Motors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dealership Code</label>
            <input value={form.dealershipCode} onChange={e => set('dealershipCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. DL001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modules Enabled</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(MODULE_FORM_LABELS).map(mod => (
                <button key={mod} type="button" onClick={() => toggleModule(mod)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    form.modulesEnabled[mod] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    form.modulesEnabled[mod] ? 'border-white bg-white text-blue-600' : 'border-gray-400'
                  }`}>{form.modulesEnabled[mod] ? '✓' : ''}</span>
                  {MODULE_FORM_LABELS[mod]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Makes</label>
            <p className="text-xs text-gray-400 mb-2">Only selected makes can be uploaded for this dealership.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_MAKES.map(m => (
                <button key={m.value} type="button" onClick={() => toggleMake(m.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.allowedMakes.includes(m.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {form.allowedMakes.includes(m.value) ? '✓ ' : ''}{m.label}
                </button>
              ))}
            </div>
            {form.allowedMakes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1.5">⚠️ No makes selected — all uploads will be blocked.</p>
            )}
          </div>

          {isEdit && (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Dealership Active</p>
                <p className="text-xs text-gray-400">Inactive dealerships cannot log in</p>
              </div>
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Dealership'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Add Location Modal ───────────────────────────────────────────────────────

const AddLocationModal = ({ dealership, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', city: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Location name is required'); return; }
    setSaving(true);
    try {
      await dealershipService.addLocation(dealership.id, { name: form.name, city: form.city || null });
      toast.success('Location added');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Add Location</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Adding to: <span className="font-semibold text-gray-700">{dealership.name}</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Main Showroom" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Pune" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Adding…' : 'Add Location'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Dealership Settings Tab ─────────────────────────────────────────────────

const NumberField = ({ label, value, onChange, max = 365 }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
    <input type="number" value={value} min={1} max={max}
      onChange={e => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
  </div>
);

const ToggleRow = ({ label, hint, value, onChange }) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const DealershipSettingsTab = ({ dealership }) => {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    dealershipService.getSettings(dealership.id)
      .then(r => { setSettings(r.data.settings); setForm(r.data.settings); })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [dealership.id]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await dealershipService.updateSettings(dealership.id, {
        managerCanEditSettings: form.managerCanEditSettings,
        managerCanCreateUsers: form.managerCanCreateUsers,
        maxFollowupGapDays: form.maxFollowupGapDays,
        followupStartDaysBefore: form.followupStartDaysBefore,
        autoCloseDays: form.autoCloseDays,
        autoCloseAlertDays: form.autoCloseAlertDays,
        callingMode: form.callingMode,
        exportRightsEnabled: form.exportRightsEnabled,
        mobileExportEnabled: form.mobileExportEnabled,
      });
      setSettings(res.data.settings);
      setForm(res.data.settings);
      setDirty(false);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!form) return null;

  const enabledModules = Object.entries(form.modulesEnabled || {}).filter(([, v]) => v).map(([k]) => k);
  const allowedMakes = Array.isArray(form.allowedMakes) ? form.allowedMakes : [];

  return (
    <div className="space-y-4">
      {/* Manager can edit toggle — prominent at top */}
      <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
        form.managerCanEditSettings ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div>
          <p className="text-sm font-semibold text-gray-700">Manager Can Edit Settings</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {form.managerCanEditSettings
              ? 'Manager can view and change these settings'
              : 'Only admin can change settings — manager sees read-only'}
          </p>
        </div>
        <button type="button" onClick={() => set('managerCanEditSettings', !form.managerCanEditSettings)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.managerCanEditSettings ? 'bg-green-500' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.managerCanEditSettings ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Manager user creation toggle */}
      <div className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
        form.managerCanCreateUsers ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div>
          <p className="text-sm font-semibold text-gray-700">Manager Can Create Users</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {form.managerCanCreateUsers
              ? 'Manager can add telecallers and team leaders'
              : 'Only admin can create users for this dealership'}
          </p>
        </div>
        <button type="button" onClick={() => set('managerCanCreateUsers', !form.managerCanCreateUsers)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.managerCanCreateUsers ? 'bg-green-500' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.managerCanCreateUsers ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Active modules — read-only display, configured via Edit Dealership */}
      <div className="bg-gray-50 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Modules</p>
          <span className="text-xs text-gray-400">Edit via ✏️ Dealership</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {enabledModules.length === 0
            ? <span className="text-xs text-gray-400 italic">No modules enabled</span>
            : enabledModules.map(m => (
              <span key={m} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                {MODULE_ICONS[m]} {m.replace('_', ' ')}
              </span>
            ))
          }
        </div>
      </div>

      {/* Allowed makes — read-only display, configured via Edit Dealership */}
      <div className="bg-gray-50 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Allowed Makes</p>
          <span className="text-xs text-gray-400">Edit via ✏️ Dealership</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {allowedMakes.length === 0
            ? <span className="text-xs text-amber-500 italic">No makes set — uploads blocked</span>
            : allowedMakes.map(m => (
              <span key={m} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                🚗 {MAKE_LABEL_MAP[m] || m}
              </span>
            ))
          }
        </div>
      </div>

      {/* Follow-up rules */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Follow-up Rules</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Start (days before due)" value={form.followupStartDaysBefore} onChange={v => set('followupStartDaysBefore', v)} max={180} />
          <NumberField label="Max gap between calls" value={form.maxFollowupGapDays} onChange={v => set('maxFollowupGapDays', v)} />
        </div>
      </div>

      {/* Auto-close rules */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auto-Close Rules</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Auto-close after (days)" value={form.autoCloseDays} onChange={v => set('autoCloseDays', v)} />
          <NumberField label="Red alert before auto-close" value={form.autoCloseAlertDays} onChange={v => set('autoCloseAlertDays', v)} />
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2 text-xs text-amber-700">
          Follow-up starts {form.followupStartDaysBefore}d before due → red alert {form.autoCloseAlertDays}d before auto-close → closes {form.autoCloseDays}d after due
        </div>
      </div>

      {/* Calling mode */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Calling Mode</p>
        <div className="flex gap-2">
          {[['central', '🏢 Central'], ['local', '📍 Local']].map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => set('callingMode', val)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                form.callingMode === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Export toggles */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Export & Access</p>
        <ToggleRow label="Allow Data Export" hint="Enable TLs/managers to export plan data"
          value={form.exportRightsEnabled} onChange={v => set('exportRightsEnabled', v)} />
        <ToggleRow label="Allow Mobile Number Export" hint="Include customer mobiles in exports"
          value={form.mobileExportEnabled} onChange={v => set('mobileExportEnabled', v)} />
      </div>

      {/* Save / Discard */}
      {dirty && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => { setForm(settings); setDirty(false); }}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            Discard
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Dealership Card ──────────────────────────────────────────────────────────

const DealershipCard = ({ d, number, onEdit, onAddLocation, onAddUser, onEditUser, usersRefreshKey }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('locations');
  const [users, setUsers] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [filterModule, setFilterModule] = useState('all');

  const modules = d.modulesEnabled || {};
  const activeModules = Object.entries(modules).filter(([, v]) => v).map(([k]) => k);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await dealershipService.getUsers(d.id);
      setUsers(res.data.users);
    } catch {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [d.id]);

  // Refresh when parent signals (after add/edit user)
  useEffect(() => {
    if (activeTab === 'users' && usersRefreshKey > 0) {
      fetchUsers();
    }
  }, [usersRefreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'users' && users === null) fetchUsers();
  };

  const [resetResult, setResetResult] = useState(null);

  const handleResetUserPassword = async (user) => {
    if (!window.confirm(`Reset password for ${user.name}?\n\nA new temporary password will be generated and they must change it on next login.`)) return;
    try {
      const res = await userService.resetPassword(user.id);
      setResetResult({ name: user.name, username: res.data.username, newPassword: res.data.newPassword });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleToggleUser = async (user) => {
    try {
      const res = await dealershipService.toggleUserActive(d.id, user.id);
      toast.success(res.data.message);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      if (err.response?.data?.breakdown) {
        const b = err.response.data.breakdown;
        const parts = [];
        if (b.insurance) parts.push(`${b.insurance} insurance`);
        if (b.service) parts.push(`${b.service} service`);
        if (b.psf) parts.push(`${b.psf} PSF`);
        toast.error(`Cannot deactivate ${user.name}: has ${parts.join(', ')} open plans. Transfer all plans first.`, { duration: 5000 });
      } else {
        toast.error(err.response?.data?.error || 'Failed to update user');
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${d.isActive ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${d.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            {number ? `#${number}` : d.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 truncate">{d.name}</p>
              {!d.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
            </div>
            {d.workshopCode && <p className="text-xs text-gray-400 font-mono mt-0.5">{d.workshopCode}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              <span>👥 {d._count?.users || 0} users</span>
              <span>📍 {d._count?.locations || 0} locations</span>
            </div>
            {activeModules.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {activeModules.map(m => (
                  <span key={m} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                    {MODULE_ICONS[m]} {m.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => { setExpanded(e => !e); if (!expanded) handleTabChange(activeTab); }}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={() => onEdit(d)}
            className="p-2 rounded-lg text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors text-sm">
            ✏️
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5">
            {[['locations', '📍 Locations'], ['users', '👥 Users'], ['settings', '⚙️ Settings']].map(([tab, label]) => (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Locations tab */}
          {activeTab === 'locations' && (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Locations</p>
                <button onClick={() => onAddLocation(d)}
                  className="text-xs text-blue-600 font-semibold hover:underline">
                  + Add Location
                </button>
              </div>
              {d.locations?.length === 0
                ? <p className="text-xs text-gray-400 italic">No locations yet</p>
                : (
                  <div className="space-y-1">
                    {d.locations?.map(loc => (
                      <div key={loc.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-300">📍</span>
                        <span>{loc.name}</span>
                        {loc.city && <span className="text-gray-400 text-xs">— {loc.city}</span>}
                        {!loc.isActive && <span className="text-xs text-red-400">(inactive)</span>}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* Users tab */}
          {activeTab === 'users' && (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Users {users ? `(${users.length})` : ''}
                </p>
                <button onClick={() => onAddUser(d, users)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  + Add User
                </button>
              </div>

              {/* Module filter chips */}
              {users !== null && users.length > 0 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {[['all', 'All'], ['insurance', '🛡️ Insurance'], ['service', '🔧 Service']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setFilterModule(val)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filterModule === val
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              )}

              {usersLoading && (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!usersLoading && users !== null && users.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">No users yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Add the first user to get started.</p>
                </div>
              )}

              {!usersLoading && users !== null && users.length > 0 && (() => {
                const displayedUsers = filterModule === 'all'
                  ? users
                  : users.filter(u => {
                      const isFieldRole = ['telecaller', 'team_leader'].includes(u.role);
                      if (!isFieldRole) return false;
                      return u.moduleRights === filterModule || u.moduleRights === 'both';
                    });
                return (
                <>
                {displayedUsers.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-4">
                    No users with {filterModule === 'insurance' ? '🛡️ Insurance' : '🔧 Service'} module
                  </p>
                )}
                {displayedUsers.length > 0 && filterModule !== 'all' && (
                  <p className="text-xs text-gray-400 mb-2">
                    Showing {displayedUsers.length} of {users.length} users
                  </p>
                )}
                <div className="space-y-2">
                  {displayedUsers.map(user => (
                    <div key={user.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                        user.isActive ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100 opacity-70'
                      }`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                          {!user.isActive && (
                            <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <p className="text-xs text-gray-400 font-mono">{user.username || '—'}</p>
                          {user.location && <p className="text-xs text-gray-400">📍 {user.location.name}</p>}
                          {user.moduleRights && (
                            <p className="text-xs text-gray-400">{MODULE_LABELS[user.moduleRights] || user.moduleRights}</p>
                          )}
                          {user.uploadRights && <p className="text-xs text-blue-500">📤 Upload</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => onEditUser(d, user, users)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors text-xs"
                          title="Edit user">
                          ✏️
                        </button>
                        <button onClick={() => handleResetUserPassword(user)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-100 hover:text-amber-600 transition-colors text-xs"
                          title="Reset password">
                          🔑
                        </button>
                        <button
                          onClick={() => handleToggleUser(user)}
                          className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${
                            user.isActive
                              ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
                              : 'text-green-500 hover:bg-green-50 hover:text-green-700'
                          }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}>
                          {user.isActive ? '🚫' : '✅'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                </>
                );
              })()}
            </div>
          )}

          {/* Settings tab */}
          {activeTab === 'settings' && (
            <div className="px-5 py-4">
              <DealershipSettingsTab dealership={d} />
            </div>
          )}
        </div>
      )}

      {resetResult && (
        <CredentialsModal
          name={resetResult.name}
          username={resetResult.username}
          password={resetResult.newPassword}
          onClose={() => setResetResult(null)}
        />
      )}
    </div>
  );
};

// ─── Main Admin Panel ─────────────────────────────────────────────────────────

const AdminPanel = () => {
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [dealershipModal, setDealershipModal] = useState(null);
  const [locationModal, setLocationModal] = useState(null);
  const [userModal, setUserModal] = useState(null);   // { dealership, user, users }
  const [credentialsModal, setCredentialsModal] = useState(null); // { name, username, password }
  const [searchTerm, setSearchTerm] = useState('');
  const [usersRefreshKeys, setUsersRefreshKeys] = useState({});

  const loadData = async () => {
    try {
      const allRes = await dealershipService.getAll();
      const withLocations = await Promise.all(
        allRes.data.dealerships.map(d =>
          dealershipService.get(d.id).then(r => r.data.dealership).catch(() => d)
        )
      );
      setDealerships(withLocations);
    } catch {
      toast.error('Failed to load dealerships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDealershipSaved = () => {
    setDealershipModal(null);
    setLocationModal(null);
    loadData();
  };

  const handleAddUser = (dealership, users) => {
    setUserModal({ dealership, user: null, users: users || [] });
  };

  const handleEditUser = (dealership, user, users) => {
    setUserModal({ dealership, user, users: users || [] });
  };

  const handleUserSaved = (dealershipId, credentials) => {
    setUserModal(null);
    setUsersRefreshKeys(prev => ({ ...prev, [dealershipId]: (prev[dealershipId] || 0) + 1 }));
    if (credentials) {
      setCredentialsModal(credentials);
    } else {
      toast.success('User updated');
    }
  };

  const filtered = dealerships.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.workshopCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalActive = dealerships.filter(d => d.isActive).length;
  const totalUsers  = dealerships.reduce((s, d) => s + (d._count?.users || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">{totalActive} active dealerships · {totalUsers} total users</p>
          </div>
          <button onClick={() => setDealershipModal('new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            + New Dealership
          </button>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Dealerships', val: dealerships.length, color: 'bg-blue-50 text-blue-700' },
            { label: 'Active', val: totalActive, color: 'bg-green-50 text-green-700' },
            { label: 'Total Users', val: totalUsers, color: 'bg-purple-50 text-purple-700' },
          ].map(c => (
            <div key={c.label} className={`rounded-xl px-4 py-3 ${c.color}`}>
              <p className="text-2xl font-bold">{c.val}</p>
              <p className="text-xs font-medium mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search dealerships…"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm" />
        </div>

        {/* Dealership list */}
        <div className="space-y-3">
          {filtered.length === 0
            ? (
              <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
                <p className="text-3xl mb-2">🏢</p>
                <p className="text-gray-500 font-medium">No dealerships found</p>
              </div>
            )
            : filtered.map((d, idx) => (
              <DealershipCard
                key={d.id}
                d={d}
                number={idx + 1}
                onEdit={setDealershipModal}
                onAddLocation={setLocationModal}
                onAddUser={handleAddUser}
                onEditUser={handleEditUser}
                usersRefreshKey={usersRefreshKeys[d.id] || 0}
              />
            ))
          }
        </div>
      </div>

      {/* Modals */}
      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />
      )}

      {dealershipModal && (
        <DealershipModal
          existing={dealershipModal === 'new' ? null : dealershipModal}
          onClose={() => setDealershipModal(null)}
          onSaved={handleDealershipSaved}
        />
      )}

      {locationModal && (
        <AddLocationModal
          dealership={locationModal}
          onClose={() => setLocationModal(null)}
          onSaved={handleDealershipSaved}
        />
      )}

      {userModal && (
        <AddDealershipUserModal
          dealership={userModal.dealership}
          existingUser={userModal.user}
          dealershipUsers={userModal.users}
          onClose={() => setUserModal(null)}
          onSaved={(creds) => handleUserSaved(userModal.dealership.id, creds)}
        />
      )}

      {credentialsModal && (
        <CredentialsModal
          name={credentialsModal.name}
          username={credentialsModal.username}
          password={credentialsModal.password}
          onClose={() => setCredentialsModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
