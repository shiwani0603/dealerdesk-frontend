import React, { useState } from 'react';
import { insuranceService, serviceService } from '../services/api';
import toast from 'react-hot-toast';

const QuickLogModal = ({ plan, module, onClose, onSuccess, onFullLog }) => {
 const [form, setForm] = useState({
  callOutcome: '',
  callRemark: '',
  notes: '',
  nextFollowupDate: '',
  appointmentDate: '',
});
  const [loading, setLoading] = useState(false);

  const customer = plan?.customer || {};
  const primaryMobile = customer.contacts?.find(c => c.contactType === 'mobile' && c.isPrimary)?.value
    || customer.contacts?.find(c => c.contactType === 'mobile')?.value;

  const allOutcomes = [
    { value: 'appointment_fixed', label: '📅 Appointment Fixed', closes: false },
    { value: 'appointment_discussion', label: '💬 Appointment Discussion', closes: false },
    { value: 'interested_follow_up', label: '👍 Interested — Follow Up', closes: false },
    { value: 'not_interested_follow_up', label: '👎 Not Interested', closes: false },
    { value: 'not_connected', label: '📵 Not Connected', closes: false },
    ...(module === 'insurance' ? [{ value: 'payment_received_policy_pending', label: '💰 Payment Pending', closes: false }] : []),
    { value: 'lost_done_elsewhere', label: '❌ Lost — Done Elsewhere', closes: true },
    ...(module === 'service' ? [{ value: 'vehicle_reported', label: '✅ Vehicle Reported', closes: true }] : []),
    { value: 'invalid_data', label: '⚠️ Invalid Data', closes: true },
    ...(module === 'insurance' ? [{ value: 'payment_received_policy_done', label: '✅ Payment Done', closes: true }] : []),
  ];

  const remarkOptions = {
    not_connected: ['Number Busy', 'Switched Off', 'Ringing No Answer'],
    invalid_data: ['Wrong Number', 'No Such Customer'],
  };

  const selectedOutcome = allOutcomes.find(o => o.value === form.callOutcome);
  const isClosing = selectedOutcome?.closes;

  const handleSave = async () => {
    if (!form.callOutcome) { toast.error('Please select an outcome'); return; }
    setLoading(true);
    try {
      const data = { ...form, dealershipId: plan?.dealershipId };
      if (module === 'insurance') {
        await insuranceService.logCall(plan.id, data);
      } else {
        await serviceService.logCall(plan.id, data);
      }
      toast.success('Follow-up saved!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{customer.name || 'Unknown Customer'}</p>
            <p className="text-blue-200 text-xs">{customer.registrationNumber} • {customer.make} {customer.model}</p>
          </div>
          <div className="flex items-center gap-2">
            {primaryMobile && (
              <a href={`tel:${primaryMobile}`} className="text-white text-lg">📞</a>
            )}
            <button onClick={onClose} className="text-blue-200 hover:text-white text-lg">✕</button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Outcome dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Call Outcome *</label>
            <select
              value={form.callOutcome}
              onChange={e => setForm({ ...form, callOutcome: e.target.value, callRemark: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select outcome...</option>
              <optgroup label="— Open —">
                {allOutcomes.filter(o => !o.closes).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
              <optgroup label="— Close Plan —">
                {allOutcomes.filter(o => o.closes).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Remark for not connected / invalid */}
          {remarkOptions[form.callOutcome] && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remark</label>
              <div className="flex gap-2 flex-wrap">
                {remarkOptions[form.callOutcome].map(r => (
                  <button key={r} type="button"
                    onClick={() => setForm({ ...form, callRemark: r })}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${form.callRemark === r ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >{r}</button>
                ))}
              </div>
            </div>
          )}
           {/* Appointment date when appointment fixed */}
{form.callOutcome === 'appointment_fixed' && (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">Appointment Date *</label>
    <input
      type="date"
      value={form.appointmentDate || ''}
      onChange={e => setForm({ ...form, appointmentDate: e.target.value })}
      min={new Date().toISOString().split('T')[0]}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
    />
  </div>
)}
          {/* Next followup date — only for open outcomes */}
          {!isClosing && form.callOutcome !== 'appointment_fixed' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Follow-up Date</label>
              <input
                type="date"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Quick notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={loading || !form.callOutcome}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { onClose(); onFullLog(plan, module); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Full Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickLogModal;
