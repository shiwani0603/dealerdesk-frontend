import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { outsideService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import { outletLabel } from '../components/OutletTree';

const USE_FOR = [
  { key: 'insurance', label: '🛡️ Insurance', hint: 'Renewal case from policy expiry (or estimated from sale date)' },
  { key: 'service',   label: '🔧 Service',   hint: 'Next service from your interval master (no back dates)' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');

// ── Template download (standard column names that auto-map) ─────────────────
const downloadTemplate = (fields) => {
  const csv = fields.map(f => f.label.replace(' *', '')).join(',') + '\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'outside_data_template.csv';
  a.click();
};

// ── Upload tab ──────────────────────────────────────────────────────────────
const UploadTab = ({ meta, onUploaded }) => {
  const [vendorName, setVendorName] = useState('');
  const [useFor, setUseFor] = useState([]);
  const [outletIds, setOutletIds] = useState({ insurance: [], service: [] });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const me = meta.modulesEnabled || {};
  const useForOptions = USE_FOR.filter(u => me[u.key] !== false);
  const outletsOf = (mod) => meta.outlets.filter(o => Array.isArray(o.modules) && o.modules.includes(mod));
  const toggleUseFor = (k) => setUseFor(u => (u.includes(k) ? u.filter(x => x !== k) : [...u, k]));
  // Outlets keep the order they were ticked in — that is the order cases are dealt out
  const toggleOutlet = (mod, id) => setOutletIds(o => ({
    ...o, [mod]: o[mod].includes(id) ? o[mod].filter(x => x !== id) : [...o[mod], id],
  }));
  const outletName = (id) => meta.outlets.find(o => o.id === id)?.name || '';

  const reset = () => {
    setFile(null); setPreview(null); setMapping({}); setResults(null);
  };

  const loadPreview = async () => {
    if (!vendorName.trim()) { toast.error('Enter the source / vendor name'); return; }
    if (!file) { toast.error('Choose a file'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('vendorName', vendorName.trim());
      const res = await outsideService.preview(fd);
      setPreview(res.data);
      setMapping(res.data.mapping);
      if (res.data.usedSavedMapping) toast.success(`Loaded saved column mapping for "${vendorName.trim()}"`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const process = async () => {
    if (useFor.length === 0) { toast.error('Choose what this data is used for'); return; }
    for (const m of useFor) {
      if (outletIds[m].length === 0) { toast.error(`Select at least one ${m} outlet`); return; }
    }
    const mappedFields = Object.values(mapping);
    if (!mappedFields.includes('chassis_number')) { toast.error('Map the Chassis Number column'); return; }
    if (!mappedFields.includes('make')) { toast.error('Map the Make column'); return; }
    if (!mappedFields.includes('mobile')) { toast.error('Map the Mobile column — it is required for calling'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('vendorName', vendorName.trim());
      fd.append('mappingJson', JSON.stringify(mapping));
      fd.append('useFor', JSON.stringify(useFor));
      useFor.forEach(m => fd.append(`${m}OutletIds`, JSON.stringify(outletIds[m])));
      const res = await outsideService.process(fd);
      setResults(res.data.results);
      toast.success('Outside data uploaded');
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  if (!meta.canUpload) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-2">🔒</p>
        <p className="text-sm">You do not have Outside Data upload rights. Ask your manager or Super Admin.</p>
      </div>
    );
  }

  if (results) {
    const stat = (label, value, color) => (
      <div className={`${color} rounded-xl p-3 text-center`}>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium">{label}</p>
      </div>
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stat('Rows in file', results.totalRows, 'bg-gray-50 text-gray-700')}
          {stat('New customers', results.newCustomers, 'bg-blue-50 text-blue-700')}
          {stat('Already existing', results.existingCustomers, 'bg-amber-50 text-amber-700')}
          {stat('Rejected rows', results.rejected, 'bg-red-50 text-red-700')}
          {stat('Insurance cases', results.insuranceCases, 'bg-blue-50 text-blue-700')}
          {stat('Service cases', results.serviceCases, 'bg-green-50 text-green-700')}
          {stat('Empty fields filled', results.filledFields, 'bg-gray-50 text-gray-700')}
          {stat('Contacts added', results.contactsAdded, 'bg-gray-50 text-gray-700')}
        </div>
        {results.distribution?.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">Cases per outlet</div>
            {results.distribution.map(d => (
              <div key={d.module + d.outlet} className="px-4 py-1.5 text-sm border-t border-gray-100 flex justify-between">
                <span>{d.module === 'insurance' ? '🛡️' : '🔧'} {d.outlet}</span><b>{d.count}</b>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">Existing customers were never overwritten — only empty fields were filled and new numbers added as extra contacts. All cases are unassigned in the chosen outlet for the team leader to distribute.</p>
        {results.notes.length > 0 && (
          <div className="border border-amber-200 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">Notes</div>
            {results.notes.map(n => (
              <div key={n.text} className="px-4 py-1.5 text-xs text-amber-800 border-t border-amber-100">{n.text} — <b>{n.count}</b></div>
            ))}
          </div>
        )}
        {results.errorDetails.length > 0 && (
          <div className="border border-red-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
            <div className="bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Rejected rows</div>
            {results.errorDetails.map((e, i) => (
              <div key={i} className="px-4 py-1.5 text-xs text-red-800 border-t border-red-100">Row {e.row}: {e.error}</div>
            ))}
          </div>
        )}
        <button onClick={reset} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl">Upload another file</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-800">
        <b>Outside Data</b> = purchased / external data (not your own dealership's sales, service or insurance).
        The <b>make is read from each row</b>, so one file can have Hyundai, Tata and other makes.
        Service cases are only created for makes your dealership handles; insurance cases for other makes are
        {meta.otherMakesInsurance ? ' kept.' : ' skipped (dealership setting).'}
      </div>

      {/* Step 1: details */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source / Vendor name *</label>
          <input list="outside-vendors" value={vendorName} onChange={e => setVendorName(e.target.value)} disabled={!!preview}
            placeholder="e.g. ABC Data Services"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
          <datalist id="outside-vendors">{meta.vendors.map(v => <option key={v} value={v} />)}</datalist>
          <p className="text-xs text-gray-400 mt-1">Used for tracking; the column mapping is remembered per vendor.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Use for *</label>
          <div className="flex gap-2">
            {useForOptions.map(u => (
              <button key={u.key} type="button" onClick={() => toggleUseFor(u.key)} title={u.hint}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${useFor.includes(u.key) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {useFor.includes(u.key) ? '☑ ' : '☐ '}{u.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Applies to the whole file.</p>
        </div>
      </div>

      {useFor.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {useFor.map(mod => {
            const opts = outletsOf(mod);
            return (
              <div key={mod}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{mod === 'insurance' ? '🛡️ Insurance' : '🔧 Service'} cases go to outlet *</label>
                {opts.length === 0 ? (
                  <div className="px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-700">No {mod} outlets available to you — ask Super Admin.</div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                    {opts.map(o => {
                      const pos = outletIds[mod].indexOf(o.id);
                      return (
                        <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={pos >= 0} onChange={() => toggleOutlet(mod, o.id)} />
                          {pos >= 0 && <span className="text-xs bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">{pos + 1}</span>}
                          <span className="text-gray-700">{outletLabel(o, meta.outlets)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {outletIds[mod].length > 1 ? (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1">
                    Cases are dealt out in turn: {[0, 1, 2, 3].map(i => `case ${i + 1} → ${outletName(outletIds[mod][i % outletIds[mod].length])}`).join(', ')}, … and so on.
                    Each outlet gets an equal share (difference of at most 1).
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Tick one or more outlets. Cases arrive unassigned; the team leader distributes them.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">File (.xlsx / .xls / .csv) *</label>
          <input type="file" accept=".xlsx,.xls,.csv" disabled={!!preview}
            onChange={e => setFile(e.target.files[0] || null)} className="text-sm" />
        </div>
        <button type="button" onClick={() => downloadTemplate(meta.fields)} className="text-sm text-blue-600 hover:underline">⬇ Download template</button>
        {!preview ? (
          <button onClick={loadPreview} disabled={busy}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {busy ? 'Reading…' : 'Next → Map columns'}
          </button>
        ) : (
          <button onClick={reset} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg">Change file</button>
        )}
      </div>

      {/* Step 2: mapping */}
      {preview && (
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
              Map columns — {preview.totalRows} rows {preview.usedSavedMapping && <span className="text-xs font-normal text-green-600">(saved mapping for this vendor loaded)</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-xs text-gray-500 font-semibold">
                    <td className="px-3 py-2">Column in file</td>
                    <td className="px-3 py-2">Sample</td>
                    <td className="px-3 py-2">ECRM field</td>
                  </tr>
                </thead>
                <tbody>
                  {preview.headers.map(h => (
                    <tr key={h} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 font-medium text-gray-800">{h}</td>
                      <td className="px-3 py-1.5 text-gray-500 text-xs truncate max-w-[200px]">{preview.sample[0]?.[h] || '—'}</td>
                      <td className="px-3 py-1.5">
                        <select value={mapping[h] || ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                          className={`w-full px-2 py-1 border rounded text-xs ${mapping[h] ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                          <option value="">— Ignore —</option>
                          {meta.fields
                            .filter(f => f.key === mapping[h] || !Object.entries(mapping).some(([col, v]) => col !== h && v === f.key))
                            .map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={process} disabled={busy}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
            {busy ? 'Uploading… this can take a few minutes' : `Upload ${preview.totalRows} rows`}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Batches & performance (also used in Reports) ────────────────────────────
export const OutsideBatches = ({ refreshKey = 0 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await outsideService.batches(); setData(res.data); }
    catch { toast.error('Failed to load batches'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const remove = async (b) => {
    if (!window.confirm(`Delete batch "${b.vendorName}" uploaded ${fmtDate(b.createdAt)}?\n\nOnly cases nobody has worked on are removed (no calls, not in a campaign). Cases already worked on are kept.`)) return;
    try {
      const res = await outsideService.deleteBatch(b.id);
      toast.success(res.data.message, { duration: 7000 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!data || data.batches.length === 0) {
    return <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">🌐</p><p className="text-sm">No outside data uploaded yet</p></div>;
  }

  // Per-vendor totals
  const vendors = {};
  for (const b of data.batches.filter(x => !x.deletedAt)) {
    const v = vendors[b.vendorName] || (vendors[b.vendorName] = { batches: 0, cases: 0, called: 0, connected: 0, converted: 0 });
    v.batches++;
    for (const m of ['insurance', 'service']) {
      v.cases += b[m].cases; v.called += b[m].called; v.connected += b[m].connected; v.converted += b[m].converted;
    }
  }

  const Perf = ({ p }) => (p.cases === 0 ? <span className="text-gray-300">—</span> : (
    <div className="text-xs leading-tight">
      <div><b>{p.cases}</b> cases · {p.assigned} assigned</div>
      <div className="text-gray-500">called {p.called} ({pct(p.called, p.cases)}) · connected {p.connected}</div>
      <div><span className="text-green-700 font-semibold">converted {p.converted} ({pct(p.converted, p.cases)})</span> · <span className="text-red-500">lost {p.lost}</span></div>
    </div>
  ));

  return (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">By vendor — is the purchased data worth it?</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 text-xs text-gray-500 font-semibold">
              <td className="px-4 py-2">Vendor</td><td className="px-3 py-2 text-right">Batches</td><td className="px-3 py-2 text-right">Cases</td>
              <td className="px-3 py-2 text-right">Called</td><td className="px-3 py-2 text-right">Connected</td><td className="px-3 py-2 text-right">Converted</td><td className="px-3 py-2 text-right">Conversion</td>
            </tr></thead>
            <tbody>
              {Object.entries(vendors).map(([name, v]) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-800">{name}</td>
                  <td className="px-3 py-2 text-right">{v.batches}</td><td className="px-3 py-2 text-right">{v.cases}</td>
                  <td className="px-3 py-2 text-right">{v.called}</td><td className="px-3 py-2 text-right">{v.connected}</td>
                  <td className="px-3 py-2 text-right text-green-700 font-semibold">{v.converted}</td>
                  <td className="px-3 py-2 text-right font-bold">{pct(v.converted, v.cases)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">Upload batches</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 text-xs text-gray-500 font-semibold">
              <td className="px-4 py-2">Batch</td><td className="px-3 py-2">Rows</td>
              <td className="px-3 py-2">🛡️ Insurance</td><td className="px-3 py-2">🔧 Service</td><td className="px-3 py-2"></td>
            </tr></thead>
            <tbody>
              {data.batches.map(b => (
                <tr key={b.id} className={`border-t border-gray-100 align-top ${b.deletedAt ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-800">{b.vendorName}</div>
                    <div className="text-xs text-gray-400">{fmtDate(b.createdAt)} · {b.uploadedBy}{b.fileName ? ` · ${b.fileName}` : ''}</div>
                    {b.deletedAt && <div className="text-xs text-red-500">Deleted {fmtDate(b.deletedAt)}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {b.totalRows} rows<br />{b.newCustomers} new · {b.existingCustomers} existing<br />
                    {b.rejectedRows > 0 && <span className="text-red-500">{b.rejectedRows} rejected</span>}
                  </td>
                  <td className="px-3 py-2"><Perf p={b.insurance} /></td>
                  <td className="px-3 py-2"><Perf p={b.service} /></td>
                  <td className="px-3 py-2 text-right">
                    {data.canDelete && !b.deletedAt && (
                      <button onClick={() => remove(b)} className="text-xs text-red-600 hover:underline whitespace-nowrap">Delete batch</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
const OutsideDataPage = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'batches' ? 'batches' : 'upload';
  const [meta, setMeta] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    outsideService.meta().then(res => setMeta(res.data)).catch(err => toast.error(err.response?.data?.error || 'Failed to load'));
  }, []);

  const canSeeBatches = ['manager', 'super_manager', 'team_leader', 'super_admin'].includes(user?.role) || meta?.canUpload;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">🌐 Outside Data</h1>
          <p className="text-sm text-gray-500">Purchased / external data from other sources — multi-make, tracked per vendor and batch</p>
        </div>
        <div className="flex gap-1 mb-4 bg-white rounded-xl shadow-sm p-1 w-fit">
          {[['upload', '📤 Upload'], ...(canSeeBatches ? [['batches', '📊 Batches & Performance']] : [])].map(([k, lbl]) => (
            <button key={k} onClick={() => setParams(k === 'upload' ? {} : { tab: k })}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {!meta ? <p className="text-sm text-gray-400">Loading…</p>
            : tab === 'batches' ? <OutsideBatches refreshKey={refreshKey} />
            : <UploadTab meta={meta} onUploaded={() => setRefreshKey(k => k + 1)} />}
        </div>
      </div>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
    </div>
  );
};

export default OutsideDataPage;
