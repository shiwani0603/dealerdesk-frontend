import React, { useState, useCallback } from 'react';
import { reportService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

// ── CSV Export ────────────────────────────────────────────────────────────────
const downloadCSV = (rows, filename) => {
  if (!rows.length) { toast.error('No data to export'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h] == null ? '' : String(r[h]);
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
};
const yearStart = () => `${new Date().getFullYear()}-01-01`;

const StatBox = ({ label, value, sub, color = 'gray' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700', gray: 'bg-gray-50 text-gray-700',
  };
  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
};

const GrowthBadge = ({ pct }) => {
  if (pct == null) return <span className="text-xs text-gray-400">—</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
};

const DateRange = ({ from, to, onFrom, onTo, onLoad, loading }) => (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    <input type="date" value={from} onChange={e => onFrom(e.target.value)}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
    <span className="text-gray-400 text-sm">to</span>
    <input type="date" value={to} onChange={e => onTo(e.target.value)}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
    <button onClick={onLoad} disabled={loading}
      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
      {loading ? 'Loading…' : 'Load'}
    </button>
  </div>
);

const EmptyState = ({ msg = 'No data for the selected period' }) => (
  <div className="text-center py-12 text-gray-400">
    <p className="text-4xl mb-2">📊</p>
    <p className="text-sm">{msg}</p>
  </div>
);

// ── LY vs TY ─────────────────────────────────────────────────────────────────
const LyVsTy = () => {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await reportService.getLyVsTy(period); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [period]);

  const exportCSV = () => {
    if (!data) return;
    downloadCSV([
      { Module: 'Insurance', Metric: 'Plans',       TY: data.insurance.ty.plans, LY: data.insurance.ly.plans, Growth: data.insurance.growth.plans != null ? `${data.insurance.growth.plans}%` : '—' },
      { Module: 'Insurance', Metric: 'Conversions', TY: data.insurance.ty.conversions, LY: data.insurance.ly.conversions, Growth: data.insurance.growth.conversions != null ? `${data.insurance.growth.conversions}%` : '—' },
      { Module: 'Insurance', Metric: 'Lost',        TY: data.insurance.ty.lost, LY: data.insurance.ly.lost, Growth: '—' },
      { Module: 'Service',   Metric: 'Plans',       TY: data.service.ty.plans, LY: data.service.ly.plans, Growth: data.service.growth.plans != null ? `${data.service.growth.plans}%` : '—' },
      { Module: 'Service',   Metric: 'Conversions', TY: data.service.ty.conversions, LY: data.service.ly.conversions, Growth: data.service.growth.conversions != null ? `${data.service.growth.conversions}%` : '—' },
      { Module: 'Service',   Metric: 'Lost',        TY: data.service.ty.lost, LY: data.service.ly.lost, Growth: '—' },
    ], 'ly_vs_ty');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['month', 'quarter', 'year'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : 'This Year'}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
          {loading ? 'Loading…' : 'Load'}
        </button>
        {data && <button onClick={exportCSV} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">⬇ CSV</button>}
      </div>

      {data && (
        <div className="space-y-4">
          {[['insurance', '🛡️ Insurance', 'blue'], ['service', '🔧 Service', 'green']].map(([mod, label, color]) => (
            <div key={mod} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-700 text-sm">{label}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs font-semibold uppercase">
                      <td className="px-4 py-2">Metric</td>
                      <td className="px-4 py-2 text-right">TY</td>
                      <td className="px-4 py-2 text-right">LY</td>
                      <td className="px-4 py-2 text-right">Growth</td>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Plans', 'plans', 'plans'],
                      ['Conversions', 'conversions', 'conversions'],
                      ['Conversion Rate', 'convRate', null, '%'],
                      ['Lost', 'lost', null],
                    ].map(([lbl, tyKey, growthKey, suffix = '']) => (
                      <tr key={lbl} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{lbl}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{data[mod].ty[tyKey]}{suffix}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{data[mod].ly[tyKey]}{suffix}</td>
                        <td className="px-4 py-2.5 text-right">
                          {growthKey ? <GrowthBadge pct={data[mod].growth[growthKey]} /> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      {!data && !loading && <EmptyState msg="Select a period and click Load" />}
    </div>
  );
};

// ── Lost Business ─────────────────────────────────────────────────────────────
const LostBusiness = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await reportService.getLostBusiness(from, to); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ...data.insurance.plans.map(p => ({ Module: 'Insurance', Customer: p.customer?.name, Chassis: p.customer?.chassisNumber, Reg: p.customer?.registrationNumber, Make: p.customer?.make, Model: p.customer?.model, Telecaller: p.assignedTo?.name || '—', ClosedAt: p.closedAt?.split('T')[0] })),
      ...data.service.plans.map(p => ({ Module: 'Service', Customer: p.customer?.name, Chassis: p.customer?.chassisNumber, Reg: p.customer?.registrationNumber, Make: p.customer?.make, Model: p.customer?.model, Telecaller: p.assignedTo?.name || '—', ClosedAt: p.closedAt?.split('T')[0] })),
    ];
    downloadCSV(rows, 'lost_business');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  return (
    <div>
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} onLoad={load} loading={loading} />
      {data && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-4">
            <StatBox label="Total Lost" value={data.total} color="red" />
            <StatBox label="Insurance" value={data.insurance.count} color="blue" />
            <StatBox label="Service" value={data.service.count} color="green" />
            <button onClick={exportCSV} className="ml-auto self-start px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">⬇ CSV</button>
          </div>
          {[['Insurance', data.insurance.plans, 'blue'], ['Service', data.service.plans, 'green']].map(([label, plans, color]) => (
            plans.length > 0 && (
              <div key={label} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{label} ({plans.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
                      <td className="px-3 py-2">Customer</td><td className="px-3 py-2">Make / Model</td>
                      <td className="px-3 py-2">Reg No</td><td className="px-3 py-2">Telecaller</td><td className="px-3 py-2">Closed</td>
                    </tr></thead>
                    <tbody>
                      {plans.map((p, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                          <td className="px-3 py-2 font-medium text-gray-800">{p.customer?.name || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{p.customer?.make} {p.customer?.model}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{p.customer?.registrationNumber || p.customer?.chassisNumber || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{p.assignedTo?.name || '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{fmt(p.closedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      {!data && !loading && <EmptyState msg="Select a date range and click Load" />}
    </div>
  );
};

// ── Own Sale Retention ────────────────────────────────────────────────────────
const OwnSaleRetention = () => {
  const [from, setFrom] = useState(yearStart());
  const [to, setTo]     = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('summary');

  const load = async () => {
    setLoading(true);
    try { const r = await reportService.getOwnSaleRetention(from, to); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ...data.retainedList.map(c => ({ Status: 'Retained', Name: c.name, Chassis: c.chassisNumber, Reg: c.registrationNumber, Make: c.make, Model: c.model })),
      ...data.lostList.map(c => ({ Status: 'Lost', Name: c.name, Chassis: c.chassisNumber, Reg: c.registrationNumber, Make: c.make, Model: c.model })),
    ];
    downloadCSV(rows, 'own_sale_retention');
  };

  return (
    <div>
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} onLoad={load} loading={loading} />
      {data && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatBox label="Own Sale Customers" value={data.total} color="gray" />
            <StatBox label="Retained" value={data.retained} color="green" />
            <StatBox label="Lost" value={data.lost} color="red" />
            <StatBox label="Retention Rate" value={`${data.retentionRate}%`} color="blue" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${data.retentionRate}%` }} />
          </div>
          <div className="flex gap-2 mb-3">
            {['summary', 'retained', 'lost'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${view === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {v} {v === 'retained' ? `(${data.retained})` : v === 'lost' ? `(${data.lost})` : ''}
              </button>
            ))}
            <button onClick={exportCSV} className="ml-auto px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">⬇ CSV</button>
          </div>
          {view !== 'summary' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
                    <td className="px-3 py-2">Name</td><td className="px-3 py-2">Make / Model</td><td className="px-3 py-2">Reg / Chassis</td>
                  </tr></thead>
                  <tbody>
                    {(view === 'retained' ? data.retainedList : data.lostList).map((c, i) => (
                      <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                        <td className="px-3 py-2 font-medium text-gray-800">{c.name || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{c.make} {c.model}</td>
                        <td className="px-3 py-2 font-mono text-gray-600 text-xs">{c.registrationNumber || c.chassisNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {!data && !loading && <EmptyState msg="Select a date range and click Load" />}
    </div>
  );
};

// ── Auto-Close Summary ────────────────────────────────────────────────────────
const AutoCloseSummary = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await reportService.getAutoCloseSummary(from, to); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    downloadCSV(data.plans.map(p => ({
      Module: p.module, Category: p.category, Customer: p.customer?.name,
      Make: p.customer?.make, Telecaller: p.assignedTo?.name || 'Unassigned',
      ClosedAt: p.closedAt?.split('T')[0],
    })), 'auto_close_summary');
  };

  return (
    <div>
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} onLoad={load} loading={loading} />
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Total Auto-Closed" value={data.total} color="red" />
            <StatBox label="Never Followed" value={data.neverFollowed} color="amber" />
            <StatBox label="Partially Followed" value={data.partiallyFollowed} color="blue" />
            <button onClick={exportCSV} className="flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-xl font-medium">⬇ Export CSV</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Insurance" value={data.byModule.insurance} color="blue" />
            <StatBox label="Service" value={data.byModule.service} color="green" />
          </div>

          {data.byTelecaller.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">By Telecaller</div>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
                  <td className="px-4 py-2">Telecaller</td>
                  <td className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2 text-right">Never Called</td>
                  <td className="px-4 py-2 text-right">Partial</td>
                </tr></thead>
                <tbody>
                  {data.byTelecaller.map((tc, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{tc.name}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600">{tc.total}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600">{tc.neverFollowed}</td>
                      <td className="px-4 py-2.5 text-right text-blue-600">{tc.partiallyFollowed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!data && !loading && <EmptyState msg="Select a date range and click Load" />}
    </div>
  );
};

// ── PSF / CEI / NPS ───────────────────────────────────────────────────────────
const PsfReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await reportService.getPsfSummary(); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <button onClick={load} disabled={loading}
        className="mb-4 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
        {loading ? 'Loading…' : 'Load PSF Report'}
      </button>
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Open PSF Plans" value={data.counts.open} color="purple" />
            <StatBox label="Satisfied" value={data.counts.satisfied} color="green" />
            <StatBox label="Not Satisfied" value={data.counts.notSatisfied} color="red" />
            <StatBox label="Satisfaction Rate" value={data.satisfactionRate != null ? `${data.satisfactionRate}%` : '—'} color="blue" />
          </div>

          {data.scores.samples > 0 && (
            <div className="border border-purple-200 rounded-xl overflow-hidden">
              <div className="bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">CEI Scores ({data.scores.samples} samples)</div>
              <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['Overall', data.scores.avgOverallCei],
                  ['Performance', data.scores.avgPerformanceCei],
                  ['Retention', data.scores.avgRetentionCei],
                  ['Attribute', data.scores.avgAttributeCei],
                  ['Transparency', data.scores.avgTransparencyCei],
                  ['Explanation', data.scores.avgExplanationCei],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-700">{val ?? '—'}<span className="text-xs text-gray-400">/5</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.scores.nps != null && (
            <div className="border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-700 mb-3">NPS Score: <span className="text-2xl font-bold">{data.scores.nps}</span></p>
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{data.scores.promoterPercent}%</p>
                  <p className="text-xs text-green-600">Promoters (9–10)</p>
                </div>
                <div className="flex-1 bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-yellow-700">{data.scores.passivePercent}%</p>
                  <p className="text-xs text-yellow-600">Passives (7–8)</p>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{data.scores.detractorPercent}%</p>
                  <p className="text-xs text-red-600">Detractors (0–6)</p>
                </div>
              </div>
            </div>
          )}

          {data.recentNotSatisfied.length > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Recent Not Satisfied ({data.recentNotSatisfied.length})</div>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-100 text-gray-500 font-semibold uppercase">
                  <td className="px-3 py-2">Customer</td><td className="px-3 py-2">Vehicle</td><td className="px-3 py-2">Telecaller</td>
                </tr></thead>
                <tbody>
                  {data.recentNotSatisfied.map((p, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="px-3 py-2 font-medium">{p.customer?.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{p.customer?.make} {p.customer?.model} · {p.customer?.registrationNumber}</td>
                      <td className="px-3 py-2 text-gray-600">{p.assignedTo?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!data && !loading && <EmptyState msg="Click Load PSF Report" />}
    </div>
  );
};

// ── Telecaller Performance ────────────────────────────────────────────────────
const PerformanceReport = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo]     = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await reportService.getPerformance(from, to); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data?.telecallers) return;
    downloadCSV(data.telecallers.map(t => ({
      Telecaller: t.telecaller?.name, Calls: t.callsMade, Conversions: t.conversions,
      ConvRate: `${t.conversionRate}%`, Lost: t.lost, NotConnected: t.notConnected,
    })), 'telecaller_performance');
  };

  return (
    <div>
      <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} onLoad={load} loading={loading} />
      {data?.telecallers && (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={exportCSV} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">⬇ CSV</button>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-100 text-gray-500 text-xs font-semibold uppercase">
                  <td className="px-4 py-2">Telecaller</td>
                  <td className="px-4 py-2 text-right">Calls</td>
                  <td className="px-4 py-2 text-right">Conversions</td>
                  <td className="px-4 py-2 text-right">Conv Rate</td>
                  <td className="px-4 py-2 text-right">Lost</td>
                  <td className="px-4 py-2 text-right">Not Connected</td>
                </tr></thead>
                <tbody>
                  {data.telecallers.map((t, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{t.telecaller?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{t.callsMade}</td>
                      <td className="px-4 py-2.5 text-right text-green-600 font-bold">{t.conversions}</td>
                      <td className="px-4 py-2.5 text-right"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${t.conversionRate >= 50 ? 'bg-green-100 text-green-700' : t.conversionRate >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{t.conversionRate}%</span></td>
                      <td className="px-4 py-2.5 text-right text-red-500">{t.lost}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{t.notConnected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {!data && !loading && <EmptyState msg="Select a date range and click Load" />}
    </div>
  );
};

// ── Job Card Fraud ────────────────────────────────────────────────────────────
const JobCardFraud = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await reportService.getJobCardFraud(); setData(r.data); }
    catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data?.cases) return;
    downloadCSV(data.cases.map(c => ({
      Chassis: c.chassisNumber, JobCard: c.jobCardNumber,
      Locations: c.locations.join(' | '), Count: c.count,
    })), 'job_card_fraud');
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={load} disabled={loading}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
          {loading ? 'Loading…' : 'Load Fraud Log'}
        </button>
        {data && <button onClick={exportCSV} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">⬇ CSV</button>}
      </div>
      {data && (
        <div>
          {data.total === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-gray-500 font-medium">No fraud cases detected</p>
              <p className="text-sm text-gray-400 mt-1">No duplicate job cards found across locations</p>
            </div>
          ) : (
            <div>
              <div className="mb-3"><StatBox label="Fraud Cases Detected" value={data.total} color="red" /></div>
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-red-50 text-red-700 text-xs font-semibold uppercase">
                    <td className="px-4 py-2">Chassis No</td>
                    <td className="px-4 py-2">Job Card No</td>
                    <td className="px-4 py-2">Locations</td>
                    <td className="px-4 py-2 text-center">Count</td>
                  </tr></thead>
                  <tbody>
                    {data.cases.map((c, i) => (
                      <tr key={i} className={`border-t border-red-100 ${i % 2 === 1 ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2.5 font-mono text-gray-800">{c.chassisNumber}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-600">{c.jobCardNumber}</td>
                        <td className="px-4 py-2.5 text-gray-600">{c.locations.join(', ')}</td>
                        <td className="px-4 py-2.5 text-center"><span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">{c.count}x</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {!data && !loading && <EmptyState msg="Click Load Fraud Log to scan for duplicate job cards" />}
    </div>
  );
};

// ── Main Reports Page ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'lyvty',       label: '📈 LY vs TY',          component: LyVsTy },
  { id: 'lost',        label: '❌ Lost Business',       component: LostBusiness },
  { id: 'retention',   label: '🏠 Own Sale Retention', component: OwnSaleRetention },
  { id: 'autoclose',   label: '🔒 Auto-Close Summary', component: AutoCloseSummary },
  { id: 'psf',         label: '⭐ PSF / CEI / NPS',   component: PsfReport },
  { id: 'performance', label: '👤 Performance',        component: PerformanceReport },
  { id: 'fraud',       label: '🚨 Fraud Log',          component: JobCardFraud },
];

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('lyvty');
  const [showSearch, setShowSearch] = useState(false);
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || LyVsTy;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">Analytics and performance insights</p>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg">
            🖨️ Print
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 flex-wrap mb-6 bg-white rounded-xl shadow-sm p-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Report content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">{TABS.find(t => t.id === activeTab)?.label}</h2>
          <ActiveComponent />
        </div>
      </div>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
    </div>
  );
};

export default ReportsPage;
