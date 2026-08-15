import React, { useState, useEffect, useCallback } from 'react';
import { serviceIntervalService } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric', 'petrol+cng', 'hybrid'];

// Translate any stored code or variant → canonical full name for display
function toFullName(v) {
  if (!v) return '';
  const lower = v.toLowerCase().replace(/\s+/g, ' ').trim();
  const MAP = {
    'delivery': 'Delivery', 'deli': 'Delivery',
    '1fi': '1st Free Service', '1fs': '1st Free Service', 'ifs': '1st Free Service',
    '1st free service': '1st Free Service', 'first free service': '1st Free Service',
    'ist free service': '1st Free Service', 'i free service': '1st Free Service',
    '1 free service': '1st Free Service', '1 free inspection': '1st Free Service',
    '1st free inspection': '1st Free Service', 'first free inspection': '1st Free Service',
    'ist free inspection': '1st Free Service',
    '2fs': '2nd Free Service', 'iifs': '2nd Free Service',
    '2nd free service': '2nd Free Service', 'second free service': '2nd Free Service',
    '2 free service': '2nd Free Service', 'iind free service': '2nd Free Service',
    '3fs': '3rd Free Service', '3rd free service': '3rd Free Service', 'third free service': '3rd Free Service',
    '3 free service': '3rd Free Service', 'iiird free service': '3rd Free Service',
    '4fs': '4th Free Service', '4th free service': '4th Free Service', 'fourth free service': '4th Free Service',
    '4 free service': '4th Free Service',
    '5fs': '5th Free Service', '5th free service': '5th Free Service', 'fifth free service': '5th Free Service',
    '5 free service': '5th Free Service',
    'pms': 'Paid Service', 'paid service': 'Paid Service', 'paid maintenance service': 'Paid Service',
    'maintenance service': 'Paid Service', 'maintenace service': 'Paid Service',
    'maintainace service': 'Paid Service', 'periodic maintenance': 'Paid Service',
    'periodic maintenance service': 'Paid Service', 'paid maint': 'Paid Service',
  };
  return MAP[lower] || v;
}

const SERVICE_CODES = [
  'Delivery',
  '1st Free Service',
  '2nd Free Service',
  '3rd Free Service',
  '4th Free Service',
  '5th Free Service',
  'Paid Service',
];

// What uploaded file values are recognised as each canonical name
const SERVICE_ALIASES = {
  'Delivery':         ['delivery', 'deli'],
  '1st Free Service': ['1fi', '1fs', 'ifs', '1st free service', 'first free service', 'ist free service', '1st free inspection', 'first free inspection'],
  '2nd Free Service': ['2fs', 'iifs', '2nd free service', 'second free service', 'iind free service'],
  '3rd Free Service': ['3fs', '3rd free service', 'third free service', 'iiird free service'],
  '4th Free Service': ['4fs', '4th free service', 'fourth free service'],
  '5th Free Service': ['5fs', '5th free service', 'fifth free service'],
  'Paid Service':     ['pms', 'paid service', 'maintenance service', 'paid maintenance service', 'periodic maintenance service', 'periodic maintenance', 'maintainace service', 'maintenace service'],
};

const MAKES_LIST = [
  'tata', 'maruti', 'hyundai', 'honda', 'toyota', 'mahindra', 'kia',
  'mg', 'renault', 'nissan', 'volkswagen', 'skoda', 'jeep', 'ford',
  'mercedes', 'bmw', 'audi', 'volvo', 'isuzu', 'force',
];

const MAKE_LABELS = {
  tata: 'Tata', maruti: 'Maruti Suzuki', hyundai: 'Hyundai', honda: 'Honda',
  toyota: 'Toyota', mahindra: 'Mahindra', kia: 'Kia', mg: 'MG',
  renault: 'Renault', nissan: 'Nissan', volkswagen: 'Volkswagen', skoda: 'Skoda',
  jeep: 'Jeep', ford: 'Ford', mercedes: 'Mercedes-Benz', bmw: 'BMW', audi: 'Audi',
  volvo: 'Volvo', isuzu: 'Isuzu', force: 'Force',
};

const emptyForm = () => ({
  make: '',
  fuelType: '',
  model: '',
  subModel: '',
  category: '',
  currentService: '',
  nextService: '',
  nextServicePeriodDays: '',
  nextMileageKm: '',
  daysAddTo: 'last_service_date',
  dealershipOverrideAllowed: true,
  visibleToDealership: true,
  dealershipId: '',   // blank = global
});

// ─── Form Modal ───────────────────────────────────────────────────────────────

const IntervalFormModal = ({ existing, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState(isEdit ? {
    make: existing.make || '',
    fuelType: existing.fuelType || '',
    model: existing.model || '',
    subModel: existing.subModel || '',
    category: existing.category || '',
    currentService: toFullName(existing.currentService || ''),
    nextService: toFullName(existing.nextService || ''),
    nextServicePeriodDays: existing.nextServicePeriodDays || '',
    nextMileageKm: existing.nextMileageKm || '',
    daysAddTo: existing.daysAddTo || 'last_service_date',
    dealershipOverrideAllowed: existing.dealershipOverrideAllowed ?? true,
    visibleToDealership: existing.visibleToDealership ?? true,
    dealershipId: existing.dealershipId || '',
  } : emptyForm());
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.make || !form.currentService || !form.nextService || !form.nextServicePeriodDays || !form.daysAddTo) {
      toast.error('Please fill: Make, Current Service, Next Service, Period and Calculate From');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        dealershipId: form.dealershipId || null,
        nextServicePeriodDays: parseInt(form.nextServicePeriodDays, 10),
        nextMileageKm: form.nextMileageKm ? parseInt(form.nextMileageKm, 10) : null,
      };
      if (isEdit) {
        await serviceIntervalService.update(existing.id, payload);
        toast.success('Interval updated');
      } else {
        await serviceIntervalService.create(payload);
        toast.success('Interval created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Interval' : 'Add Service Interval'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Scope */}
          <div className="bg-blue-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-700 mb-1">Scope</p>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!form.dealershipId} onChange={() => set('dealershipId', '')} />
                <span className="font-medium">🌐 Global Default</span>
                <span className="text-xs text-gray-500">(applies to all dealerships)</span>
              </label>
            </div>
            {!isEdit && (
              <p className="text-xs text-blue-600 mt-1">Dealership-specific overrides can be added separately.</p>
            )}
          </div>

          {/* Make + Fuel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Make *</label>
              <select value={form.make} onChange={e => set('make', e.target.value)} className={inputCls}>
                <option value="">Select make...</option>
                {MAKES_LIST.map(m => <option key={m} value={m}>{MAKE_LABELS[m] || m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fuel Type <span className="text-gray-400 font-normal">(blank = all fuels)</span></label>
              <select value={form.fuelType} onChange={e => set('fuelType', e.target.value)} className={inputCls}>
                <option value="">All Fuel Types</option>
                {FUEL_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Model + SubModel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Model <span className="text-gray-400 font-normal">(blank = all models)</span></label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Nexon" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Sub Model <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={form.subModel} onChange={e => set('subModel', e.target.value)} placeholder="e.g. XZ+" className={inputCls} />
            </div>
          </div>

          {/* Current → Next service */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Current Service * <span className="text-gray-400 font-normal">(what was done)</span></label>
              <select
                value={form.currentService}
                onChange={e => set('currentService', e.target.value)}
                className={inputCls}
              >
                <option value="">— Select —</option>
                {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                {form.currentService && !SERVICE_CODES.includes(form.currentService) && (
                  <option value={form.currentService}>{form.currentService} (legacy)</option>
                )}
              </select>
            </div>
            <div>
              <label className={labelCls}>Next Service * <span className="text-gray-400 font-normal">(what comes next)</span></label>
              <select
                value={form.nextService}
                onChange={e => set('nextService', e.target.value)}
                className={inputCls}
              >
                <option value="">— Select —</option>
                {SERVICE_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                {form.nextService && !SERVICE_CODES.includes(form.nextService) && (
                  <option value={form.nextService}>{form.nextService} (legacy)</option>
                )}
              </select>
            </div>
          </div>

          {/* Period + Mileage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Period (days) *</label>
              <input type="number" min="1" value={form.nextServicePeriodDays}
                onChange={e => set('nextServicePeriodDays', e.target.value)}
                placeholder="e.g. 180" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mileage Trigger (km) <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="number" min="1" value={form.nextMileageKm}
                onChange={e => set('nextMileageKm', e.target.value)}
                placeholder="e.g. 10000" className={inputCls} />
            </div>
          </div>

          {/* Days Add To */}
          <div>
            <label className={labelCls}>Calculate Next Due From *</label>
            <div className="flex gap-3">
              {[
                ['purchase_date', '📅 Purchase Date', '(1st free service only)'],
                ['last_service_date', '🔧 Last Service Date', '(all subsequent services)'],
              ].map(([val, lbl, hint]) => (
                <button key={val} type="button" onClick={() => set('daysAddTo', val)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                    form.daysAddTo === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  <p>{lbl}</p>
                  <p className="text-xs opacity-60 mt-0.5">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['dealershipOverrideAllowed', 'Allow Dealership Override', 'ON: dealership can set their own service period for this make (overrides this global rule). OFF: this global rule is enforced for all.'],
              ['visibleToDealership', 'Visible to Dealership', 'ON: dealership admin can see and use this interval. OFF: hidden — only super admin can see it (used for internal rules).'],
            ].map(([key, label, hint]) => (
              <div key={key} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${form[key] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                </div>
                <button type="button" onClick={() => set(key, !form[key])}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form[key] ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Interval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ServiceIntervalMaster = () => {
  const [intervals, setIntervals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMake, setFilterMake] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [modal, setModal] = useState({ open: false, editing: null });
  const [, setShowSearch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { globalOnly: 'true' };
      if (filterMake) params.make = filterMake;
      if (filterFuel) params.fuelType = filterFuel;
      const res = await serviceIntervalService.list(params);
      setIntervals(res.data.intervals || []);
    } catch {
      toast.error('Failed to load intervals');
    } finally {
      setLoading(false);
    }
  }, [filterMake, filterFuel]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this interval rule?')) return;
    try {
      await serviceIntervalService.remove(id);
      toast.success('Interval removed');
      load();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const openAdd  = () => setModal({ open: true, editing: null });
  const openEdit = (iv) => setModal({ open: true, editing: iv });
  const closeModal = () => setModal({ open: false, editing: null });
  const onSaved = () => { closeModal(); load(); };

  // Group by make + fuel for display
  const grouped = {};
  intervals.forEach(iv => {
    const key = `${iv.make}__${iv.fuelType}`;
    if (!grouped[key]) grouped[key] = { make: iv.make, fuelType: iv.fuelType, chains: [] };
    grouped[key].chains.push(iv);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Interval Master</h1>
            <p className="text-sm text-gray-500 mt-1">
              Define the service chain for each make + fuel type. These are global defaults — dealerships can have overrides if allowed.
            </p>
          </div>
          <button onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            + Add Interval
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
          <div>
            <label className="text-xs font-semibold text-gray-500 mr-2">Make</label>
            <select value={filterMake} onChange={e => setFilterMake(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Makes</option>
              {MAKES_LIST.map(m => <option key={m} value={m}>{MAKE_LABELS[m] || m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mr-2">Fuel</label>
            <select value={filterFuel} onChange={e => setFilterFuel(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Fuels</option>
              {FUEL_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          {(filterMake || filterFuel) && (
            <button onClick={() => { setFilterMake(''); setFilterFuel(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">Clear filters</button>
          )}
          <span className="ml-auto text-xs text-gray-400">{intervals.length} rule{intervals.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Service type alias legend */}
        <details className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <summary className="px-5 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none flex items-center gap-2">
            <span className="text-blue-600">ℹ️</span> How service type names from uploaded files are recognised
          </summary>
          <div className="px-5 pb-4 pt-2">
            <p className="text-xs text-gray-500 mb-3">
              When a file uses a long name instead of the code, we auto-map it to the matching interval code.
              Names are matched case-insensitively.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              {Object.entries(SERVICE_ALIASES).map(([code, aliases]) => (
                <div key={code} className="flex gap-2 text-xs py-1 border-b border-gray-50">
                  <span className="font-mono font-bold text-blue-700 w-14 flex-shrink-0">{code}</span>
                  <span className="text-gray-500">{aliases.join(', ')}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              If no exact match is found, the system falls back to any active interval for that make (highest period wins).
            </p>
          </div>
        </details>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : intervals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔧</p>
            <p className="text-gray-600 font-semibold">No intervals yet</p>
            <p className="text-sm text-gray-400 mt-1">Add service chain rules for each make and fuel type.</p>
            <button onClick={openAdd} className="mt-4 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              + Add First Interval
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(grouped).map(({ make, fuelType, chains }) => (
              <div key={`${make}__${fuelType}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Group header */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800">
                    🚗 {MAKE_LABELS[make] || make}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
                    {fuelType || 'All Fuels'}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">{chains.length} step{chains.length !== 1 ? 's' : ''} in chain</span>
                </div>

                {/* Chain table */}
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Service</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Service</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fuel Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Model</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mileage</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Days From</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {chains.sort((a, b) => a.currentService.localeCompare(b.currentService)).map(iv => (
                      <tr key={iv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {toFullName(iv.currentService)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                            {toFullName(iv.nextService)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 capitalize">
                            {iv.fuelType || <span className="italic text-gray-400 font-normal">All fuels</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{iv.model || <span className="italic text-gray-300">All models</span>}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{iv.nextServicePeriodDays} days</td>
                        <td className="px-4 py-3 text-gray-500">{iv.nextMileageKm ? `${iv.nextMileageKm.toLocaleString()} km` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            iv.daysAddTo === 'purchase_date'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {iv.daysAddTo === 'purchase_date' ? '📅 Purchase' : '🔧 Last Service'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {iv.dealershipOverrideAllowed && (
                              <span title="Dealership can set their own period for this make" className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">Override allowed</span>
                            )}
                            {!iv.visibleToDealership && (
                              <span title="Dealership cannot see this interval — super admin only" className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">Hidden from dealership</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEdit(iv)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                            <button onClick={() => handleDelete(iv.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <IntervalFormModal
          existing={modal.editing}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  );
};

export default ServiceIntervalMaster;
