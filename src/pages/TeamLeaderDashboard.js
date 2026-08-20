import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService, insuranceService, serviceService, psfService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import QuickLogModal from '../components/QuickLogModal';
import { InsurancePlanTable, ServicePlanTable, PsfPlanTable } from '../components/PlanCards';
import toast from 'react-hot-toast';

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

const TransferModal = ({ plan, module, telecallers, onClose, onSuccess }) => {
  const [selectedTc, setSelectedTc] = useState(plan?.assignedToUserId || '');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!selectedTc) { toast.error('Please select a telecaller'); return; }
    setLoading(true);
    try {
      if (module === 'insurance') await insuranceService.transferPlan(plan.id, selectedTc);
      else await serviceService.transferPlan(plan.id, selectedTc);
      toast.success('Plan transferred successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Transfer Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="font-semibold text-gray-900">{plan?.customer?.name}</p>
          <p className="text-sm text-gray-500">{plan?.customer?.registrationNumber} • {plan?.customer?.make} {plan?.customer?.model}</p>
          {plan?.assignedTo && (
            <p className="text-xs text-orange-600 mt-1">Currently: {plan.assignedTo.name}</p>
          )}
          {!plan?.assignedTo && (
            <p className="text-xs text-gray-400 mt-1">Currently: Unassigned</p>
          )}
        </div>
        <p className="text-sm font-medium text-gray-700 mb-2">Assign to:</p>
        <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto">
          {telecallers.map(tc => (
            <button key={tc.id} onClick={() => setSelectedTc(tc.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                selectedTc === tc.id ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              👤 {tc.name}
              {tc.id === plan?.assignedToUserId && <span className="ml-2 text-xs opacity-70">(current)</span>}
            </button>
          ))}
          {telecallers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No telecallers in your team</p>
          )}
        </div>
        <button onClick={handleTransfer} disabled={loading || !selectedTc || selectedTc === plan?.assignedToUserId}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
          {loading ? 'Transferring...' : 'Transfer Plan'}
        </button>
      </div>
    </div>
  );
};

const TeamLeaderDashboard = () => {
  const { user } = useAuth();
  const showInsurance = !user?.moduleRights || user?.moduleRights === 'insurance' || user?.moduleRights === 'both';
  const showService   = !user?.moduleRights || user?.moduleRights === 'service'   || user?.moduleRights === 'both';
  const showPsf       = !user?.moduleRights || user?.moduleRights === 'both';

  const [teamStats, setTeamStats] = useState(null);
  const [insurancePlans, setInsurancePlans] = useState({ today: [], overdue: [], redAlert: [] });
  const [servicePlans, setServicePlans] = useState({ today: [], overdue: [], redAlert: [] });
  const [psfPlans, setPsfPlans] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeTab, setActiveTab] = useState('overdue');
  const [catFilter, setCatFilter] = useState('ALL');
  const [lapsingSoonPlans, setLapsingSoonPlans] = useState({ insurance: [], service: [] });
  const [lapsingSoonDays, setLapsingSoonDays] = useState(30);
  const [lapsingSoonLoading, setLapsingSoonLoading] = useState(false);
  const [pipelinePlans, setPipelinePlans] = useState({ insurance: [], service: [] });
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickLogPlan, setQuickLogPlan] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const telecallers = (teamStats?.telecallerStats || []).map(s => s.telecaller);

  const loadData = async () => {
    try {
      const [tlRes, insRes, svcRes, psfRes] = await Promise.all([
        dashboardService.getTeamLeader().catch(() => ({ data: {} })),
        insuranceService.getMyPlans().catch(() => ({ data: { today: [], overdue: [], redAlert: [] } })),
        serviceService.getMyPlans().catch(() => ({ data: { today: [], overdue: [], redAlert: [] } })),
        psfService.getMyPlans().catch(() => ({ data: { plans: [] } })),
      ]);
      setTeamStats(tlRes.data);
      setInsurancePlans(insRes.data);
      setServicePlans(svcRes.data);
      setPsfPlans(psfRes.data?.plans || []);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const loadPipeline = async () => {
    setPipelineLoading(true);
    try {
      const [insRes, svcRes] = await Promise.all([
        insuranceService.getPipeline().catch(() => ({ data: { plans: [] } })),
        serviceService.getPipeline().catch(() => ({ data: { plans: [] } })),
      ]);
      setPipelinePlans({ insurance: insRes.data.plans || [], service: svcRes.data.plans || [] });
    } catch {
      toast.error('Failed to load pipeline');
    } finally {
      setPipelineLoading(false);
    }
  };

  const loadLapsingSoon = async (days) => {
    setLapsingSoonLoading(true);
    try {
      const [insRes, svcRes] = await Promise.all([
        insuranceService.getLapsingSoon(days).catch(() => ({ data: { plans: [] } })),
        serviceService.getLapsingSoon(days).catch(() => ({ data: { plans: [] } })),
      ]);
      setLapsingSoonPlans({ insurance: insRes.data.plans || [], service: svcRes.data.plans || [] });
    } catch {
      toast.error('Failed to load lapsing soon plans');
    } finally {
      setLapsingSoonLoading(false);
    }
  };

  const currentPlans = activeSection === 'insurance' ? insurancePlans : servicePlans;
  const rawPlans = activeTab === 'lapsingSoon'
    ? (activeSection === 'insurance' ? lapsingSoonPlans.insurance : lapsingSoonPlans.service)
    : activeTab === 'pipeline'
    ? (activeSection === 'insurance' ? pipelinePlans.insurance : pipelinePlans.service)
    : activeTab === 'today' ? currentPlans.today
    : activeTab === 'overdue' ? currentPlans.overdue
    : currentPlans.redAlert;
  const displayPlans = catFilter === 'ALL' ? rawPlans : (rawPlans || []).filter(p => p?.renewalCategory === catFilter);

  const totalInsToday = (insurancePlans.today?.length || 0);
  const totalInsOverdue = (insurancePlans.overdue?.length || 0);
  const totalSvcToday = (servicePlans.today?.length || 0);
  const totalSvcOverdue = (servicePlans.overdue?.length || 0);
  const unassigned = teamStats?.unassigned || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard title="Ins Today" value={totalInsToday} color="border-blue-500" icon="🛡️" />
          <StatCard title="Ins Overdue" value={totalInsOverdue} color="border-orange-500" icon="⚠️" />
          <StatCard title="Svc Today" value={totalSvcToday} color="border-green-500" icon="🔧" />
          <StatCard title="Svc Overdue" value={totalSvcOverdue} color="border-red-500" icon="⚠️" />
          <StatCard
            title="Unassigned"
            value={(unassigned.insurance || 0) + (unassigned.service || 0)}
            sub={`${unassigned.insurance || 0} ins · ${unassigned.service || 0} svc`}
            color="border-purple-500"
            icon="📥"
          />
        </div>

        {/* Section tabs */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4">
          <button onClick={() => setActiveSection('overview')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeSection === 'overview' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            👥 Team Overview
          </button>
          {showInsurance && (
            <button onClick={() => setActiveSection('insurance')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeSection === 'insurance' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              🛡️ Insurance ({totalInsToday + totalInsOverdue})
            </button>
          )}
          {showService && (
            <button onClick={() => setActiveSection('service')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeSection === 'service' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              🔧 Service ({totalSvcToday + totalSvcOverdue})
            </button>
          )}
          {showPsf && (
            <button onClick={() => setActiveSection('psf')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeSection === 'psf' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              ⭐ PSF ({psfPlans.length})
            </button>
          )}
        </div>

        {/* Team Overview */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            {/* Per-telecaller table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Team Performance — Today</h3>
              </div>
              {(teamStats?.telecallerStats || []).length === 0 ? (
                <div className="p-10 text-center text-gray-400">No telecallers in your team</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telecaller</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-500 uppercase tracking-wider">Ins Today</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-orange-500 uppercase tracking-wider">Ins Overdue</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-green-500 uppercase tracking-wider">Svc Today</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-red-400 uppercase tracking-wider">Svc Overdue</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversions MTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teamStats.telecallerStats.map((row, i) => (
                      <tr key={row.telecaller.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-gray-900">{row.telecaller.name}</p>
                          {row.telecaller.mobile && <p className="text-xs text-gray-400">{row.telecaller.mobile}</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${row.insurance.today > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{row.insurance.today}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${row.insurance.overdue > 0 ? 'text-orange-500' : 'text-gray-300'}`}>{row.insurance.overdue}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${row.service.today > 0 ? 'text-green-600' : 'text-gray-300'}`}>{row.service.today}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${row.service.overdue > 0 ? 'text-red-500' : 'text-gray-300'}`}>{row.service.overdue}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-gray-700">
                            {(row.insurance.conversionsThisMonth || 0) + (row.service.conversionsThisMonth || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Unassigned plans callout */}
            {((unassigned.insurance || 0) + (unassigned.service || 0)) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📥</span>
                  <div>
                    <p className="font-semibold text-amber-800">
                      {(unassigned.insurance || 0) + (unassigned.service || 0)} unassigned plans
                    </p>
                    <p className="text-sm text-amber-600">
                      {unassigned.insurance || 0} insurance · {unassigned.service || 0} service — assign these to telecallers
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {unassigned.insurance > 0 && (
                    <button onClick={() => { setActiveSection('insurance'); setActiveTab('overdue'); }}
                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium">
                      View Ins
                    </button>
                  )}
                  {unassigned.service > 0 && (
                    <button onClick={() => { setActiveSection('service'); setActiveTab('overdue'); }}
                      className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium">
                      View Svc
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insurance / Service plans */}
        {(activeSection === 'insurance' || activeSection === 'service') && (
          <>
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { key: 'today',       label: `Today (${currentPlans.today?.length || 0})` },
                { key: 'overdue',     label: `Overdue (${currentPlans.overdue?.length || 0})` },
                { key: 'redAlert',    label: `Red Alert (${currentPlans.redAlert?.length || 0})` },
                { key: 'pipeline',    label: '📦 Pipeline' },
                { key: 'lapsingSoon', label: '⏰ Lapsing Soon' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => {
                  setActiveTab(key); setCatFilter('ALL');
                  if (key === 'lapsingSoon') loadLapsingSoon(lapsingSoonDays);
                  if (key === 'pipeline') loadPipeline();
                }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === key
                      ? key === 'lapsingSoon' ? 'bg-orange-500 text-white' : 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'lapsingSoon' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500 font-medium">Expiring within:</span>
                {[15, 30].map(d => (
                  <button key={d} onClick={() => { setLapsingSoonDays(d); loadLapsingSoon(d); }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      lapsingSoonDays === d ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                    }`}>
                    {d} days
                  </button>
                ))}
                {lapsingSoonLoading && <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />}
              </div>
            )}

            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'ALL',         label: 'All' },
                { key: 'OWN_RENEWAL', label: 'Own Service', color: 'bg-green-100 text-green-700 border-green-300' },
                { key: 'COMPETITOR',  label: 'Competitor',  color: 'bg-amber-100 text-amber-700 border-amber-300' },
                { key: 'LAPSED',      label: 'Lapsed',      color: 'bg-red-100 text-red-700 border-red-300' },
                { key: 'NEW',         label: 'Own Service', color: 'bg-green-100 text-green-700 border-green-300' },
              ].map(({ key, label, color }) => {
                const count = key === 'ALL' ? (rawPlans?.length || 0) : (rawPlans || []).filter(p => p?.renewalCategory === key).length;
                return (
                  <button key={key} onClick={() => setCatFilter(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      catFilter === key
                        ? (color || 'bg-gray-900 text-white border-gray-900')
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    {label} {count > 0 && <span className="opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>

            {(lapsingSoonLoading && activeTab === 'lapsingSoon') || (pipelineLoading && activeTab === 'pipeline') ? (
              <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading…</p>
              </div>
            ) : displayPlans?.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                <p className="text-4xl mb-3">{activeTab === 'lapsingSoon' ? '✅' : activeTab === 'pipeline' ? '📭' : '🎉'}</p>
                <p className="text-gray-500 font-medium">
                  {activeTab === 'lapsingSoon' ? `No plans expiring in ${lapsingSoonDays} days` :
                   activeTab === 'pipeline' ? 'No upcoming plans in the pipeline' :
                   'No plans in this category'}
                </p>
                {activeTab === 'pipeline' && <p className="text-gray-400 text-sm mt-1">Plans will appear here once service/insurance data is uploaded</p>}
              </div>
            ) : activeSection === 'insurance' ? (
              <InsurancePlanTable
                plans={displayPlans}
                onOpenDetail={(plan, module) => setSelectedCustomer({ customerId: plan?.customerId, planId: plan.id, planType: module, plan })}
                onQuickLog={(plan, module) => setQuickLogPlan({ plan, module })}
                onTransfer={(plan, module) => setTransferTarget({ plan, module })}
              />
            ) : (
              <ServicePlanTable
                plans={displayPlans}
                onOpenDetail={(plan, module) => setSelectedCustomer({ customerId: plan?.customerId, planId: plan.id, planType: module, plan })}
                onQuickLog={(plan, module) => setQuickLogPlan({ plan, module })}
                onTransfer={(plan, module) => setTransferTarget({ plan, module })}
              />
            )}
          </>
        )}

        {/* PSF plans */}
        {activeSection === 'psf' && (
          <PsfPlanTable plans={psfPlans} onQuickLog={(plan) => toast('Use PSF log from your telecaller view')} />
        )}
      </div>

      {/* Customer Detail Panel */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customerId={selectedCustomer.customerId}
          planId={selectedCustomer.planId}
          planType={selectedCustomer.planType}
          onClose={() => setSelectedCustomer(null)}
          onLogCall={() => setSelectedCustomer(null)}
        />
      )}

      {/* Quick Log Modal */}
      {quickLogPlan && (
        <QuickLogModal
          plan={quickLogPlan.plan}
          module={quickLogPlan.module}
          onClose={() => setQuickLogPlan(null)}
          onSuccess={loadData}
          onFullLog={() => setQuickLogPlan(null)}
        />
      )}

      {/* Transfer Modal */}
      {transferTarget && (
        <TransferModal
          plan={transferTarget.plan}
          module={transferTarget.module}
          telecallers={telecallers}
          onClose={() => setTransferTarget(null)}
          onSuccess={loadData}
        />
      )}

      {/* Search */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelectCustomer={(customerId) => {
            setSelectedCustomer({ customerId, planId: null, planType: null });
          }}
        />
      )}
    </div>
  );
};

export default TeamLeaderDashboard;
