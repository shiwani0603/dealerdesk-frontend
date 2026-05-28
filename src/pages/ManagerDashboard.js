import React, { useState, useEffect, useCallback } from 'react';
import { dashboardService, insuranceService, serviceService, reportService, userService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

const StatCard = ({ title, value, sub, color, icon }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

const SortableHeader = ({ label, col, sortBy, sortDir, onSort }) => (
  <th onClick={() => onSort(col)}
    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap">
    {label}{sortBy === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
  </th>
);

// ─── BULK ASSIGN MODAL ──────────────────────────────────────────────────────
const BulkAssignModal = ({ count, module, users, onConfirm, onClose }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const telecallers = users.filter(u => u.role === 'telecaller' && u.isActive);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Assign {count} Plans</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Assign <span className="font-semibold">{count} {module}</span> plan{count !== 1 ? 's' : ''} to:
        </p>
        <div className="space-y-1.5 mb-4 max-h-64 overflow-y-auto">
          {telecallers.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">No active telecallers found</p>
            : telecallers.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                  selectedUser === u.id ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                👤 {u.name}
                {u.moduleRights && u.moduleRights !== 'both' && (
                  <span className="ml-2 text-xs opacity-70">({u.moduleRights})</span>
                )}
              </button>
            ))
          }
        </div>
        <button onClick={() => selectedUser && onConfirm(selectedUser)}
          disabled={!selectedUser}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
          Assign Plans
        </button>
      </div>
    </div>
  );
};

// ─── UNASSIGNED PLANS TAB ────────────────────────────────────────────────────
const UnassignedTab = ({ users }) => {
  const [module, setModule] = useState('insurance');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [assignModal, setAssignModal] = useState(false);
  const [, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = module === 'insurance'
        ? await insuranceService.getUnassigned()
        : await serviceService.getUnassigned();
      setPlans(res.data?.plans || []);
    } catch {
      toast.error('Failed to load unassigned plans');
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => { load(); }, [load]);

  const toggleAll = () => {
    if (selected.size === plans.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(plans.map(p => p.id)));
    }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleAssign = async (userId) => {
    setAssigning(true);
    try {
      const ids = [...selected];
      await Promise.all(ids.map(id =>
        module === 'insurance'
          ? insuranceService.transferPlan(id, userId)
          : serviceService.transferPlan(id, userId)
      ));
      toast.success(`${ids.length} plan${ids.length !== 1 ? 's' : ''} assigned`);
      setAssignModal(false);
      load();
    } catch {
      toast.error('Some assignments failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5">
          <button onClick={() => setModule('insurance')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${module === 'insurance' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
            🛡️ Insurance {module === 'insurance' && `(${plans.length})`}
          </button>
          <button onClick={() => setModule('service')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${module === 'service' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>
            🔧 Service {module === 'service' && `(${plans.length})`}
          </button>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setAssignModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
            👤 Assign {selected.size} selected
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-500 font-medium">No unassigned {module} plans</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === plans.length && plans.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {module === 'insurance' ? 'Expiry' : 'Due Date'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((plan, i) => {
                const c = plan.customer || {};
                const r = plan.latestRecord || {};
                const expiryDate = module === 'insurance' ? r.policyExpiryDate : plan.calculatedNextDueDate;
                return (
                  <tr key={plan.id} className={`hover:bg-blue-50 transition-colors ${selected.has(plan.id) ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(plan.id)} onChange={() => toggle(plan.id)}
                        className="rounded border-gray-300 text-blue-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{c.registrationNumber || c.chassisNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.make} {c.model}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${expiryDate && new Date(expiryDate) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                        {formatDate(expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(plan.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(new Set([plan.id])); setAssignModal(true); }}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Assign
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {assignModal && (
        <BulkAssignModal
          count={selected.size}
          module={module}
          users={users}
          onConfirm={handleAssign}
          onClose={() => setAssignModal(false)}
        />
      )}
    </div>
  );
};

// ─── PSF SUMMARY TAB ─────────────────────────────────────────────────────────
const PsfSummaryTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getPsfSummary()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  const { counts, satisfactionRate, scores, recentNotSatisfied } = data;

  const npsColor = (nps) => {
    if (nps === null) return 'text-gray-400';
    if (nps >= 50) return 'text-emerald-600';
    if (nps >= 0) return 'text-amber-600';
    return 'text-red-600';
  };

  const ceiColor = (v) => {
    if (v === null) return 'text-gray-400';
    if (v >= 4) return 'text-emerald-600';
    if (v >= 3) return 'text-amber-600';
    return 'text-red-500';
  };

  const CeiBar = ({ label, value }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-purple-500 transition-all"
          style={{ width: value !== null ? `${(value / 5) * 100}%` : '0%' }}
        />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${ceiColor(value)}`}>
        {value !== null ? value : '—'}
      </span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Plans', val: counts.open, sub: `${counts.unassigned} unassigned`, color: 'border-l-purple-500', icon: '😊' },
          { label: 'Satisfaction Rate', val: satisfactionRate !== null ? `${satisfactionRate}%` : '—', sub: `${counts.satisfied} satisfied`, color: 'border-l-emerald-500', icon: '✅' },
          { label: 'Not Satisfied', val: counts.notSatisfied, sub: 'requires follow-up', color: 'border-l-red-500', icon: '😞' },
          { label: 'Closed This Month', val: counts.closedThisMonth, sub: `${counts.closed} total closed`, color: 'border-l-blue-500', icon: '📊' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${c.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{c.val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CEI Scores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">CEI Scores</h3>
            <span className="text-xs text-gray-400">{scores.samples} samples</span>
          </div>
          {scores.samples === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No scored PSF calls yet</p>
          ) : (
            <div className="space-y-3">
              <CeiBar label="Overall CEI" value={scores.avgOverallCei} />
              <CeiBar label="Performance" value={scores.avgPerformanceCei} />
              <CeiBar label="Retention" value={scores.avgRetentionCei} />
              <CeiBar label="Attribute" value={scores.avgAttributeCei} />
              <CeiBar label="Transparency" value={scores.avgTransparencyCei} />
              <CeiBar label="Explanation" value={scores.avgExplanationCei} />
            </div>
          )}
        </div>

        {/* NPS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">NPS Score</h3>
          {scores.samples === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No NPS data yet</p>
          ) : (
            <>
              <div className="text-center mb-5">
                <p className={`text-5xl font-black ${npsColor(scores.nps)}`}>
                  {scores.nps !== null ? scores.nps : '—'}
                </p>
                <p className="text-sm text-gray-400 mt-1">Net Promoter Score</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 rounded-xl py-3">
                  <p className="text-xl font-bold text-emerald-600">{scores.promoterPercent ?? '—'}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Promoters</p>
                  <p className="text-xs text-gray-400">9–10</p>
                </div>
                <div className="bg-gray-50 rounded-xl py-3">
                  <p className="text-xl font-bold text-gray-600">{scores.passivePercent ?? '—'}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Passives</p>
                  <p className="text-xs text-gray-400">7–8</p>
                </div>
                <div className="bg-red-50 rounded-xl py-3">
                  <p className="text-xl font-bold text-red-500">{scores.detractorPercent ?? '—'}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Detractors</p>
                  <p className="text-xs text-gray-400">0–6</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Not-Satisfied */}
      {recentNotSatisfied.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">😞 Recent Not Satisfied <span className="text-sm font-normal text-red-500 ml-1">({recentNotSatisfied.length})</span></h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-4 py-2.5 text-left">Customer</th>
                  <th className="px-4 py-2.5 text-left">Vehicle</th>
                  <th className="px-4 py-2.5 text-left">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentNotSatisfied.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.customer?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{p.customer?.registrationNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.customer?.make} {p.customer?.model}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.assignedTo?.name || <span className="text-gray-300">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── REPORTS TAB ─────────────────────────────────────────────────────────────
const ReportsTab = () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);
  const [lostData, setLostData] = useState(null);
  const [autoData, setAutoData] = useState(null);
  const [loadingLost, setLoadingLost] = useState(false);
  const [loadingAuto, setLoadingAuto] = useState(true);
  const [reportModule, setReportModule] = useState('insurance');

  useEffect(() => {
    reportService.getAutoClosed().then(res => {
      setAutoData(res.data);
    }).catch(() => {}).finally(() => setLoadingAuto(false));
  }, []);

  const loadLost = useCallback(async () => {
    setLoadingLost(true);
    try {
      const res = await reportService.getLostBusiness(fromDate, toDate);
      setLostData(res.data);
    } catch {
      toast.error('Failed to load lost business report');
    } finally {
      setLoadingLost(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { loadLost(); }, [loadLost]);

  const lostPlans = lostData
    ? (reportModule === 'insurance' ? lostData.insurance?.plans : lostData.service?.plans) || []
    : [];

  const autoPlans = autoData
    ? (reportModule === 'insurance' ? autoData.insurance?.plans : autoData.service?.plans) || []
    : [];

  return (
    <div className="space-y-6">
      {/* Module toggle */}
      <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit gap-0.5">
        <button onClick={() => setReportModule('insurance')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportModule === 'insurance' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
          🛡️ Insurance
        </button>
        <button onClick={() => setReportModule('service')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportModule === 'service' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>
          🔧 Service
        </button>
      </div>

      {/* Lost Business Report */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="text-lg">❌</span> Lost Business
              {lostData && (
                <span className="text-sm font-normal text-gray-500">
                  — {reportModule === 'insurance' ? lostData.insurance?.count : lostData.service?.count} plans
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500">Plans closed as "Lost — Done Elsewhere"</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              max={toDate} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              min={fromDate} max={today.toISOString().split('T')[0]}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>
        {loadingLost ? (
          <div className="py-12 flex justify-center"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : lostPlans.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No lost plans in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Customer', 'Vehicle', 'Telecaller', 'Closed Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lostPlans.map((plan, i) => (
                  <tr key={plan.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{plan.customer?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{plan.customer?.registrationNumber || plan.customer?.chassisNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{plan.customer?.make} {plan.customer?.model}</td>
                    <td className="px-4 py-3 text-gray-600">{plan.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(plan.closedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto-Closed Today */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-lg">🤖</span> Auto-Closed Today
            {autoData && (
              <span className="text-sm font-normal text-gray-500">
                — {reportModule === 'insurance' ? autoData.insurance?.count : autoData.service?.count} plans
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">Plans automatically closed by system today (no activity after 90 days)</p>
        </div>
        {loadingAuto ? (
          <div className="py-12 flex justify-center"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : autoPlans.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No auto-closed plans today</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Customer', 'Vehicle', 'Telecaller'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {autoPlans.map((plan, i) => (
                  <tr key={plan.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{plan.customer?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{plan.customer?.chassisNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{plan.customer?.make}</td>
                    <td className="px-4 py-3 text-gray-600">{plan.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MANAGER DASHBOARD ───────────────────────────────────────────────────────
const ManagerDashboard = () => {
  useAuth();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [locationStats, setLocationStats] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);
  const [perfModule, setPerfModule] = useState('insurance');
  const [sortBy, setSortBy] = useState('totalCalls');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes, usersRes] = await Promise.all([
          dashboardService.getManager(),
          userService.list(),
        ]);
        setSummary(summaryRes.data.summary);
        setLocationStats(summaryRes.data.locationStats || []);
        setUsers(usersRes.data?.users || []);
      } catch {
        toast.error('Failed to load summary');
      } finally {
        setLoadingSummary(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingPerf(true);
      try {
        const res = await dashboardService.getPerformanceReport(fromDate, toDate);
        setPerformance(res.data.performance || []);
      } catch {
        toast.error('Failed to load performance data');
      } finally {
        setLoadingPerf(false);
      }
    };
    load();
  }, [fromDate, toDate]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const getModuleConvRate = (row, mod) => {
    if (row.connectedCalls === 0) return 0;
    const won = mod === 'insurance' ? row.conversions.insurance : row.conversions.service;
    return Math.round((won / row.connectedCalls) * 100);
  };

  const getValue = (row, col) => {
    switch (col) {
      case 'totalCalls': return row.totalCalls;
      case 'connectRate': return parseInt(row.connectRate);
      case 'appointments': return row.appointments;
      case 'conversions': return perfModule === 'insurance' ? row.conversions.insurance : row.conversions.service;
      case 'lost': return perfModule === 'insurance' ? row.lost.insurance : row.lost.service;
      case 'conversionRate': return getModuleConvRate(row, perfModule);
      default: return 0;
    }
  };

  const sortedPerformance = [...performance]
    .filter(row => {
      const mr = row.telecaller.moduleRights;
      if (!mr || mr === 'both') return true;
      return mr === perfModule;
    })
    .sort((a, b) => {
      const diff = getValue(a, sortBy) - getValue(b, sortBy);
      return sortDir === 'asc' ? diff : -diff;
    });

  if (loadingSummary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const ins = summary?.insurance || {};
  const svc = summary?.service || {};
  const customers = summary?.customers || {};

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'unassigned', label: '📥 Unassigned' },
    { id: 'psf', label: '😊 PSF Summary' },
    { id: 'reports', label: '📋 Reports' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Dealership-wide performance overview</p>
        </div>

        {/* Tab bar */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6 w-fit gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard title="Open Plans" value={(ins.totalOpen || 0) + (svc.totalOpen || 0)}
                sub={`${ins.totalOpen || 0} ins · ${svc.totalOpen || 0} svc`} color="border-blue-500" icon="📋" />
              <StatCard title="Overdue" value={(ins.totalOverdue || 0) + (svc.totalOverdue || 0)}
                sub={`${ins.totalOverdue || 0} ins · ${svc.totalOverdue || 0} svc`} color="border-orange-500" icon="⚠️" />
              <StatCard title="Won This Month" value={(ins.conversionsThisMonth || 0) + (svc.conversionsThisMonth || 0)}
                sub={`${ins.conversionsThisMonth || 0} ins · ${svc.conversionsThisMonth || 0} svc`} color="border-green-500" icon="✅" />
              <StatCard title="Lost Business" value={(ins.lostBusiness || 0) + (svc.lostBusiness || 0)}
                sub={`${ins.lostBusiness || 0} ins · ${svc.lostBusiness || 0} svc`} color="border-red-500" icon="❌" />
            </div>

            {/* Customers row */}
            {customers.total > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{customers.total}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Own Sale</p>
                  <p className="text-2xl font-bold text-green-600">{customers.ownSale || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Non-Own Sale</p>
                  <p className="text-2xl font-bold text-gray-600">{customers.nonOwnSale || 0}</p>
                </div>
              </div>
            )}

            {/* Team Performance */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900">Team Performance</h2>
                  <p className="text-sm text-gray-500">Follow-up calls logged per telecaller</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    max={toDate} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    min={fromDate} max={today.toISOString().split('T')[0]}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="px-5 pt-4 pb-0 flex gap-2">
                <button onClick={() => { setPerfModule('insurance'); setSortBy('totalCalls'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${perfModule === 'insurance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  🛡️ Insurance
                </button>
                <button onClick={() => { setPerfModule('service'); setSortBy('totalCalls'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${perfModule === 'service' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  🔧 Service
                </button>
              </div>
              {loadingPerf ? (
                <div className="p-10 text-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : sortedPerformance.length === 0 ? (
                <div className="p-10 text-center"><p className="text-gray-400">No telecallers found</p></div>
              ) : (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telecaller</th>
                        <SortableHeader label="Calls" col="totalCalls" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader label="Connect %" col="connectRate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader label="Appts" col="appointments" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader label={perfModule === 'insurance' ? 'Ins. Won' : 'Svc. Won'} col="conversions" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader label={perfModule === 'insurance' ? 'Ins. Lost' : 'Svc. Lost'} col="lost" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <SortableHeader label="Conv. Rate" col="conversionRate" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedPerformance.map((row, i) => {
                        const connectPct = parseInt(row.connectRate);
                        const convPct = getModuleConvRate(row, perfModule);
                        const won = perfModule === 'insurance' ? row.conversions.insurance : row.conversions.service;
                        const lost = perfModule === 'insurance' ? row.lost.insurance : row.lost.service;
                        return (
                          <tr key={row.telecaller.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                            <td className="px-5 py-3.5 font-medium text-gray-900">{row.telecaller.name}</td>
                            <td className="px-4 py-3.5 text-gray-700">{row.totalCalls}</td>
                            <td className="px-4 py-3.5 font-medium">
                              <span className={connectPct >= 60 ? 'text-green-600' : connectPct >= 40 ? 'text-orange-500' : 'text-red-500'}>{row.connectRate}</span>
                            </td>
                            <td className="px-4 py-3.5 text-gray-700">{row.appointments}</td>
                            <td className="px-4 py-3.5 text-green-600 font-medium">{won}</td>
                            <td className="px-4 py-3.5 text-red-500">{lost}</td>
                            <td className="px-4 py-3.5 font-medium">
                              <span className={convPct >= 20 ? 'text-green-600' : convPct >= 10 ? 'text-orange-500' : 'text-red-500'}>{convPct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Location Breakdown */}
            {locationStats.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Location Breakdown</h2>
                  <p className="text-sm text-gray-500">Open plans & conversions this month by location</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        {['Location', 'Ins. Open', 'Svc. Open', 'Ins. Won', 'Svc. Won'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {locationStats.map((row, i) => (
                        <tr key={row.location.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                          <td className="px-4 py-3.5 font-medium text-gray-900">{row.location.name}</td>
                          <td className="px-4 py-3.5 text-gray-700">{row.insurance.open}</td>
                          <td className="px-4 py-3.5 text-gray-700">{row.service.open}</td>
                          <td className="px-4 py-3.5 text-green-600 font-medium">{row.insurance.conversionsThisMonth}</td>
                          <td className="px-4 py-3.5 text-green-600 font-medium">{row.service.conversionsThisMonth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── UNASSIGNED PLANS ── */}
        {activeTab === 'unassigned' && <UnassignedTab users={users} />}

        {/* ── PSF SUMMARY ── */}
        {activeTab === 'psf' && <PsfSummaryTab />}

        {/* ── REPORTS ── */}
        {activeTab === 'reports' && <ReportsTab />}
      </div>

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)}
          onSelectCustomer={cid => { setShowSearch(false); setSelectedCustomer({ customerId: cid, planId: null, planType: null }); }} />
      )}
      {selectedCustomer && (
        <CustomerDetailPanel
          customerId={selectedCustomer.customerId}
          planId={selectedCustomer.planId}
          planType={selectedCustomer.planType}
          onClose={() => setSelectedCustomer(null)}
          onLogCall={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
