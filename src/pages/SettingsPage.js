import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

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
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [dirty, setDirty] = useState(false);

  const canEdit = ['manager', 'super_admin'].includes(user?.role);

  useEffect(() => {
    settingsService.get()
      .then(r => {
        setSettings(r.data.settings);
        setForm(r.data.settings);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await settingsService.update({
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
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
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

          {!canEdit && (
            <p className="text-center text-xs text-gray-400 pb-2">
              Only managers can change settings. Contact your manager to make changes.
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
