import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const Pill = ({ label, color = 'bg-gray-100 text-gray-600' }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
);

// ── Comparative Dashboard ──────────────────────────────────────────────────────
const ComparativeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('totalPlans');

  const load = async () => {
    setLoading(true);
    try { const r = await adminService.getComparative(); setData(r.data); }
    catch { toast.error('Failed to load comparative data'); }
    finally { setLoading(false); }
  };

  const sorted = data?.dealerships?.slice().sort((a, b) => (b[sort] || 0) - (a[sort] || 0)) || [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={load} disabled={loading}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
          {loading ? 'Loading…' : 'Load Overview'}
        </button>
        {data && (
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="totalPlans">Sort: Total Plans</option>
            <option value="totalOverdue">Sort: Overdue</option>
            <option value="totalConversionsMonth">Sort: Conversions This Month</option>
            <option value="userCount">Sort: Users</option>
          </select>
        )}
      </div>

      {data && (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-700">{data.totalDealerships}</p><p className="text-xs text-blue-600">Dealerships</p></div>
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-700">{sorted.reduce((s, d) => s + d.totalPlans, 0)}</p><p className="text-xs text-green-600">Total Open Plans</p></div>
            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-red-700">{sorted.reduce((s, d) => s + d.totalOverdue, 0)}</p><p className="text-xs text-red-600">Total Overdue</p></div>
            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-700">{sorted.reduce((s, d) => s + d.totalConversionsMonth, 0)}</p><p className="text-xs text-amber-600">Conversions (Month)</p></div>
          </div>

          {/* Per-dealership table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
                    <td className="px-3 py-2">Dealership</td>
                    <td className="px-3 py-2 text-right">Users</td>
                    <td className="px-3 py-2 text-right">Ins Open</td>
                    <td className="px-3 py-2 text-right">Svc Open</td>
                    <td className="px-3 py-2 text-right">Overdue</td>
                    <td className="px-3 py-2 text-right">Conv/Mo</td>
                    <td className="px-3 py-2 text-right">PSF Open</td>
                    <td className="px-3 py-2 text-right">Lost</td>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((d, i) => (
                    <tr key={d.id} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''} ${!d.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-gray-800">{d.name}</p>
                        <p className="text-gray-400">{d.workshopCode} · {d.locationCount} loc</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{d.userCount}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-blue-600">{d.insurance.open}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-green-600">{d.service.open}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-red-600">{d.totalOverdue}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{d.totalConversionsMonth}</td>
                      <td className="px-3 py-2.5 text-right text-purple-600">{d.psf.open}</td>
                      <td className="px-3 py-2.5 text-right text-gray-400">{d.insurance.lost + d.service.lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {!data && !loading && <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🏢</p><p className="text-sm">Click Load Overview to see all dealerships</p></div>}
    </div>
  );
};

// ── Billing Auto-Count ────────────────────────────────────────────────────────
const BillingPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await adminService.getBilling(); setData(r.data.billing); }
    catch { toast.error('Failed to load billing data'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <button onClick={load} disabled={loading}
        className="mb-4 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
        {loading ? 'Loading…' : 'Load Billing Counts'}
      </button>
      {data && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
                <td className="px-3 py-2">Dealership</td>
                <td className="px-3 py-2 text-right">Active Users</td>
                <td className="px-3 py-2 text-right">Telecallers</td>
                <td className="px-3 py-2 text-right">TLs</td>
                <td className="px-3 py-2 text-right">Managers</td>
                <td className="px-3 py-2 text-right">Locations</td>
                <td className="px-3 py-2 text-right">Brands</td>
                <td className="px-3 py-2">Modules</td>
              </tr></thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={d.id} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''} ${!d.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{d.name}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-blue-600">{d.counts.activeUsers}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{d.counts.telecallers}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{d.counts.teamLeaders}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{d.counts.managers}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{d.counts.activeLocations}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{d.counts.brands}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(d.modules || {}).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs">{k}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold text-xs">
                  <td className="px-3 py-2.5 text-gray-700">TOTAL</td>
                  <td className="px-3 py-2.5 text-right text-blue-700">{data.reduce((s, d) => s + d.counts.activeUsers, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{data.reduce((s, d) => s + d.counts.telecallers, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{data.reduce((s, d) => s + d.counts.teamLeaders, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{data.reduce((s, d) => s + d.counts.managers, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{data.reduce((s, d) => s + d.counts.activeLocations, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">—</td>
                  <td className="px-3 py-2.5">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!data && !loading && <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">💰</p><p className="text-sm">Click Load to see billing counts per dealership</p></div>}
    </div>
  );
};

// ── Job Card Fraud Log ────────────────────────────────────────────────────────
const FraudLogPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await adminService.getFraudLog(); setData(r.data); }
    catch { toast.error('Failed to load fraud log'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <button onClick={load} disabled={loading}
        className="mb-4 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
        {loading ? 'Loading…' : 'Load Fraud Log'}
      </button>
      {data && (
        data.total === 0
          ? <div className="text-center py-10"><p className="text-3xl mb-2">✅</p><p className="text-sm text-gray-500">No fraud cases detected across all dealerships</p></div>
          : (
            <div>
              <p className="text-sm font-semibold text-red-600 mb-3">🚨 {data.total} fraud case{data.total !== 1 ? 's' : ''} detected</p>
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-red-50 text-red-700 font-semibold uppercase">
                    <td className="px-3 py-2">Chassis No</td>
                    <td className="px-3 py-2">Job Card No</td>
                    <td className="px-3 py-2">Locations</td>
                    <td className="px-3 py-2 text-center">Count</td>
                  </tr></thead>
                  <tbody>
                    {data.cases.map((c, i) => (
                      <tr key={i} className={`border-t border-red-100 ${i % 2 === 1 ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 font-mono text-gray-800">{c.chassisNumber}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{c.jobCardNumber}</td>
                        <td className="px-3 py-2 text-gray-600">{c.locations.join(' / ')}</td>
                        <td className="px-3 py-2 text-center"><span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">{c.count}x</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
      {!data && !loading && <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🚨</p><p className="text-sm">Click Load to scan all dealerships for duplicate job cards</p></div>}
    </div>
  );
};

// ── Data Deletion ─────────────────────────────────────────────────────────────
const DataDeletion = ({ dealerships }) => {
  const [form, setForm] = useState({ dealershipId: '', module: '', make: '', fromDate: '', toDate: '' });
  const [step, setStep] = useState(1); // 1=config, 2=confirm, 3=done
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    adminService.getAuditLog().then(r => setAuditLogs(r.data.logs || [])).catch(() => {});
  }, []);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const r = await adminService.deleteData(form.dealershipId, { ...form, confirm: true });
      setResult(r.data);
      setStep(3);
      adminService.getAuditLog().then(r2 => setAuditLogs(r2.data.logs || [])).catch(() => {});
      toast.success('Data deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Deletion failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedDealership = dealerships?.find(d => d.id === form.dealershipId);

  return (
    <div className="space-y-5">
      {step === 1 && (
        <div className="border border-red-200 rounded-xl p-5 bg-red-50">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-red-800">Data Deletion</h3>
              <p className="text-xs text-red-600">This action is irreversible. All deleted data is logged.</p>
            </div>
          </div>
          <div className="space-y-3 bg-white rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dealership *</label>
              <select value={form.dealershipId} onChange={e => setForm(f => ({ ...f, dealershipId: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
                <option value="">— Select Dealership —</option>
                {(dealerships || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Module</label>
                <select value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">All Modules</option>
                  <option value="insurance">Insurance Only</option>
                  <option value="service">Service Only</option>
                  <option value="psf">PSF Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Make (optional)</label>
                <input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g. tata" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
                <input type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
                <input type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!form.dealershipId}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
              Review Deletion →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="border-2 border-red-500 rounded-xl p-5 bg-red-50">
          <h3 className="font-bold text-red-800 text-lg mb-3">⚠️ Confirm Deletion</h3>
          <div className="bg-white rounded-xl p-4 mb-4 space-y-1.5 text-sm">
            <p><span className="font-semibold">Dealership:</span> {selectedDealership?.name}</p>
            <p><span className="font-semibold">Module:</span> {form.module || 'ALL modules'}</p>
            <p><span className="font-semibold">Make:</span> {form.make || 'ALL makes'}</p>
            <p><span className="font-semibold">Date Range:</span> {form.fromDate || 'any'} → {form.toDate || 'any'}</p>
          </div>
          <p className="text-sm text-red-700 font-semibold mb-4">This will permanently delete all matching plans, records, and customers. This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={loading}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Deleting…' : 'YES — Delete Permanently'}
            </button>
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="border border-green-200 rounded-xl p-5 bg-green-50">
          <h3 className="font-bold text-green-800 mb-3">✅ Deletion Complete</h3>
          <div className="bg-white rounded-xl p-3 text-sm space-y-1">
            {Object.entries(result.deleted).map(([k, v]) => (
              <p key={k}><span className="font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span> {v} deleted</p>
            ))}
          </div>
          <button onClick={() => { setStep(1); setForm({ dealershipId: '', module: '', make: '', fromDate: '', toDate: '' }); }}
            className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">
            ← Back
          </button>
        </div>
      )}

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">Audit Log (last {auditLogs.length})</div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
              <td className="px-3 py-2">Date</td>
              <td className="px-3 py-2">Action</td>
              <td className="px-3 py-2">Details</td>
            </tr></thead>
            <tbody>
              {auditLogs.map((log, i) => (
                <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(log.createdAt)}</td>
                  <td className="px-3 py-2 font-medium text-gray-700 capitalize">{log.action.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                    {log.details?.dealershipName} · {log.details?.module} · {log.details?.make}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Main AdminOverview Page ───────────────────────────────────────────────────
const TABS = [
  { id: 'comparative', label: '🏢 All Dealerships', component: ComparativeDashboard },
  { id: 'billing',     label: '💰 Billing Counts',  component: BillingPanel },
  { id: 'fraud',       label: '🚨 Fraud Log',        component: FraudLogPanel },
  { id: 'deletion',    label: '🗑️ Data Deletion',    component: null },
];

const AdminOverview = () => {
  const [activeTab, setActiveTab] = useState('comparative');
  const [dealerships, setDealerships] = useState([]);

  useEffect(() => {
    adminService.getComparative()
      .then(r => setDealerships((r.data.dealerships || []).map(d => ({ id: d.id, name: d.name }))))
      .catch(() => {});
  }, []);

  const ActiveComp = TABS.find(t => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-sm text-gray-500">System-wide metrics and administration</p>
        </div>

        <div className="flex gap-1 flex-wrap mb-6 bg-white rounded-xl shadow-sm p-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {activeTab === 'deletion'
            ? <DataDeletion dealerships={dealerships} />
            : ActiveComp && <ActiveComp />
          }
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
