import React, { useState, useEffect, useRef } from 'react';
import { campaignService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
const MODULE_COLORS = {
  insurance: 'bg-blue-100 text-blue-700',
  service:   'bg-green-100 text-green-700',
  psf:       'bg-purple-100 text-purple-700',
  both:      'bg-amber-100 text-amber-700',
};

// ── Create / Edit Modal ───────────────────────────────────────────────────────
const CampaignModal = ({ existing, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:        existing?.name || '',
    module:      existing?.module || 'insurance',
    startDate:   existing?.startDate ? existing.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
    endDate:     existing?.endDate   ? existing.endDate.split('T')[0]   : '',
    dailyTarget: existing?.dailyTargets?.dailyTarget || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error('Name, start date and end date are required.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await campaignService.update(existing.id, form);
        toast.success('Campaign updated.');
      } else {
        await campaignService.create(form);
        toast.success('Campaign created.');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{existing ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. June Insurance Push" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Module *</label>
            <div className="flex gap-2">
              {[['insurance', '🛡️ Insurance'], ['service', '🔧 Service'], ['psf', '⭐ PSF'], ['both', '🔀 Both']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, module: val }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${form.module === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Daily Conversion Target</label>
            <input type="number" min="1" value={form.dailyTarget} onChange={e => setForm(f => ({ ...f, dailyTarget: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. 10 conversions/day" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : existing ? 'Update Campaign' : 'Create Campaign'}
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Chassis Upload Modal ──────────────────────────────────────────────────────
const ChassisUploadModal = ({ campaign, onClose, onDone }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await campaignService.uploadChassis(campaign.id, fd);
      setResults(res.data.results);
      toast.success(`Tagged ${res.data.results.tagged} plans`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Upload Chassis List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">Upload an Excel/CSV with a <code className="bg-gray-100 px-1 rounded">chassis_number</code> column. All matching open <span className="font-medium">{campaign.module}</span> plans will be tagged to this campaign.</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
          Campaign: <strong>{campaign.name}</strong> · Module: {campaign.module}
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
          onChange={e => setFile(e.target.files[0])}
          className="w-full text-sm text-gray-600 mb-4 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />

        {!results ? (
          <button onClick={handleUpload} disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
            {loading ? 'Processing…' : 'Upload & Tag Plans'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-xl font-bold text-green-700">{results.tagged}</p><p className="text-xs text-green-600">Tagged</p></div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center"><p className="text-xl font-bold text-yellow-700">{results.notFound}</p><p className="text-xs text-yellow-600">Not Found</p></div>
              <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xl font-bold text-red-700">{results.errors}</p><p className="text-xs text-red-600">Errors</p></div>
            </div>
            <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl">Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Campaign Report Modal ─────────────────────────────────────────────────────
const CampaignReport = ({ campaign, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignService.getReport(campaign.id)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  if (loading) return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{campaign.name}</h2>
            <p className="text-xs text-gray-500">{fmt(campaign.startDate)} → {fmt(campaign.endDate)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {data && (
          <div className="p-6 space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-gray-900">{data.summary.total}</p><p className="text-xs text-gray-500">Plans Tagged</p></div>
              <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-700">{data.summary.conversions}</p><p className="text-xs text-green-600">Converted</p></div>
              <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-red-700">{data.summary.lost}</p><p className="text-xs text-red-600">Lost</p></div>
              <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-700">{data.summary.conversionRate}%</p><p className="text-xs text-blue-600">Conv Rate</p></div>
            </div>

            {/* Overall target progress */}
            {data.campaign.totalTarget > 0 && (
              <div className="border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">Overall Target Progress</p>
                  <p className="text-sm text-blue-700 font-bold">{data.summary.conversions} / {data.campaign.totalTarget}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(data.summary.progressVsTarget || 0, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{data.summary.progressVsTarget ?? 0}% of total target achieved</p>
              </div>
            )}

            {/* Daily breakdown */}
            {data.dailyBreakdown.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">Daily Breakdown</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 text-xs font-semibold uppercase">
                        <td className="px-4 py-2">Date</td>
                        <td className="px-4 py-2 text-right">Conversions</td>
                        {data.campaign.dailyTargets?.dailyTarget > 0 && (
                          <>
                            <td className="px-4 py-2 text-right">Target</td>
                            <td className="px-4 py-2 text-center">Status</td>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyBreakdown.map((day, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                          <td className="px-4 py-2.5 text-gray-700">{fmtShort(day.date)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{day.conversions}</td>
                          {data.campaign.dailyTargets?.dailyTarget > 0 && (
                            <>
                              <td className="px-4 py-2.5 text-right text-gray-500">{day.target}</td>
                              <td className="px-4 py-2.5 text-center">
                                {day.achieved === null ? <span className="text-gray-300">—</span>
                                  : day.achieved
                                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Met</span>
                                    : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">✗ Missed</span>}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Campaign Card ─────────────────────────────────────────────────────────────
const CampaignCard = ({ campaign, onEdit, onUpload, onReport, onToggle }) => {
  const now   = new Date();
  const start = new Date(campaign.startDate);
  const end   = new Date(campaign.endDate);
  const isActive   = campaign.isActive && now >= start && now <= end;
  const isUpcoming = campaign.isActive && now < start;
  const isEnded    = now > end;
  const tagCount   = campaign._count?.planTags || 0;

  const statusBadge = isActive
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">🟢 Active</span>
    : isUpcoming
    ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">⏳ Upcoming</span>
    : isEnded
    ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">✓ Ended</span>
    : <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-medium">⏸ Paused</span>;

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${campaign.isActive ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'} p-5`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-sm">{campaign.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${MODULE_COLORS[campaign.module] || 'bg-gray-100 text-gray-600'}`}>
              {campaign.module}
            </span>
            {statusBadge}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {fmt(campaign.startDate)} → {fmt(campaign.endDate)} · by {campaign.createdBy?.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => onEdit(campaign)} className="text-xs px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg">✏️</button>
          <button onClick={() => onToggle(campaign)} className="text-xs px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg" title={campaign.isActive ? 'Pause' : 'Resume'}>
            {campaign.isActive ? '⏸' : '▶️'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{tagCount}</p>
          <p className="text-xs text-gray-400">Plans Tagged</p>
        </div>
        {campaign.dailyTargets?.dailyTarget && (
          <div className="text-center">
            <p className="text-xl font-bold text-blue-700">{campaign.dailyTargets.dailyTarget}</p>
            <p className="text-xs text-gray-400">Daily Target</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onUpload(campaign)}
          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-2 rounded-lg transition-colors">
          📤 Upload Chassis
        </button>
        <button onClick={() => onReport(campaign)}
          className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-lg transition-colors">
          📊 Report
        </button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const loadCampaigns = async () => {
    try {
      const r = await campaignService.list();
      setCampaigns(r.data.campaigns || []);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleToggle = async (campaign) => {
    try {
      await campaignService.update(campaign.id, { isActive: !campaign.isActive });
      toast.success(campaign.isActive ? 'Campaign paused.' : 'Campaign resumed.');
      loadCampaigns();
    } catch {
      toast.error('Failed to update campaign.');
    }
  };

  const active   = campaigns.filter(c => c.isActive && new Date() >= new Date(c.startDate) && new Date() <= new Date(c.endDate));
  const upcoming = campaigns.filter(c => c.isActive && new Date() < new Date(c.startDate));
  const ended    = campaigns.filter(c => !c.isActive || new Date() > new Date(c.endDate));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm text-gray-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
            + New Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <p className="text-5xl mb-4">🎯</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No campaigns yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create a campaign to track conversion targets and tag plans for focused follow-up.</p>
            <button onClick={() => setShowCreate(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">🟢 Active ({active.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active.map(c => <CampaignCard key={c.id} campaign={c} onEdit={setEditTarget} onUpload={setUploadTarget} onReport={setReportTarget} onToggle={handleToggle} />)}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">⏳ Upcoming ({upcoming.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcoming.map(c => <CampaignCard key={c.id} campaign={c} onEdit={setEditTarget} onUpload={setUploadTarget} onReport={setReportTarget} onToggle={handleToggle} />)}
                </div>
              </div>
            )}
            {ended.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">✓ Ended / Paused ({ended.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ended.map(c => <CampaignCard key={c.id} campaign={c} onEdit={setEditTarget} onUpload={setUploadTarget} onReport={setReportTarget} onToggle={handleToggle} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && <CampaignModal onClose={() => setShowCreate(false)} onSaved={loadCampaigns} />}
      {editTarget && <CampaignModal existing={editTarget} onClose={() => setEditTarget(null)} onSaved={loadCampaigns} />}
      {uploadTarget && <ChassisUploadModal campaign={uploadTarget} onClose={() => setUploadTarget(null)} onDone={loadCampaigns} />}
      {reportTarget && <CampaignReport campaign={reportTarget} onClose={() => setReportTarget(null)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
    </div>
  );
};

export default CampaignsPage;
