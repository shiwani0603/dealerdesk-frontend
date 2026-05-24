import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService, insuranceService, serviceService, psfService } from '../services/api';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import QuickLogModal from '../components/QuickLogModal';
import toast from 'react-hot-toast';
import { InsurancePlanTable, ServicePlanTable, PsfPlanTable } from '../components/PlanCards';
import SearchModal from '../components/SearchModal';
import Navbar from '../components/Navbar';

const StatCard = ({ title, value, color, icon }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

const LogCallModal = ({ plan, module, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    callOutcome: '',
    callRemark: '',
    notes: '',
    nextFollowupDate: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'self_visit',
    newMobileAdded: '',
    paymentMode: 'online',
  });
  const [loading, setLoading] = useState(false);

  const openOutcomes = [
    { value: 'appointment_fixed', label: '📅 Appointment Fixed' },
    { value: 'appointment_discussion', label: '💬 Appointment Discussion' },
    { value: 'interested_follow_up', label: '👍 Interested — Follow Up' },
    { value: 'not_interested_follow_up', label: '👎 Not Interested — Follow Up' },
    { value: 'not_connected', label: '📵 Not Connected' },
    ...(module === 'insurance' ? [{ value: 'payment_received_policy_pending', label: '💰 Payment Received — Policy Pending' }] : []),
  ];

  const closedOutcomes = [
    { value: 'lost_done_elsewhere', label: '❌ Lost — Done Elsewhere' },
    ...(module === 'service' ? [{ value: 'vehicle_reported', label: '✅ Vehicle Reported at Dealership' }] : []),
    { value: 'invalid_data', label: '⚠️ Invalid Data' },
    ...(module === 'insurance' ? [{ value: 'payment_received_policy_done', label: '✅ Payment Received — Policy Done' }] : []),
  ];

  const remarkOptions = {
    not_connected: ['Number Busy', 'Switched Off', 'Ringing No Answer'],
    invalid_data: ['Wrong Number', 'No Such Customer'],
  };

  const isClosingOutcome = ['lost_done_elsewhere', 'vehicle_reported', 'invalid_data', 'payment_received_policy_done'].includes(form.callOutcome);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.callOutcome) { toast.error('Please select a call outcome'); return; }
    setLoading(true);
    try {
      const logData = { ...form, dealershipId: plan?.dealershipId };
      if (module === 'insurance') {
        await insuranceService.logCall(plan.id, logData);
      } else {
        await serviceService.logCall(plan.id, logData);
      }
      toast.success('Follow-up logged successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log follow-up');
    } finally {
      setLoading(false);
    }
  };

  const customer = plan?.customer;
  const primaryMobile = customer?.contacts?.find(c => c.contactType === 'mobile' && c.isPrimary)?.value
    || customer?.contacts?.find(c => c.contactType === 'mobile')?.value;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Log Follow-up Call</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          {/* Customer info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{customer?.name}</p>
                <p className="text-sm text-gray-500">{customer?.registrationNumber} • {customer?.make} {customer?.model}</p>
              </div>
              {primaryMobile && (
                <a href={`tel:${primaryMobile}`} className="text-green-500 text-2xl">📞</a>
              )}
            </div>
            {primaryMobile && (
              <p className="text-sm text-blue-600 font-medium mt-1">{primaryMobile}</p>
            )}
            {customer?.stickyNote && (
              <p className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded-lg">
                📌 {customer.stickyNote}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Call Outcome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome *</label>
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Open — plan stays open</p>
              <div className="space-y-1 mb-3">
                {openOutcomes.map(o => (
                  <button key={o.value} type="button"
                    onClick={() => setForm({ ...form, callOutcome: o.value })}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                      form.callOutcome === o.value ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >{o.label}</button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Close plan</p>
              <div className="space-y-1">
                {closedOutcomes.map(o => (
                  <button key={o.value} type="button"
                    onClick={() => setForm({ ...form, callOutcome: o.value })}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                      form.callOutcome === o.value ? 'bg-red-600 text-white font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >{o.label}</button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            {remarkOptions[form.callOutcome] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                <div className="flex gap-2 flex-wrap">
                  {remarkOptions[form.callOutcome].map(r => (
                    <button key={r} type="button"
                      onClick={() => setForm({ ...form, callRemark: r })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        form.callRemark === r ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment mode for payment outcomes */}
            {(form.callOutcome === 'payment_received_policy_pending' || form.callOutcome === 'payment_received_policy_done') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <div className="flex gap-2">
                  {['online', 'cash', 'cheque'].map(m => (
                    <button key={m} type="button"
                      onClick={() => setForm({ ...form, paymentMode: m })}
                      className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${
                        form.paymentMode === m ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >{m}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Appointment */}
            {form.callOutcome === 'appointment_fixed' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                    <input type="date" value={form.appointmentDate}
                      onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" value={form.appointmentTime}
                      onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                {module === 'service' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setForm({ ...form, appointmentType: 'self_visit' })}
                        className={`flex-1 py-2 rounded-lg text-sm ${form.appointmentType === 'self_visit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        🏃 Self Visit
                      </button>
                      <button type="button" onClick={() => setForm({ ...form, appointmentType: 'pickup' })}
                        className={`flex-1 py-2 rounded-lg text-sm ${form.appointmentType === 'pickup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        🚗 Pickup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next followup */}
            {!isClosingOutcome && form.callOutcome !== 'appointment_fixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up Date</label>
                <input type="date" value={form.nextFollowupDate}
                  onChange={(e) => setForm({ ...form, nextFollowupDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={2} placeholder="What was discussed..." />
            </div>

            {/* New mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Mobile (if customer gave)</label>
              <input type="tel" value={form.newMobileAdded}
                onChange={(e) => setForm({ ...form, newMobileAdded: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Enter new mobile number" />
            </div>

            <button type="submit" disabled={loading || !form.callOutcome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Follow-up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const CeiButton = ({ value, selected, onClick }) => (
  <button type="button" onClick={() => onClick(value)}
    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${selected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
    {value}
  </button>
);

const PsfLogModal = ({ plan, onClose, onSuccess }) => {
  const [callOutcome, setCallOutcome] = useState('');
  const [notSatisfiedReason, setNotSatisfiedReason] = useState('');
  const [cei, setCei] = useState({ overallCei: null, performanceCei: null, retentionCei: null, attributeCei: null, transparencyCei: null, explanationCei: null });
  const [npsScore, setNpsScore] = useState(null);
  const [loading, setLoading] = useState(false);

  const customer = plan?.customer || {};
  const primaryMobile = customer?.contacts?.find(c => c.contactType === 'mobile' && c.isPrimary)?.value
    || customer?.contacts?.find(c => c.contactType === 'mobile')?.value;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!callOutcome) { toast.error('Please select a call outcome'); return; }
    if (callOutcome === 'not_satisfied' && !notSatisfiedReason.trim()) { toast.error('Please enter a reason for dissatisfaction'); return; }
    setLoading(true);
    try {
      await psfService.logCall(plan.id, {
        callOutcome,
        notSatisfiedReason: callOutcome === 'not_satisfied' ? notSatisfiedReason : undefined,
        ...(callOutcome === 'satisfied' && {
          overallCei: cei.overallCei,
          performanceCei: cei.performanceCei,
          retentionCei: cei.retentionCei,
          attributeCei: cei.attributeCei,
          transparencyCei: cei.transparencyCei,
          explanationCei: cei.explanationCei,
          npsScore,
        }),
      });
      toast.success(callOutcome === 'satisfied' ? 'PSF complete — customer satisfied!' : callOutcome === 'not_satisfied' ? 'PSF logged — team notified.' : 'Call logged — will retry.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log PSF call');
    } finally {
      setLoading(false);
    }
  };

  const ceiFields = [
    { key: 'overallCei', label: 'Overall CEI' },
    { key: 'performanceCei', label: 'Performance' },
    { key: 'retentionCei', label: 'Retention' },
    { key: 'attributeCei', label: 'Attribute' },
    { key: 'transparencyCei', label: 'Transparency' },
    { key: 'explanationCei', label: 'Explanation' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-lg">⭐</div>
              <h2 className="text-lg font-bold text-gray-900">PSF Call Log</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          {/* Customer info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.registrationNumber} • {customer.make} {customer.model}</p>
              </div>
              {primaryMobile && <a href={`tel:${primaryMobile}`} className="text-green-500 text-2xl">📞</a>}
            </div>
            {primaryMobile && <p className="text-sm text-blue-600 font-medium mt-1">{primaryMobile}</p>}
            {plan?.serviceRecord && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-3 text-xs text-gray-500">
                <span>📅 {plan.serviceRecord.serviceDate ? new Date(plan.serviceRecord.serviceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span>
                {plan.serviceRecord.jobCardNumber && <span>📋 {plan.serviceRecord.jobCardNumber}</span>}
                {(plan.serviceAdviserName || plan.serviceRecord.serviceAdviserName) && <span>👤 {plan.serviceAdviserName || plan.serviceRecord.serviceAdviserName}</span>}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Outcome buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome *</label>
              <div className="space-y-2">
                <button type="button" onClick={() => setCallOutcome('satisfied')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${callOutcome === 'satisfied' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}>
                  <span className="text-xl">✅</span>
                  <div>
                    <div>Customer Satisfied</div>
                    <div className={`text-xs mt-0.5 ${callOutcome === 'satisfied' ? 'text-green-100' : 'text-green-500'}`}>Plan will be closed</div>
                  </div>
                </button>
                <button type="button" onClick={() => setCallOutcome('not_satisfied')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${callOutcome === 'not_satisfied' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}`}>
                  <span className="text-xl">❌</span>
                  <div>
                    <div>Customer Not Satisfied</div>
                    <div className={`text-xs mt-0.5 ${callOutcome === 'not_satisfied' ? 'text-red-100' : 'text-red-500'}`}>Service team will be notified</div>
                  </div>
                </button>
                <button type="button" onClick={() => setCallOutcome('not_connected')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${callOutcome === 'not_connected' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <span className="text-xl">📵</span>
                  <div>Not Connected</div>
                </button>
              </div>
            </div>

            {/* Not satisfied reason */}
            {callOutcome === 'not_satisfied' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Dissatisfaction *</label>
                <textarea value={notSatisfiedReason} onChange={e => setNotSatisfiedReason(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-red-300"
                  rows={3} placeholder="Describe the customer's complaint or concern..." />
              </div>
            )}

            {/* CEI scores (only when satisfied) */}
            {callOutcome === 'satisfied' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">CEI Scores (1–5) <span className="text-gray-400 font-normal">optional</span></p>
                <div className="grid grid-cols-1 gap-3">
                  {ceiFields.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 w-28">{label}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(v => (
                          <CeiButton key={v} value={v} selected={cei[key] === v} onClick={(val) => setCei(prev => ({ ...prev, [key]: prev[key] === val ? null : val }))} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">NPS Score (0–10) <span className="text-gray-400 font-normal">optional</span></p>
                  <div className="flex gap-1 flex-wrap">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                      <button key={v} type="button" onClick={() => setNpsScore(prev => prev === v ? null : v)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${npsScore === v ? (v >= 9 ? 'bg-green-600 text-white' : v >= 7 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">0–6 Detractor · 7–8 Passive · 9–10 Promoter</p>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !callOutcome}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Saving...' : 'Save PSF Log'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const TelecallerDashboard = () => {
  useAuth();
  const [stats, setStats] = useState(null);
  const [insurancePlans, setInsurancePlans] = useState({ today: [], overdue: [], redAlert: [] });
  const [servicePlans, setServicePlans] = useState({ today: [], overdue: [], redAlert: [] });
  const [psfPlans, setPsfPlans] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  const [activeModule, setActiveModule] = useState('insurance');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [quickLogPlan, setQuickLogPlan] = useState(null);
  const [psfLogPlan, setPsfLogPlan] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);


  const loadData = async () => {
    try {
      const [statsRes, insRes, svcRes, psfRes] = await Promise.all([
        dashboardService.getTelecaller().catch(() => ({ data: {} })),
        insuranceService.getMyPlans().catch(() => ({ data: { today: [], overdue: [], redAlert: [] } })),
        serviceService.getMyPlans().catch(() => ({ data: { today: [], overdue: [], redAlert: [] } })),
        psfService.getMyPlans().catch(() => ({ data: { plans: [] } })),
      ]);
      setStats(statsRes.data);
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

  const handleOpenDetail = (plan, module) => {
    setSelectedCustomer({ customerId: plan?.customerId, planId: plan.id, planType: module, plan });
  };

  const handleQuickLog = (plan, module) => {
    if (module === 'psf') {
      setPsfLogPlan(plan);
    } else {
      setQuickLogPlan({ plan, module });
    }
  };

  const currentPlans = activeModule === 'insurance' ? insurancePlans : servicePlans;
  const displayPlans = activeTab === 'today' ? currentPlans.today :
    activeTab === 'overdue' ? currentPlans.overdue : currentPlans.redAlert;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
    <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Today's Plans" value={(stats?.insurance?.today || 0) + (stats?.service?.today || 0)} color="border-blue-500" icon="📋" />
          <StatCard title="Overdue" value={(stats?.insurance?.overdue || 0) + (stats?.service?.overdue || 0)} color="border-orange-500" icon="⚠️" />
          <StatCard title="Red Alert" value={(stats?.insurance?.redAlert || 0) + (stats?.service?.redAlert || 0)} color="border-red-500" icon="🔴" />
          <StatCard title="Conversions" value={(stats?.insurance?.conversionsThisMonth || 0) + (stats?.service?.conversionsThisMonth || 0)} color="border-green-500" icon="✅" />
        </div>

        {/* Module tabs */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4">
          <button onClick={() => setActiveModule('insurance')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeModule === 'insurance' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            🛡️ Insurance ({(insurancePlans.today?.length || 0) + (insurancePlans.overdue?.length || 0)})
          </button>
          <button onClick={() => setActiveModule('service')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeModule === 'service' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            🔧 Service ({(servicePlans.today?.length || 0) + (servicePlans.overdue?.length || 0)})
          </button>
          <button onClick={() => setActiveModule('psf')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeModule === 'psf' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            ⭐ PSF ({psfPlans.length})
          </button>
        </div>

        {/* Plan sub-tabs (only for insurance/service) */}
        {activeModule !== 'psf' && (
          <div className="flex gap-2 mb-4">
            {['today', 'overdue', 'redAlert'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm'}`}>
                {tab === 'today' ? `Today (${currentPlans.today?.length || 0})` :
                 tab === 'overdue' ? `Overdue (${currentPlans.overdue?.length || 0})` :
                 `Red Alert (${currentPlans.redAlert?.length || 0})`}
              </button>
            ))}
          </div>
        )}

        {/* Plans list */}
        <div className="space-y-3">
          {activeModule === 'psf' ? (
            <PsfPlanTable plans={psfPlans} onQuickLog={handleQuickLog} />
          ) : displayPlans?.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center shadow-sm">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-gray-500 font-medium">No plans in this category</p>
              <p className="text-gray-400 text-sm mt-1">Check other tabs or modules</p>
            </div>
          ) : activeModule === 'insurance' ? (
            <InsurancePlanTable plans={displayPlans} onOpenDetail={handleOpenDetail} onQuickLog={handleQuickLog} />
          ) : (
            <ServicePlanTable plans={displayPlans} onOpenDetail={handleOpenDetail} onQuickLog={handleQuickLog} />
          )}
        </div>
      </div>

      {/* Customer Detail Panel */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customerId={selectedCustomer.customerId}
          planId={selectedCustomer.planId}
          planType={selectedCustomer.planType}
          onClose={() => setSelectedCustomer(null)}
          onLogCall={(plan, module) => {
            setSelectedCustomer(null);
            setSelectedPlan({ plan, module });
          }}
        />
      )}

      {/* Log Call Modal */}
      {selectedPlan && (
        <LogCallModal
          plan={selectedPlan.plan}
          module={selectedPlan.module}
          onClose={() => setSelectedPlan(null)}
          onSuccess={loadData}
        />
      )}
      {quickLogPlan && (
  <QuickLogModal
    plan={quickLogPlan.plan}
    module={quickLogPlan.module}
    onClose={() => setQuickLogPlan(null)}
    onSuccess={loadData}
    onFullLog={(plan, module) => setSelectedPlan({ plan, module })}
  />
)}
{psfLogPlan && (
  <PsfLogModal
    plan={psfLogPlan}
    onClose={() => setPsfLogPlan(null)}
    onSuccess={loadData}
  />
)}
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

export default TelecallerDashboard;
