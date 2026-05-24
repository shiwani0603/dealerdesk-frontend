import React, { useState, useEffect } from 'react';
import { dealershipService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

// ─── Dealership Form Modal ────────────────────────────────────────────────────
const DealershipModal = ({ existing, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name || '',
    workshopCode: existing?.workshopCode || '',
    modulesEnabled: existing?.modulesEnabled || {
      insurance: false, service: false, psf: false,
      tyre_policy: false, presale: false, vas: false,
    },
    isActive: existing?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleModule = (mod) => setForm(f => ({
    ...f,
    modulesEnabled: { ...f.modulesEnabled, [mod]: !f.modulesEnabled[mod] },
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
          workshopCode: form.workshopCode || null,
          modulesEnabled: form.modulesEnabled,
          isActive: form.isActive,
        });
      } else {
        res = await dealershipService.create({ name: form.name, workshopCode: form.workshopCode || null });
        // Set modules in a follow-up update
        await dealershipService.update(res.data.dealership.id, { modulesEnabled: form.modulesEnabled });
      }
      toast.success(isEdit ? 'Dealership updated' : 'Dealership created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const MODULE_LABELS = {
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Workshop Code</label>
            <input value={form.workshopCode} onChange={e => set('workshopCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. WS001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modules Enabled</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(MODULE_LABELS).map(mod => (
                <button key={mod} type="button" onClick={() => toggleModule(mod)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    form.modulesEnabled[mod] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    form.modulesEnabled[mod] ? 'border-white bg-white text-blue-600' : 'border-gray-400'
                  }`}>{form.modulesEnabled[mod] ? '✓' : ''}</span>
                  {MODULE_LABELS[mod]}
                </button>
              ))}
            </div>
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

// ─── Dealership Card ──────────────────────────────────────────────────────────
const DealershipCard = ({ d, onEdit, onAddLocation }) => {
  const [expanded, setExpanded] = useState(false);
  const modules = d.modulesEnabled || {};
  const activeModules = Object.entries(modules).filter(([, v]) => v).map(([k]) => k);
  const MODULE_ICONS = { insurance: '🛡️', service: '🔧', psf: '😊', tyre_policy: '🔵', presale: '🚗', vas: '✨' };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${d.isActive ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${d.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            {d.name.charAt(0).toUpperCase()}
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
          <button onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={() => onEdit(d)}
            className="p-2 rounded-lg text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors text-sm">
            ✏️
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Locations</p>
            <button onClick={() => onAddLocation(d)}
              className="text-xs text-blue-600 font-semibold hover:underline">
              + Add Location
            </button>
          </div>
          {d.locations?.length === 0
            ? <p className="text-xs text-gray-400 italic">No locations yet</p>
            : <div className="space-y-1">
                {d.locations?.map(loc => (
                  <div key={loc.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-300">📍</span>
                    <span>{loc.name}</span>
                    {loc.city && <span className="text-gray-400 text-xs">— {loc.city}</span>}
                    {!loc.isActive && <span className="text-xs text-red-400">(inactive)</span>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
const AdminPanel = () => {
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [dealershipModal, setDealershipModal] = useState(null); // null | 'new' | dealership obj
  const [locationModal, setLocationModal] = useState(null); // null | dealership obj
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      const [allRes] = await Promise.all([dealershipService.getAll()]);
      // Fetch each dealership's full data (locations)
      const withLocations = await Promise.all(
        allRes.data.dealerships.map(d => dealershipService.get(d.id).then(r => r.data.dealership).catch(() => d))
      );
      setDealerships(withLocations);
    } catch {
      toast.error('Failed to load dealerships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaved = () => {
    setDealershipModal(null);
    setLocationModal(null);
    loadData();
  };

  const filtered = dealerships.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.workshopCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalActive = dealerships.filter(d => d.isActive).length;
  const totalUsers = dealerships.reduce((s, d) => s + (d._count?.users || 0), 0);

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
            ? <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-gray-100">
                <p className="text-3xl mb-2">🏢</p>
                <p className="text-gray-500 font-medium">No dealerships found</p>
              </div>
            : filtered.map(d => (
                <DealershipCard
                  key={d.id}
                  d={d}
                  onEdit={setDealershipModal}
                  onAddLocation={setLocationModal}
                />
              ))
          }
        </div>
      </div>

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />
      )}

      {dealershipModal && (
        <DealershipModal
          existing={dealershipModal === 'new' ? null : dealershipModal}
          onClose={() => setDealershipModal(null)}
          onSaved={handleSaved}
        />
      )}

      {locationModal && (
        <AddLocationModal
          dealership={locationModal}
          onClose={() => setLocationModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default AdminPanel;
