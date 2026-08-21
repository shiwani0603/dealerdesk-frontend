import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchService, userService, insuranceService, serviceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

const fd = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

const OUTCOMES = [
  { value: 'appointment_fixed', label: '📅 Appointment Fixed' },
  { value: 'appointment_discussion', label: '💬 Discussion' },
  { value: 'interested_follow_up', label: '👍 Interested' },
  { value: 'not_interested_follow_up', label: '👎 Not Interested' },
  { value: 'not_connected', label: '📵 Not Connected' },
  { value: 'payment_received_policy_pending', label: '💰 Pmt Pending' },
  { value: 'payment_received_policy_done', label: '✅ Pmt Done' },
  { value: 'lost_done_elsewhere', label: '❌ Lost' },
  { value: 'vehicle_reported', label: '✅ Reported' },
  { value: 'invalid_data', label: '⚠️ Invalid' },
];

const POLICY_CATEGORIES = ['Comprehensive', 'Third Party', 'Own Damage', 'Bundled'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const MAKE_LIST = [
  { value: 'tata', label: 'Tata' }, { value: 'maruti', label: 'Maruti Suzuki' },
  { value: 'hyundai', label: 'Hyundai' }, { value: 'honda', label: 'Honda' },
  { value: 'toyota', label: 'Toyota' }, { value: 'mahindra', label: 'Mahindra' },
  { value: 'kia', label: 'Kia' }, { value: 'mg', label: 'MG' },
  { value: 'renault', label: 'Renault' }, { value: 'nissan', label: 'Nissan' },
  { value: 'volkswagen', label: 'Volkswagen' }, { value: 'skoda', label: 'Skoda' },
  { value: 'jeep', label: 'Jeep' }, { value: 'ford', label: 'Ford' },
  { value: 'mercedes', label: 'Mercedes-Benz' }, { value: 'bmw', label: 'BMW' },
  { value: 'audi', label: 'Audi' }, { value: 'volvo', label: 'Volvo' },
  { value: 'isuzu', label: 'Isuzu' }, { value: 'force', label: 'Force' },
];
const MAKE_LABELS = Object.fromEntries(MAKE_LIST.map(m => [m.value, m.label]));

// ── Collapsible Section ───────────────────────────────────────────────────────
const FilterSection = ({ title, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span>{icon}</span>{title}
        </span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 py-4 bg-white">{children}</div>}
    </div>
  );
};

// ── Field components ──────────────────────────────────────────────────────────
const FRow = ({ children }) => <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>;
const FField = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    {children}
  </div>
);
const sel = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400";
const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-400";

// ── Result badge ──────────────────────────────────────────────────────────────
const outcomeColors = {
  appointment_fixed: 'bg-blue-100 text-blue-700',
  appointment_discussion: 'bg-blue-50 text-blue-600',
  interested_follow_up: 'bg-green-100 text-green-700',
  not_interested_follow_up: 'bg-orange-100 text-orange-700',
  not_connected: 'bg-gray-100 text-gray-500',
  payment_received_policy_pending: 'bg-yellow-100 text-yellow-700',
  payment_received_policy_done: 'bg-emerald-100 text-emerald-700',
  lost_done_elsewhere: 'bg-red-100 text-red-600',
  vehicle_reported: 'bg-emerald-100 text-emerald-700',
  invalid_data: 'bg-red-50 text-red-400',
};
const outcomeShort = {
  appointment_fixed: 'Appt Fixed',
  appointment_discussion: 'Discussion',
  interested_follow_up: 'Interested',
  not_interested_follow_up: 'Not Interested',
  not_connected: 'No Answer',
  payment_received_policy_pending: 'Pmt Pending',
  payment_received_policy_done: 'Pmt Done',
  lost_done_elsewhere: 'Lost',
  vehicle_reported: 'Reported',
  invalid_data: 'Invalid',
};

// ── Bulk Assign Modal ─────────────────────────────────────────────────────────
const BulkAssignModal = ({ count, module, users, onConfirm, onClose, progressing, progress }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const assignable = users.filter(u => (u.role === 'telecaller' || u.role === 'team_leader') && u.isActive);

  const toggleUser = (id) =>
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const n = selectedUsers.length;
  const perMin = n ? Math.floor(count / n) : 0;
  const perMax = n ? Math.ceil(count / n) : 0;
  const distLabel = n === 0 ? '' : n === 1 ? `all ${count} plans` : perMin === perMax ? `${perMin} each` : `${perMin}–${perMax} each`;

  if (progressing) {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-7 text-center">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900 mb-1">Assigning Plans…</p>
          <p className="text-sm text-gray-500 mb-5">{progress.current} of {progress.total} completed</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-200" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400">{pct}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Assign {count} Plan{count !== 1 ? 's' : ''}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <p className="text-sm text-gray-500 mb-1">Select one or more CREs — plans will be distributed evenly.</p>
        {n > 0 && (
          <p className="text-xs font-semibold text-blue-600 mb-3">
            {count} plan{count !== 1 ? 's' : ''} → {n} CRE{n !== 1 ? 's' : ''} ({distLabel})
          </p>
        )}
        <div className={`space-y-1.5 mb-4 max-h-64 overflow-y-auto ${n === 0 ? 'mt-3' : ''}`}>
          {assignable.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">No active CREs found</p>
            : assignable.map(u => {
              const checked = selectedUsers.includes(u.id);
              return (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                    checked ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  <span className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center text-xs font-bold ${
                    checked ? 'border-white bg-white text-blue-600' : 'border-gray-400'
                  }`}>{checked ? '✓' : ''}</span>
                  <span className="flex-1">👤 {u.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${checked ? 'bg-blue-500 text-blue-100' : 'bg-gray-200 text-gray-500'}`}>
                    {u.role === 'team_leader' ? 'TL' : 'CRE'}
                  </span>
                </button>
              );
            })
          }
        </div>
        <button onClick={() => n > 0 && onConfirm(selectedUsers)} disabled={n === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {n === 0 ? 'Select CREs to continue' : `Assign to ${n} CRE${n !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const AdvancedSearch = () => {
  const { user } = useAuth();
  const isSA = user?.role === 'super_admin';
  const modEnabled = user?.modulesEnabled || {};
  const mr = user?.moduleRights;
  const showInsurance = isSA || (modEnabled.insurance && (!mr || mr === 'insurance' || mr === 'both'));
  const showService   = isSA || (modEnabled.service   && (!mr || mr === 'service'   || mr === 'both'));

  const [activeModule, setActiveModule] = useState(
    (!showInsurance || mr === 'service') ? 'service' : 'insurance'
  );
  const [filters, setFilters] = useState({});
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [assignModal, setAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignProgress, setAssignProgress] = useState({ current: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState({ models: [], insurers: [] });
  const resultsRef = useRef(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    userService.list().then(r => setUsers(r.data?.users || [])).catch(() => {});
    userService.listLocations().then(r => setLocations(r.data?.locations || [])).catch(() => {});
  }, []);

  const loadOptions = useCallback((make) => {
    searchService.getOptions(make || '').then(r => setFilterOptions(r.data || { models: [], insurers: [] })).catch(() => {});
  }, []);

  const set = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));
  const f = filters;

  useEffect(() => { loadOptions(f.make); }, [f.make, loadOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const telecallers = users.filter(u => u.role === 'telecaller');

  const hasModule = (loc, mod) => !Array.isArray(loc.modules) || loc.modules.length === 0 || loc.modules.includes(mod);
  // eslint-disable-next-line no-unused-vars
  const salesOutlets     = locations.filter(l => hasModule(l, 'sales'));
  const insuranceOutlets = locations.filter(l => hasModule(l, 'insurance'));
  const serviceOutlets   = locations.filter(l => hasModule(l, 'service'));

  const handleSearch = async (pageOverride = 1) => {
    const currentPage = pageOverride;
    setPage(currentPage);
    setLoading(true);
    setCheckedIds(new Set());
    try {
      const res = await searchService.searchPlans({ ...filters, module: activeModule, page: currentPage, pageSize: PAGE_SIZE });
      setResults(res.data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({});
    setResults(null);
    setCheckedIds(new Set());
    setPage(1);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const insPlans = results?.plans || [];

  const toggleAll = () => {
    if (checkedIds.size === insPlans.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(insPlans.map(p => p.id)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(checkedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setCheckedIds(next);
  };

  const handleAssign = async (userIds) => {
    const ids = [...checkedIds];
    setAssigning(true);
    setAssignProgress({ current: 0, total: ids.length });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      const planId = ids[i];
      const userId = userIds[i % userIds.length]; // round-robin distribution
      try {
        await (activeModule === 'insurance'
          ? insuranceService.transferPlan(planId, userId)
          : serviceService.transferPlan(planId, userId));
      } catch {
        failed++;
      }
      setAssignProgress({ current: i + 1, total: ids.length });
    }
    setAssigning(false);
    setAssignProgress({ current: 0, total: 0 });
    setAssignModal(false);
    setCheckedIds(new Set());
    if (failed > 0) {
      toast.error(`${failed} assignment${failed !== 1 ? 's' : ''} failed — rest succeeded`);
    } else {
      toast.success(`${ids.length} plan${ids.length !== 1 ? 's' : ''} assigned successfully`);
    }
    try {
      const res = await searchService.searchPlans({ ...filters, module: activeModule, page, pageSize: PAGE_SIZE });
      setResults(res.data);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Plan Search</h1>
          <p className="text-sm text-gray-500">Search and filter plans by multiple criteria — select results to assign</p>
        </div>

        {/* Module tabs */}
        {(showInsurance || showService) && (
          <div className="flex bg-white rounded-xl shadow-sm p-1 mb-5 w-fit gap-1">
            {showInsurance && (
              <button onClick={() => { setActiveModule('insurance'); setResults(null); }}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeModule === 'insurance' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                🛡️ Insurance Plans
              </button>
            )}
            {showService && (
              <button onClick={() => { setActiveModule('service'); setResults(null); }}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeModule === 'service' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                🔧 Service Plans
              </button>
            )}
          </div>
        )}

        {/* Filter panel */}
        <div className="space-y-3 mb-5" onKeyDown={handleKeyDown}>

          {/* Basic — always open */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Basic Filters</p>
            <FRow>
              <FField label="Plan Status">
                <select value={f.planStatus || 'open'} onChange={e => set('planStatus', e.target.value)} className={sel}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="all">All</option>
                </select>
              </FField>
              <FField label="Assigned To">
                <select value={f.assignedToUserId || ''} onChange={e => set('assignedToUserId', e.target.value)} className={sel}>
                  <option value="">All Telecallers</option>
                  <option value="UNASSIGNED">— Unassigned —</option>
                  {telecallers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FField>
              <FField label="Category">
                <select value={f.renewalCategory || ''} onChange={e => set('renewalCategory', e.target.value)} className={sel}>
                  <option value="">All Categories</option>
                  <option value="OWN_RENEWAL">✅ Own Service</option>
                  <option value="COMPETITOR">🔄 Competitor</option>
                  <option value="LAPSED">⚠️ Lapsed</option>
                </select>
              </FField>
              <FField label="Follow-up Date From">
                <input type="date" value={f.followupFrom || ''} onChange={e => set('followupFrom', e.target.value)} className={inp} />
              </FField>
              <FField label="Follow-up Date To">
                <input type="date" value={f.followupTo || ''} onChange={e => set('followupTo', e.target.value)} className={inp} />
              </FField>
            </FRow>
          </div>

          {/* Insurance-specific details */}
          {activeModule === 'insurance' && (
            <FilterSection title="Policy Details" icon="📄">
              <FRow>
                <FField label="Policy Category">
                  <select value={f.policyCategory || ''} onChange={e => set('policyCategory', e.target.value)} className={sel}>
                    <option value="">All Categories</option>
                    {POLICY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FField>
                <FField label="Insurer Name">
                  {filterOptions.insurers.length > 0
                    ? <select value={f.insurerName || ''} onChange={e => set('insurerName', e.target.value)} className={sel}>
                        <option value="">All Insurers</option>
                        {filterOptions.insurers.map(ins => <option key={ins} value={ins}>{ins}</option>)}
                      </select>
                    : <input type="text" value={f.insurerName || ''} onChange={e => set('insurerName', e.target.value)}
                        placeholder="e.g. HDFC, Bajaj..." className={inp} />
                  }
                </FField>
                <FField label="Renewal Type">
                  <select value={f.renewalType || ''} onChange={e => set('renewalType', e.target.value)} className={sel}>
                    <option value="">All Types</option>
                    <option value="Retention">Retention</option>
                    <option value="Rollover">Rollover</option>
                  </select>
                </FField>
                {insuranceOutlets.length > 0 && (
                  <FField label="Insurance Outlet">
                    <select value={f.locationId || ''} onChange={e => set('locationId', e.target.value)} className={sel}>
                      <option value="">All Outlets</option>
                      {insuranceOutlets.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                    </select>
                  </FField>
                )}
                <FField label="Policy Expiry From">
                  <input type="date" value={f.expiryFrom || ''} onChange={e => set('expiryFrom', e.target.value)} className={inp} />
                </FField>
                <FField label="Policy Expiry To">
                  <input type="date" value={f.expiryTo || ''} onChange={e => set('expiryTo', e.target.value)} className={inp} />
                </FField>
              </FRow>
            </FilterSection>
          )}

          {/* Service-specific details */}
          {activeModule === 'service' && (
            <FilterSection title="Service Details" icon="🔧">
              <FRow>
                <FField label="Service Type">
                  <select value={f.serviceType || ''} onChange={e => set('serviceType', e.target.value)} className={sel}>
                    <option value="">All Service Types</option>
                    <option value="Delivery">Delivery</option>
                    <option value="1st Free Service">1st Free Service</option>
                    <option value="2nd Free Service">2nd Free Service</option>
                    <option value="3rd Free Service">3rd Free Service</option>
                    <option value="4th Free Service">4th Free Service</option>
                    <option value="5th Free Service">5th Free Service</option>
                    <option value="Paid Service">Paid Service</option>
                  </select>
                </FField>
                {serviceOutlets.length > 0 && (
                  <FField label="Service Outlet">
                    <select value={f.locationId || ''} onChange={e => set('locationId', e.target.value)} className={sel}>
                      <option value="">All Outlets</option>
                      {serviceOutlets.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                    </select>
                  </FField>
                )}
                <FField label="Due Date From">
                  <input type="date" value={f.dueDateFrom || ''} onChange={e => set('dueDateFrom', e.target.value)} className={inp} />
                </FField>
                <FField label="Due Date To">
                  <input type="date" value={f.dueDateTo || ''} onChange={e => set('dueDateTo', e.target.value)} className={inp} />
                </FField>
              </FRow>
            </FilterSection>
          )}

          {/* Vehicle */}
          <FilterSection title="Vehicle" icon="🚗">
            <FRow>
              {locations.length > 0 && (
                <FField label="Sold by Outlet">
                  <select value={f.soldByLocationId || ''} onChange={e => set('soldByLocationId', e.target.value)} className={sel}>
                    <option value="">All Outlets</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                  </select>
                </FField>
              )}
              <FField label="Make">
                {(user?.allowedMakes?.length > 0)
                  ? <select value={f.make || ''} onChange={e => set('make', e.target.value)} className={sel}>
                      <option value="">All Makes</option>
                      {user.allowedMakes.map(m => <option key={m} value={m}>{MAKE_LABELS[m] || m}</option>)}
                    </select>
                  : <select value={f.make || ''} onChange={e => set('make', e.target.value)} className={sel}>
                      <option value="">All Makes</option>
                      {MAKE_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                }
              </FField>
              <FField label="Model">
                {filterOptions.models.length > 0
                  ? <select value={f.model || ''} onChange={e => set('model', e.target.value)} className={sel}>
                      <option value="">All Models</option>
                      {filterOptions.models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  : <input type="text" value={f.model || ''} onChange={e => set('model', e.target.value)}
                      placeholder="e.g. Swift, City..." className={inp} />
                }
              </FField>
              <FField label="Chassis No.">
                <input type="text" value={f.chassisNumber || ''} onChange={e => set('chassisNumber', e.target.value)}
                  placeholder="e.g. MA3EWDE1..." className={inp} />
              </FField>
              <FField label="Registration No.">
                <input type="text" value={f.registrationNumber || ''} onChange={e => set('registrationNumber', e.target.value)}
                  placeholder="e.g. MH12AB1234" className={inp} />
              </FField>
              <FField label="Fuel Type">
                <select value={f.fuelType || ''} onChange={e => set('fuelType', e.target.value)} className={sel}>
                  <option value="">All Fuels</option>
                  {FUEL_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                </select>
              </FField>
              <FField label="Mfg. Year From">
                <input type="number" value={f.mfgYearFrom || ''} onChange={e => set('mfgYearFrom', e.target.value)}
                  placeholder="e.g. 2018" min="2000" max="2030" className={inp} />
              </FField>
              <FField label="Mfg. Year To">
                <input type="number" value={f.mfgYearTo || ''} onChange={e => set('mfgYearTo', e.target.value)}
                  placeholder="e.g. 2024" min="2000" max="2030" className={inp} />
              </FField>
              <FField label="Purchase Date From">
                <input type="date" value={f.purchaseDateFrom || ''} onChange={e => set('purchaseDateFrom', e.target.value)} className={inp} />
              </FField>
              <FField label="Purchase Date To">
                <input type="date" value={f.purchaseDateTo || ''} onChange={e => set('purchaseDateTo', e.target.value)} className={inp} />
              </FField>
            </FRow>
          </FilterSection>

          {/* Customer */}
          <FilterSection title="Customer" icon="👤">
            <FRow>
              <FField label="Customer Name">
                <input type="text" value={f.customerName || ''} onChange={e => set('customerName', e.target.value)}
                  placeholder="Name contains..." className={inp} />
              </FField>
              <FField label="Mobile No.">
                <input type="text" value={f.mobile || ''} onChange={e => set('mobile', e.target.value)}
                  placeholder="e.g. 9876543210" className={inp} />
              </FField>
              <FField label="City">
                <input type="text" value={f.city || ''} onChange={e => set('city', e.target.value)}
                  placeholder="e.g. Mumbai" className={inp} />
              </FField>
              <FField label="State">
                <input type="text" value={f.state || ''} onChange={e => set('state', e.target.value)}
                  placeholder="e.g. Maharashtra" className={inp} />
              </FField>
              <FField label="Date of Birth">
                <input type="date" value={f.dob || ''} onChange={e => set('dob', e.target.value)} className={inp} />
              </FField>
              <FField label="Data Source">
                <select value={f.source || ''} onChange={e => set('source', e.target.value)} className={sel}>
                  <option value="">All Sources</option>
                  <option value="insurance">Insurance Upload</option>
                  <option value="service">Service Upload</option>
                  <option value="sales">Sales Upload</option>
                </select>
              </FField>
            </FRow>
          </FilterSection>

          {/* Last Call */}
          <FilterSection title="Last Call Activity" icon="📞">
            <FRow>
              <FField label="Last Call Outcome">
                <select value={f.lastCallOutcome || ''} onChange={e => set('lastCallOutcome', e.target.value)} className={sel}>
                  <option value="">Any Outcome</option>
                  {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FField>
              <FField label="Call Date From">
                <input type="date" value={f.callDateFrom || ''} onChange={e => set('callDateFrom', e.target.value)} className={inp} />
              </FField>
              <FField label="Call Date To">
                <input type="date" value={f.callDateTo || ''} onChange={e => set('callDateTo', e.target.value)} className={inp} />
              </FField>
            </FRow>
          </FilterSection>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button onClick={() => handleSearch()} disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60 shadow-sm">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Searching...</>
              : <>🔍 Search</>
            }
          </button>
          <button onClick={handleClear}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
            ✕ Clear
          </button>

          {checkedIds.size > 0 && (
            <button onClick={() => setAssignModal(true)} disabled={assigning}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60">
              👤 Assign {checkedIds.size} selected
            </button>
          )}

          {results && (
            <span className="text-sm text-gray-500 ml-1">
              Found <span className="font-bold text-gray-900">{results.total}</span> plan{results.total !== 1 ? 's' : ''}
              {checkedIds.size > 0 && <span className="ml-2 text-blue-600 font-medium">· {checkedIds.size} selected</span>}
            </span>
          )}
        </div>

        {/* Results */}
        {results && (
          <div ref={resultsRef}>
            {insPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-14 text-center shadow-sm border border-gray-100">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-600 font-medium">No plans matched your search</p>
                <p className="text-gray-400 text-sm mt-1">Try relaxing some filters</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-semibold text-gray-900">
                    {activeModule === 'insurance' ? '🛡️ Insurance' : '🔧 Service'} Plans
                    <span className="ml-2 text-sm font-normal text-gray-500">({results.total})</span>
                  </h2>
                  {checkedIds.size > 0 && (
                    <button onClick={() => setAssignModal(true)} disabled={assigning}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                      👤 Assign {checkedIds.size} selected
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox"
                            checked={insPlans.length > 0 && checkedIds.size === insPlans.length}
                            onChange={toggleAll}
                            className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                        {activeModule === 'insurance' ? (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Insurer</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Due</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-up</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Call</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {insPlans.map((plan, i) => {
                        const c = plan.customer || {};
                        const r = plan.latestRecord || {};
                        const lastLog = plan.followUpLogs?.[0];
                        const primaryMobile = c.contacts?.find(ct => ct.contactType === 'mobile' && ct.isPrimary)?.value
                          || c.contacts?.find(ct => ct.contactType === 'mobile')?.value;
                        const openDetail = () => setSelectedCustomer({ customerId: plan.customerId, planId: plan.id, planType: activeModule, plan });

                        return (
                          <tr key={plan.id}
                            className={`hover:bg-blue-50 transition-colors ${checkedIds.has(plan.id) ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={checkedIds.has(plan.id)} onChange={() => toggleOne(plan.id)}
                                className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3 cursor-pointer" onClick={openDetail}>
                              <p className="font-semibold text-gray-900 truncate max-w-[160px]">{c.name || '—'}</p>
                              <p className="text-xs text-gray-400">{c.registrationNumber || c.chassisNumber}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap cursor-pointer" onClick={openDetail}>
                              {c.make} {c.model}
                              {c.manufacturingYear && <span className="ml-1 text-gray-400">'{String(c.manufacturingYear).slice(2)}</span>}
                            </td>
                            <td className="px-4 py-3 cursor-pointer" onClick={openDetail}>
                              {primaryMobile
                                ? <a href={`tel:${primaryMobile}`} onClick={e => e.stopPropagation()}
                                    className="text-blue-600 text-xs font-medium hover:underline">{primaryMobile}</a>
                                : <span className="text-gray-300 text-xs">—</span>
                              }
                            </td>
                            {activeModule === 'insurance' ? (
                              <>
                                <td className={`px-4 py-3 text-xs font-medium whitespace-nowrap cursor-pointer ${r.policyExpiryDate && new Date(r.policyExpiryDate) < new Date() ? 'text-red-600' : 'text-orange-600'}`} onClick={openDetail}>
                                  {fd(r.policyExpiryDate)}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600 max-w-[100px] truncate cursor-pointer" onClick={openDetail}>{r.insurerName || '—'}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 cursor-pointer" onClick={openDetail}>
                                  {plan.currentServiceDue
                                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{plan.currentServiceDue}</span>
                                    : <span className="text-gray-300 text-xs">—</span>
                                  }
                                </td>
                                <td className={`px-4 py-3 text-xs font-medium cursor-pointer ${plan.calculatedNextDueDate && new Date(plan.calculatedNextDueDate) < new Date() ? 'text-red-600' : 'text-green-700'}`} onClick={openDetail}>
                                  {fd(plan.calculatedNextDueDate)}
                                </td>
                              </>
                            )}
                            <td className={`px-4 py-3 text-xs whitespace-nowrap font-medium cursor-pointer ${plan.nextFollowupDate && new Date(plan.nextFollowupDate) < new Date() ? 'text-red-500' : 'text-gray-600'}`} onClick={openDetail}>
                              {fd(plan.nextFollowupDate)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 cursor-pointer" onClick={openDetail}>
                              {plan.assignedTo?.name || <span className="text-gray-300">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 cursor-pointer" onClick={openDetail}>
                              {lastLog ? (
                                <div>
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${outcomeColors[lastLog.callOutcome] || 'bg-gray-100 text-gray-500'}`}>
                                    {outcomeShort[lastLog.callOutcome] || lastLog.callOutcome}
                                  </span>
                                  <p className="text-xs text-gray-400 mt-0.5">{fd(lastLog.loggedAt)}</p>
                                </div>
                              ) : <span className="text-gray-300 text-xs italic">No calls</span>}
                            </td>
                            <td className="px-4 py-3 text-center cursor-pointer" onClick={openDetail}>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                plan.planStatus === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {plan.planStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {results.total > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
                    <p className="text-sm text-gray-500">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, results.total)} of {results.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page === 1 || loading}
                        onClick={() => handleSearch(page - 1)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        ← Prev
                      </button>
                      <span className="text-sm text-gray-600 px-1">
                        Page {page} of {Math.ceil(results.total / PAGE_SIZE)}
                      </span>
                      <button
                        disabled={page >= Math.ceil(results.total / PAGE_SIZE) || loading}
                        onClick={() => handleSearch(page + 1)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerDetailPanel
          customerId={selectedCustomer.customerId}
          planId={selectedCustomer.planId}
          planType={selectedCustomer.planType}
          onClose={() => setSelectedCustomer(null)}
          onLogCall={() => setSelectedCustomer(null)}
        />
      )}

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)}
          onSelectCustomer={cid => { setShowSearch(false); setSelectedCustomer({ customerId: cid }); }} />
      )}

      {assignModal && (
        <BulkAssignModal
          count={checkedIds.size}
          module={activeModule}
          users={users}
          onConfirm={handleAssign}
          onClose={() => !assigning && setAssignModal(false)}
          progressing={assigning}
          progress={assignProgress}
        />
      )}
    </div>
  );
};

export default AdvancedSearch;
