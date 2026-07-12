import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService, userService } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

const MAKE_LABELS = {
  tata: 'Tata', maruti: 'Maruti Suzuki', hyundai: 'Hyundai', honda: 'Honda',
  toyota: 'Toyota', mahindra: 'Mahindra', kia: 'Kia', mg: 'MG',
  renault: 'Renault', nissan: 'Nissan', volkswagen: 'Volkswagen', skoda: 'Skoda',
  jeep: 'Jeep', ford: 'Ford', mercedes: 'Mercedes-Benz', bmw: 'BMW', audi: 'Audi',
  volvo: 'Volvo', isuzu: 'Isuzu', force: 'Force',
};

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
    {children}
  </div>
);

const NumberInput = ({ value, onChange, min = 1, max = 365, suffix = 'days' }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={value}
      onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
      min={min} max={max}
      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-500">{suffix}</span>
  </div>
);

const Toggle = ({ value, onChange, label, hint }) => (
  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h2 className="font-bold text-gray-900">{title}</h2>
    </div>
    <div className="px-6 py-5 space-y-5">{children}</div>
  </div>
);

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isSuperAdminWithoutDealer, setIsSuperAdminWithoutDealer] = useState(false);

  const isSuperManager = user?.role === 'super_manager';
  const isManager = user?.role === 'manager';
  const isTL = user?.role === 'team_leader';
  const canEdit = isSuperManager || (isManager && settings?.managerCanEditSettings !== false);
  const [locations, setLocations] = useState([]);
  const [myLocationId, setMyLocationId] = useState(user?.locationId || '');
  const [savingLocation, setSavingLocation] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isManager || isSuperManager || isTL) {
      userService.listLocations().then(r => setLocations(r.data.locations || [])).catch(() => {});
    }
  }, [isManager, isSuperManager, isTL]);

  useEffect(() => {
    if ((isManager || isSuperManager) && user?.dealershipId) {
      setLoadingTemplates(true);
      api.get(`/upload/mappings?dealershipId=${user.dealershipId}`)
        .then(r => {
          // Only show dealership-specific templates (not global ones)
          const dealershipTemplates = (r.data.mappings || []).filter(t => t.dealershipId !== null);
          setTemplates(dealershipTemplates);
        })
        .catch(() => {})
        .finally(() => setLoadingTemplates(false));
    }
  }, [isManager, isSuperManager, user?.dealershipId]);

  const handleDeleteTemplate = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/upload/mappings/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      await userService.setMyLocation(myLocationId || null);
      toast.success(myLocationId ? 'Location filter set — you now see only this location' : 'Location filter cleared — you see all locations');
    } catch (err) {
      toast.error('Failed to update location filter');
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    settingsService.get()
      .then(r => {
        setSettings(r.data.settings);
        setForm(r.data.settings);
      })
      .catch(err => {
        if (err.response?.data?.error === 'super_admin_no_dealership') {
          setIsSuperAdminWithoutDealer(true);
        } else {
          toast.error('Failed to load settings');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        maxFollowupGapDays: form.maxFollowupGapDays,
        followupStartDaysBefore: form.followupStartDaysBefore,
        autoCloseDays: form.autoCloseDays,
        autoCloseAlertDays: form.autoCloseAlertDays,
        callingMode: form.callingMode,
        exportRightsEnabled: form.exportRightsEnabled,
        mobileExportEnabled: form.mobileExportEnabled,
      };
      if (isSuperManager) {
        payload.managerCanCreateUsers = form.managerCanCreateUsers;
        payload.managerCanEditSettings = form.managerCanEditSettings;
      }
      const res = await settingsService.update(payload);
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

  const handleDiscard = () => {
    setForm(settings);
    setDirty(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSuperAdminWithoutDealer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onSearchClick={() => setShowSearch(true)} />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-5xl mb-4">⚙️</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Settings are per-dealership</h2>
          <p className="text-gray-500 text-sm mb-6">
            As Super Admin you manage all dealerships. Each dealership has its own settings configured by its manager.
          </p>
          <button onClick={() => navigate('/admin')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
            Go to Admin Panel
          </button>
        </div>
        {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">{form.name}</p>
          </div>
          {canEdit && dirty && (
            <div className="flex gap-2">
              <button onClick={handleDiscard}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                Discard
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Locked by admin notice */}
          {user?.role === 'manager' && settings?.managerCanEditSettings === false && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">🔒</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Settings managed by admin</p>
                <p className="text-xs text-amber-700 mt-0.5">Your admin has locked settings for this dealership. Contact them to make changes.</p>
              </div>
            </div>
          )}

          {/* Active Modules — admin-only, read-only for everyone here */}
          <Section title="Active Modules" icon="🔌">
            <p className="text-xs text-gray-400 -mt-1">Module access is configured by your admin.</p>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {Object.entries(form.modulesEnabled || {}).filter(([, v]) => v).length === 0
                ? <span className="text-xs text-gray-400 italic">No modules enabled</span>
                : Object.entries(form.modulesEnabled || {}).filter(([, v]) => v).map(([k]) => {
                    const icons = { insurance: '🛡️', service: '🔧', psf: '😊', tyre_policy: '🔵', presale: '🚗', vas: '✨' };
                    return (
                      <span key={k} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                        {icons[k] || '📦'} {k.replace('_', ' ')}
                      </span>
                    );
                  })
              }
            </div>
          </Section>

          {/* Allowed Makes — admin-only, read-only */}
          <Section title="Allowed Makes" icon="🚗">
            <p className="text-xs text-gray-400 -mt-1">Vehicle makes allowed for upload, configured by your admin.</p>
            <div className="flex gap-1.5 flex-wrap mt-1">
              {(() => {
                const makes = Array.isArray(form.allowedMakes) ? form.allowedMakes : [];
                const labels = { tata: 'Tata', maruti: 'Maruti Suzuki', hyundai: 'Hyundai', honda: 'Honda', toyota: 'Toyota', mahindra: 'Mahindra', kia: 'Kia', mg: 'MG', renault: 'Renault', nissan: 'Nissan', volkswagen: 'Volkswagen', skoda: 'Skoda', jeep: 'Jeep', ford: 'Ford', mercedes: 'Mercedes-Benz', bmw: 'BMW', audi: 'Audi', volvo: 'Volvo', isuzu: 'Isuzu', force: 'Force' };
                return makes.length === 0
                  ? <span className="text-xs text-amber-500 italic">No makes configured — contact admin</span>
                  : makes.map(m => (
                      <span key={m} className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
                        🚗 {labels[m] || m}
                      </span>
                    ));
              })()}
            </div>
          </Section>

          {/* Follow-up Rules */}
          <Section title="Follow-up Rules" icon="📅">
            <Field
              label="Follow-up Start"
              hint="How many days before expiry/due date to start calling a customer."
            >
              <NumberInput value={form.followupStartDaysBefore} onChange={v => set('followupStartDaysBefore', v)} max={180} />
            </Field>
            <Field
              label="Max Follow-up Gap"
              hint="Maximum days allowed between two follow-up calls on the same plan."
            >
              <NumberInput value={form.maxFollowupGapDays} onChange={v => set('maxFollowupGapDays', v)} />
            </Field>
          </Section>

          {/* Auto-Close Rules */}
          <Section title="Auto-Close Rules" icon="🔒">
            <Field
              label="Auto-Close After"
              hint="Plans are automatically closed if no conversion happens within this many days after the due date."
            >
              <NumberInput value={form.autoCloseDays} onChange={v => set('autoCloseDays', v)} max={365} />
            </Field>
            <Field
              label="Red Alert Before Auto-Close"
              hint="Plans appear in Red Alert this many days before they are auto-closed."
            >
              <NumberInput value={form.autoCloseAlertDays} onChange={v => set('autoCloseAlertDays', v)} />
            </Field>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <span className="font-semibold">Timeline:</span> Follow-up starts {form.followupStartDaysBefore} days before due →
              Red alert {form.autoCloseAlertDays} days before auto-close →
              Auto-close at {form.autoCloseDays} days after due date
            </div>
          </Section>

          {/* Calling Mode */}
          <Section title="Calling Mode" icon="📞">
            <Field
              label="Mode"
              hint="Central: all calls routed through a central team. Local: each location handles its own calls."
            >
              <div className="flex gap-2">
                {[['central', '🏢 Central'], ['local', '📍 Local']].map(([val, lbl]) => (
                  <button key={val} type="button"
                    onClick={() => canEdit && set('callingMode', val)}
                    disabled={!canEdit}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.callingMode === val
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          {/* Export Rights */}
          <Section title="Export & Access" icon="📤">
            <Toggle
              value={form.exportRightsEnabled}
              onChange={v => canEdit && set('exportRightsEnabled', v)}
              label="Allow Data Export"
              hint="Enable managers and team leaders to export plan data"
            />
            <Toggle
              value={form.mobileExportEnabled}
              onChange={v => canEdit && set('mobileExportEnabled', v)}
              label="Allow Mobile Number Export"
              hint="Include customer mobile numbers in exported files"
            />
          </Section>

          {/* Manager Permissions — super_manager only */}
          {isSuperManager && (
            <Section title="Manager Permissions" icon="🔑">
              <Toggle
                value={form.managerCanCreateUsers ?? false}
                onChange={v => set('managerCanCreateUsers', v)}
                label="Manager Can Create Users"
                hint="Allow managers to create telecallers, team leaders, and service advisers"
              />
              <Toggle
                value={form.managerCanEditSettings ?? true}
                onChange={v => set('managerCanEditSettings', v)}
                label="Manager Can Edit Settings"
                hint="Allow managers to change follow-up rules, calling mode, and export settings"
              />
            </Section>
          )}

          {/* My Location Filter — manager / super_manager / TL */}
          {(isManager || isSuperManager || isTL) && locations.length > 1 && (
            <Section title="My Location View" icon="📍">
              <Field
                label="Location Filter"
                hint="Restrict your dashboard view to a single location. Choose 'All Locations' to see everything."
              >
                <div className="flex gap-2">
                  <select
                    value={myLocationId}
                    onChange={e => setMyLocationId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Locations</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveLocation}
                    disabled={savingLocation}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {savingLocation ? 'Saving…' : 'Apply'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {myLocationId ? `Currently filtering: ${locations.find(l => l.id === myLocationId)?.name || '—'}` : 'Currently showing: All locations'}
                </p>
              </Field>
            </Section>
          )}

          {/* Upload Templates — manager/super_manager only */}
          {(isManager || isSuperManager) && (
            <Section title="Upload Templates" icon="🗂️">
              <p className="text-xs text-gray-400 -mt-1">
                Saved column mappings per portal and make. Delete ones that are outdated or incorrect.
              </p>
              {loadingTemplates ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No templates saved yet. Upload a file and save its column mapping to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{t.portalName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {MAKE_LABELS[t.make] || t.make}
                          <span className="mx-1.5 text-gray-300">·</span>
                          <span className="capitalize">{t.module}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        {deletingId === t.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {!canEdit && !isSuperManager && !isTL && (
            <p className="text-center text-xs text-gray-400 pb-2">
              Settings are managed by your admin.
            </p>
          )}
        </div>
      </div>

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />
      )}
    </div>
  );
};

export default SettingsPage;
