import React from 'react';

const formatDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

const outcomeLabel = {
  appointment_fixed: '📅 Appt Fixed',
  appointment_discussion: '💬 Discussion',
  interested_follow_up: '👍 Interested',
  not_interested_follow_up: '👎 Not Interested',
  not_connected: '📵 Not Connected',
  payment_received_policy_pending: '💰 Pmt Pending',
  payment_received_policy_done: '✅ Pmt Done',
  lost_done_elsewhere: '❌ Lost',
  invalid_data: '⚠️ Invalid',
  vehicle_reported: '✅ Reported',
};

export const InsurancePlanTable = ({ plans, onOpenDetail, onQuickLog, onTransfer }) => {
  if (!plans || plans.length === 0) {
    return (
      <div className="bg-white rounded-xl p-10 text-center shadow-sm">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-gray-500 font-medium">No plans in this category</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="col-span-3">Customer</div>
        <div className="col-span-2">Contact</div>
        <div className="col-span-2">Insurer / Expiry</div>
        <div className="col-span-1">Last Action</div>
        <div className="col-span-1 text-center">Rnwl Year</div>
        <div className="col-span-1 text-center">Rnwl Type</div>
        <div className="col-span-1 text-center">Follow-up</div>
        <div className="col-span-1 text-center">Action</div>
      </div>
      {plans.filter(p => p !== undefined && p !== null).map((plan, i) => {
        const customer = plan?.customer || {};
        const record = plan?.latestRecord || {};
        const lastLog = (plan?.followUpLogs || [])[0];
        const attemptCount = plan?._count?.followUpLogs || 0;
        const isOverdue = plan?.nextFollowupDate && new Date(plan.nextFollowupDate) < new Date();
        const isRedAlert = plan?.autoCloseDate && new Date(plan.autoCloseDate) <= new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

        const getRenewalYear = () => {
          const expiryDate = record.policyExpiryDate;
          if (!expiryDate) return '';
          const expiryYear = new Date(expiryDate).getFullYear();
          // Prefer purchase date, fall back to manufacturing year
          const purchaseDate = customer.vehiclePurchaseDate;
          const baseYear = purchaseDate
            ? new Date(purchaseDate).getFullYear()
            : customer.manufacturingYear || null;
          if (!baseYear) return '';
          const renewalNum = expiryYear - baseYear;
          if (renewalNum <= 0) return '1st';
          const suffix = renewalNum === 1 ? 'st' : renewalNum === 2 ? 'nd' : renewalNum === 3 ? 'rd' : 'th';
          return `${renewalNum}${suffix}`;
        };

        const getRenewalType = () => {
          const expiryDate = record.policyExpiryDate;
          const inceptionDate = record.policyInceptionDate;
          if (!expiryDate || !inceptionDate) return null;
          const expiryYear = new Date(expiryDate).getFullYear();
          const inceptionYear = new Date(inceptionDate).getFullYear();
          // Annual policy incepted in previous year = normal renewal = Retention
          return (expiryYear - inceptionYear) <= 1 ? 'Retention' : 'Rollover';
        };

        const renewalYear = getRenewalYear();
        const renewalType = getRenewalType();
        const contacts = customer.contacts || [];
        const primaryMobile = contacts.find(c => c.contactType === 'mobile' && c.isPrimary)?.value || contacts.find(c => c.contactType === 'mobile')?.value;

        return (
          <div key={plan.id} className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-blue-50 transition-colors items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isRedAlert ? 'border-l-4 border-l-red-400' : isOverdue ? 'border-l-4 border-l-orange-400' : ''}`}>
            {/* Customer - clickable */}
            <div className="col-span-3 min-w-0 cursor-pointer" onClick={() => onOpenDetail(plan, 'insurance')}>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900 truncate" title={customer.name || 'Unknown'}>{customer.name || 'Unknown'}</p>
                {customer.hasIncompleteData && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded flex-shrink-0" title="Incomplete data">⚠️</span>}
              </div>
              <p className="text-xs text-gray-500 truncate" title={`${customer.registrationNumber || customer.chassisNumber} • ${customer.make} ${customer.model}`}>{customer.registrationNumber || customer.chassisNumber} • {customer.make} {customer.model}</p>
            </div>

            {/* Contact */}
            <div className="col-span-2 flex items-center gap-1.5">
              {primaryMobile ? (
                <>
                  <a href={`tel:${primaryMobile}`} onClick={e => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full text-xs transition-colors flex-shrink-0">📞</a>
                  <span className="text-xs text-blue-600 font-medium truncate">{primaryMobile}</span>
                </>
              ) : <span className="text-xs text-gray-400">—</span>}
            </div>

            {/* Insurer + expiry */}
            <div className="col-span-2 min-w-0 cursor-pointer" onClick={() => onOpenDetail(plan, 'insurance')}>
              <p className="text-xs font-medium text-gray-700 truncate">{record.insurerName || '—'}</p>
              <p className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-orange-600'}`}>{formatDate(record.policyExpiryDate)}</p>
            </div>

            {/* Last action */}
            <div className="col-span-1 min-w-0 cursor-pointer" onClick={() => onOpenDetail(plan, 'insurance')}>
              {lastLog ? (
                <p className="text-xs text-gray-700 truncate">{outcomeLabel[lastLog.callOutcome] || lastLog.callOutcome}</p>
              ) : <p className="text-xs text-gray-400 italic">No calls</p>}
            </div>

            {/* Renewal Year */}
            <div className="col-span-1 text-center cursor-pointer" onClick={() => onOpenDetail(plan, 'insurance')}>
              {renewalYear
                ? <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{renewalYear}</span>
                : <span className="text-xs text-gray-300">—</span>
              }
            </div>

            {/* Renewal Type */}
            <div className="col-span-1 text-center cursor-pointer" onClick={() => onOpenDetail(plan, 'insurance')}>
              {renewalType === 'Retention' && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Retention</span>
              )}
              {renewalType === 'Rollover' && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Rollover</span>
              )}
              {!renewalType && <span className="text-xs text-gray-300">—</span>}
            </div>

            {/* Follow-up */}
            <div className="col-span-1 text-center cursor-pointer" onClick={() => onOpenDetail(plan, 'insurance')}>
              <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>{formatDate(plan?.nextFollowupDate)}</span>
              <p className="text-xs text-gray-400">{attemptCount} calls</p>
            </div>

            {/* Action */}
            <div className="col-span-1 text-center flex flex-col gap-1 items-center">
              <button
                onClick={e => { e.stopPropagation(); onQuickLog && onQuickLog(plan, 'insurance'); }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                ⚡ Log
              </button>
              {onTransfer && (
                <button
                  onClick={e => { e.stopPropagation(); onTransfer(plan, 'insurance'); }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  ↔ Move
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const psfOutcomeLabel = {
  satisfied: '✅ Satisfied',
  not_satisfied: '❌ Not Satisfied',
  not_connected: '📵 Not Connected',
};

export const PsfPlanTable = ({ plans, onQuickLog }) => {
  if (!plans || plans.length === 0) {
    return (
      <div className="bg-white rounded-xl p-10 text-center shadow-sm">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-gray-500 font-medium">No PSF plans in this category</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="col-span-3">Customer</div>
        <div className="col-span-2">Contact</div>
        <div className="col-span-2">Service Date</div>
        <div className="col-span-2">Job Card / Adviser</div>
        <div className="col-span-2">Last Outcome</div>
        <div className="col-span-1 text-center">Action</div>
      </div>
      {plans.filter(p => p !== undefined && p !== null).map((plan, i) => {
        const customer = plan?.customer || {};
        const record = plan?.serviceRecord || {};
        const contacts = customer.contacts || [];
        const primaryMobile = contacts.find(c => c.contactType === 'mobile' && c.isPrimary)?.value || contacts.find(c => c.contactType === 'mobile')?.value;

        return (
          <div key={plan.id} className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-purple-50 transition-colors items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            {/* Customer */}
            <div className="col-span-3 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate" title={customer.name || 'Unknown'}>{customer.name || 'Unknown'}</p>
              <p className="text-xs text-gray-500 truncate" title={`${customer.registrationNumber || customer.chassisNumber} • ${customer.make} ${customer.model}`}>{customer.registrationNumber || customer.chassisNumber} • {customer.make} {customer.model}</p>
            </div>

            {/* Contact */}
            <div className="col-span-2 flex items-center gap-1.5">
              {primaryMobile ? (
                <>
                  <a href={`tel:${primaryMobile}`} onClick={e => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full text-xs transition-colors flex-shrink-0">📞</a>
                  <span className="text-xs text-blue-600 font-medium truncate">{primaryMobile}</span>
                </>
              ) : <span className="text-xs text-gray-400">—</span>}
            </div>

            {/* Service Date + Type */}
            <div className="col-span-2 min-w-0">
              <p className="text-xs font-medium text-gray-700">{formatDate(record.serviceDate)}</p>
              {record.serviceType && <p className="text-xs text-gray-500 truncate">{record.serviceType}</p>}
            </div>

            {/* Job Card + Adviser */}
            <div className="col-span-2 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{record.jobCardNumber || '—'}</p>
              <p className="text-xs text-gray-500 truncate">{plan.serviceAdviserName || record.serviceAdviserName || '—'}</p>
            </div>

            {/* Last Outcome */}
            <div className="col-span-2 min-w-0">
              {plan.callOutcome ? (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  plan.callOutcome === 'satisfied' ? 'bg-green-100 text-green-700' :
                  plan.callOutcome === 'not_satisfied' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{psfOutcomeLabel[plan.callOutcome] || plan.callOutcome}</span>
              ) : <span className="text-xs text-gray-400 italic">No call yet</span>}
            </div>

            {/* Log button */}
            <div className="col-span-1 text-center">
              <button
                onClick={() => onQuickLog && onQuickLog(plan, 'psf')}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                ⚡ Log
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ServicePlanTable = ({ plans, onOpenDetail, onQuickLog, onTransfer }) => {
  if (!plans || plans.length === 0) {
    return (
      <div className="bg-white rounded-xl p-10 text-center shadow-sm">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-gray-500 font-medium">No plans in this category</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="col-span-3">Customer</div>
        <div className="col-span-2">Contact</div>
        <div className="col-span-2">Service Due</div>
        <div className="col-span-2">Last Action</div>
        <div className="col-span-1 text-center">Due Date</div>
        <div className="col-span-1 text-center">Follow-up</div>
        <div className="col-span-1 text-center">Action</div>
      </div>
      {plans.filter(p => p !== undefined && p !== null).map((plan, i) => {
        const customer = plan?.customer || {};
        const lastLog = (plan?.followUpLogs || [])[0];
        const attemptCount = plan?._count?.followUpLogs || 0;
        const isOverdue = plan?.nextFollowupDate && new Date(plan.nextFollowupDate) < new Date();
        const isRedAlert = plan?.autoCloseDate && new Date(plan.autoCloseDate) <= new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        const contacts = customer.contacts || [];
        const primaryMobile = contacts.find(c => c.contactType === 'mobile' && c.isPrimary)?.value || contacts.find(c => c.contactType === 'mobile')?.value;

        return (
          <div key={plan.id} className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-100 hover:bg-green-50 transition-colors items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isRedAlert ? 'border-l-4 border-l-red-400' : isOverdue ? 'border-l-4 border-l-orange-400' : ''}`}>
            {/* Customer */}
            <div className="col-span-3 min-w-0 cursor-pointer" onClick={() => onOpenDetail(plan, 'service')}>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900 truncate" title={customer.name || 'Unknown'}>{customer.name || 'Unknown'}</p>
                {customer.hasIncompleteData && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded flex-shrink-0" title="Incomplete data">⚠️</span>}
              </div>
              <p className="text-xs text-gray-500 truncate" title={`${customer.registrationNumber || customer.chassisNumber} • ${customer.make} ${customer.model}`}>{customer.registrationNumber || customer.chassisNumber} • {customer.make} {customer.model}</p>
            </div>

            {/* Contact */}
            <div className="col-span-2 flex items-center gap-1.5">
              {primaryMobile ? (
                <>
                  <a href={`tel:${primaryMobile}`} onClick={e => e.stopPropagation()} className="w-7 h-7 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full text-xs transition-colors flex-shrink-0">📞</a>
                  <span className="text-xs text-blue-600 font-medium truncate">{primaryMobile}</span>
                </>
              ) : <span className="text-xs text-gray-400">—</span>}
            </div>

            {/* Service type */}
            <div className="col-span-2 cursor-pointer" onClick={() => onOpenDetail(plan, 'service')}>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">🔧 {plan?.currentServiceDue || 'Service'}</span>
              {plan?.appointmentDate && <p className="text-xs text-blue-600 mt-0.5">📅 {formatDate(plan.appointmentDate)} {plan?.appointmentType === 'pickup' ? '🚗' : '🏃'}</p>}
            </div>

            {/* Last action */}
            <div className="col-span-2 min-w-0 cursor-pointer" onClick={() => onOpenDetail(plan, 'service')}>
              {lastLog ? (
                <>
                  <p className="text-xs text-gray-700 truncate">{outcomeLabel[lastLog.callOutcome] || lastLog.callOutcome}</p>
                  <p className="text-xs text-gray-400">{formatDate(lastLog.loggedAt)}</p>
                </>
              ) : <p className="text-xs text-gray-400 italic">No calls yet</p>}
            </div>

            {/* Due date */}
            <div className="col-span-1 text-center cursor-pointer" onClick={() => onOpenDetail(plan, 'service')}>
              <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-green-700'}`}>{formatDate(plan?.calculatedNextDueDate)}</span>
            </div>

            {/* Follow-up */}
            <div className="col-span-1 text-center cursor-pointer" onClick={() => onOpenDetail(plan, 'service')}>
              <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>{formatDate(plan?.nextFollowupDate)}</span>
              <p className="text-xs text-gray-400">{attemptCount} calls</p>
            </div>

            {/* Action */}
            <div className="col-span-1 text-center flex flex-col gap-1 items-center">
              <button
                onClick={e => { e.stopPropagation(); onQuickLog && onQuickLog(plan, 'service'); }}
                className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                ⚡ Log
              </button>
              {onTransfer && (
                <button
                  onClick={e => { e.stopPropagation(); onTransfer(plan, 'service'); }}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  ↔ Move
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
