import React, { useState, useEffect } from 'react';
import { customerService } from '../services/api';
import toast from 'react-hot-toast';

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-gray-700 text-sm">{title}</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
};

const Field = ({ label, value, highlight }) => (
  <div className="mb-2">
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
    <p className={`text-sm font-medium mt-0.5 ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>
      {value || '—'}
    </p>
  </div>
);

const Badge = ({ text, color }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
    {text}
  </span>
);

const CustomerDetailPanel = ({ customerId, planId, planType, onClose, onLogCall }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customer');
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ contactType: 'mobile', value: '' });
  const [editingNote, setEditingNote] = useState(false);
  const [stickyNote, setStickyNote] = useState('');

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomer(customerId);
      setCustomer(res.data.customer);
      setStickyNote(res.data.customer.stickyNote || '');
    } catch (err) {
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.value) return;
    try {
      await customerService.addContact(customerId, newContact);
      toast.success('Contact added successfully');
      setAddingContact(false);
      setNewContact({ contactType: 'mobile', value: '' });
      loadCustomer();
    } catch (err) {
      toast.error('Failed to add contact');
    }
  };

  const handleSaveStickyNote = async () => {
    try {
      await customerService.updateCustomer(customerId, { stickyNote });
      toast.success('Note saved');
      setEditingNote(false);
      loadCustomer();
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return '₹' + Number(amount).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-40 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3 text-sm">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const primaryMobile = customer.contacts?.find(c => c.contactType === 'mobile' && c.isPrimary)?.value
    || customer.contacts?.find(c => c.contactType === 'mobile')?.value;
  const allMobiles = customer.contacts?.filter(c => c.contactType === 'mobile') || [];
  const allEmails = customer.contacts?.filter(c => c.contactType === 'email') || [];

  const latestInsurance = customer.insurancePlans?.[0]?.latestRecord;
  const latestService = customer.serviceRecords?.[0];
  const openInsurancePlan = customer.insurancePlans?.find(p => p.planStatus === 'open');
  const openServicePlan = customer.servicePlans?.find(p => p.planStatus === 'open');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg">{customer.name || 'Unknown Customer'}</h2>
            <p className="text-blue-200 text-sm">
              {customer.make} {customer.model} {customer.subModel && `• ${customer.subModel}`}
            </p>
          </div>
          <button
  onClick={() => onLogCall && onLogCall()}
  className="px-3 py-1.5 bg-white text-blue-600 font-medium text-sm rounded-lg hover:bg-blue-50 transition-colors mr-2"
>
  📞 Log Call
</button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-700 hover:bg-blue-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick contact bar */}
        <div className="bg-blue-50 px-5 py-3 flex items-center gap-3 flex-shrink-0 border-b border-blue-100">
          {primaryMobile ? (
            <a
              href={`tel:${primaryMobile}`}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📞 {primaryMobile}
            </a>
          ) : (
            <span className="text-sm text-gray-400">No mobile number</span>
          )}
          {customer.hasIncompleteData && (
            <Badge text="⚠️ Incomplete Data" color="bg-yellow-100 text-yellow-700" />
          )}
          {customer.soldByOwnDealership && (
            <Badge text="🏠 Own Sale" color="bg-blue-100 text-blue-700" />
          )}
        </div>

        {/* Sticky note */}
        {(customer.stickyNote || editingNote) && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex-shrink-0">
            {editingNote ? (
              <div className="flex gap-2">
                <input
                  value={stickyNote}
                  onChange={(e) => setStickyNote(e.target.value)}
                  className="flex-1 text-sm border border-amber-300 rounded px-2 py-1"
                  placeholder="Add a note about this customer..."
                  autoFocus
                />
                <button onClick={handleSaveStickyNote} className="text-sm bg-amber-500 text-white px-3 py-1 rounded">Save</button>
                <button onClick={() => setEditingNote(false)} className="text-sm text-gray-500">Cancel</button>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-sm text-amber-800">📌 {customer.stickyNote}</p>
                <button onClick={() => setEditingNote(true)} className="text-xs text-amber-600 ml-2">Edit</button>
              </div>
            )}
          </div>
        )}
        {!customer.stickyNote && !editingNote && (
          <div className="bg-gray-50 border-b px-5 py-1.5 flex-shrink-0">
            <button onClick={() => setEditingNote(true)} className="text-xs text-gray-400 hover:text-blue-600">
              📌 Add sticky note
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0 bg-white">
          {['customer', 'vehicle', 'insurance', 'service', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'customer' ? '👤' : tab === 'vehicle' ? '🚗' : tab === 'insurance' ? '🛡️' : tab === 'service' ? '🔧' : '📋'}
              <br />
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Customer Tab */}
          {activeTab === 'customer' && (
            <div>
              <Section title="Personal Details">
                <div className="grid grid-cols-2 gap-x-4">
                  <Field label="Full Name" value={customer.name} />
                  <Field label="Date of Birth" value={formatDate(customer.dateOfBirth)} />
                  <Field label="Age" value={customer.age} />
                  <Field label="PAN Number" value={customer.panNumber} />
                  <Field label="City" value={customer.city} />
                  <Field label="Pincode" value={customer.pincode} />
                </div>
                <Field label="Address" value={customer.address} />
              </Section>

              <Section title="Contact Numbers">
                {allMobiles.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.value}</p>
                      <p className="text-xs text-gray-400">{c.isPrimary ? 'Primary' : c.contactType}</p>
                    </div>
                    <a href={`tel:${c.value}`} className="text-green-500 text-lg">📞</a>
                  </div>
                ))}
                {allEmails.map((c, i) => (
                  <div key={i} className="py-1.5 border-b border-gray-100 last:border-0">
                    <p className="text-sm font-medium text-gray-800">{c.value}</p>
                    <p className="text-xs text-gray-400">Email</p>
                  </div>
                ))}
                {addingContact ? (
                  <div className="mt-3 space-y-2">
                    <select
                      value={newContact.contactType}
                      onChange={(e) => setNewContact({ ...newContact, contactType: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="mobile">Mobile</option>
                      <option value="alternate_mobile">Alternate Mobile</option>
                      <option value="email">Email</option>
                    </select>
                    <input
                      type="text"
                      value={newContact.value}
                      onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                      placeholder="Enter contact value"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleAddContact} className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg">Add</button>
                      <button onClick={() => setAddingContact(false)} className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingContact(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add contact
                  </button>
                )}
              </Section>
            </div>
          )}

          {/* Vehicle Tab */}
          {activeTab === 'vehicle' && (
            <Section title="Vehicle Details">
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="Make" value={customer.make} highlight />
                <Field label="Model" value={customer.model} highlight />
                <Field label="Sub Model" value={customer.subModel} />
                <Field label="Fuel Type" value={customer.fuelType} />
                <Field label="Transmission" value={customer.transmissionType} />
                <Field label="Manufacturing Year" value={customer.manufacturingYear} />
                <Field label="Purchase Date" value={formatDate(customer.vehiclePurchaseDate)} />
                <Field label="Registration No" value={customer.registrationNumber} highlight />
                <Field label="Chassis Number" value={customer.chassisNumber} />
                <Field label="Engine Number" value={customer.engineNumber} />
                {customer.chargerType && <Field label="Charger Type" value={customer.chargerType} />}
              </div>
              {customer.soldByOwnDealership && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">✓ Sold by this dealership</p>
                  {customer.salesConsultantName && (
                    <p className="text-xs text-blue-500 mt-0.5">Sales by: {customer.salesConsultantName}</p>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* Insurance Tab */}
          {activeTab === 'insurance' && (
            <div>
              {openInsurancePlan && (
                <div className="bg-blue-50 rounded-xl p-4 mb-3 border border-blue-200">
                  <p className="text-xs font-medium text-blue-600 mb-2">ACTIVE PLAN</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Field label="Status" value={openInsurancePlan.planStatus} />
                    <Field label="Category" value={openInsurancePlan.policyCategory} />
                    <Field label="Next Follow-up" value={formatDate(openInsurancePlan.nextFollowupDate)} />
                    <Field label="Auto-close Date" value={formatDate(openInsurancePlan.autoCloseDate)} />
                  </div>
                </div>
              )}

              {latestInsurance ? (
                <Section title="Latest Policy Details">
                  <div className="grid grid-cols-2 gap-x-4">
                    <Field label="Policy Number" value={latestInsurance.policyNumber} />
                    <Field label="Insurer" value={latestInsurance.insurerName} highlight />
                    <Field label="Policy Type" value={latestInsurance.policyType} />
                    <Field label="Fresh/Renewal" value={latestInsurance.isFreshPolicy ? 'Fresh Policy' : 'Renewal'} />
                    <Field label="Expiry Date" value={formatDate(latestInsurance.policyExpiryDate)} highlight />
                    <Field label="Inception Date" value={formatDate(latestInsurance.policyInceptionDate)} />
                    <Field label="IDV Value" value={formatCurrency(latestInsurance.idvValue)} />
                    <Field label="NCB %" value={latestInsurance.ncbPercentage ? `${latestInsurance.ncbPercentage}%` : '—'} />
                    <Field label="OD Premium" value={formatCurrency(latestInsurance.odPremium)} />
                    <Field label="TP Premium" value={formatCurrency(latestInsurance.tpPremium)} />
                    <Field label="Gross Premium" value={formatCurrency(latestInsurance.grossPremium)} highlight />
                    <Field label="Payment Mode" value={latestInsurance.paymentMode} />
                  </div>
                  {latestInsurance.addonDescription && (
                    <Field label="Add-ons" value={latestInsurance.addonDescription} />
                  )}
                </Section>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🛡️</p>
                  <p className="text-sm">No insurance records found</p>
                </div>
              )}

              {customer.insuranceRecords?.length > 1 && (
                <Section title={`Policy History (${customer.insuranceRecords.length} records)`} defaultOpen={false}>
                  {customer.insuranceRecords.map((rec, i) => (
                    <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{rec.insurerName || 'Unknown Insurer'}</p>
                        <p className="text-xs text-gray-400">{formatDate(rec.policyExpiryDate)}</p>
                      </div>
                      <p className="text-xs text-gray-500">{rec.policyNumber} • {formatCurrency(rec.grossPremium)}</p>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* Service Tab */}
          {activeTab === 'service' && (
            <div>
              {openServicePlan && (
                <div className="bg-green-50 rounded-xl p-4 mb-3 border border-green-200">
                  <p className="text-xs font-medium text-green-600 mb-2">ACTIVE PLAN</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Field label="Service Due" value={openServicePlan.currentServiceDue} />
                    <Field label="Due Date" value={formatDate(openServicePlan.calculatedNextDueDate)} highlight />
                    <Field label="Next Follow-up" value={formatDate(openServicePlan.nextFollowupDate)} />
                    <Field label="Auto-close" value={formatDate(openServicePlan.autoCloseDate)} />
                  </div>
                  {openServicePlan.appointmentDate && (
                    <div className="mt-2 bg-green-100 rounded-lg p-2">
                      <p className="text-xs text-green-700 font-medium">
                        📅 Appointment: {formatDate(openServicePlan.appointmentDate)} at {openServicePlan.appointmentTime || 'TBD'}
                      </p>
                      <p className="text-xs text-green-600">
                        {openServicePlan.appointmentType === 'pickup' ? '🚗 Pickup' : '🏃 Self Visit'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {latestService ? (
                <Section title="Last Service Details">
                  <div className="grid grid-cols-2 gap-x-4">
                    <Field label="Service Type" value={latestService.serviceType} highlight />
                    <Field label="Service Date" value={formatDate(latestService.serviceDate)} highlight />
                    <Field label="Mileage" value={latestService.mileageAtService ? `${latestService.mileageAtService} km` : '—'} />
                    <Field label="Job Card No" value={latestService.jobCardNumber} />
                    <Field label="Service Adviser" value={latestService.serviceAdviserName} />
                    <Field label="Total Invoice" value={formatCurrency(latestService.totalInvoiceAmount)} />
                    <Field label="Labour" value={formatCurrency(latestService.labourAmount)} />
                    <Field label="Parts" value={formatCurrency(latestService.partsAmount)} />
                  </div>
                </Section>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🔧</p>
                  <p className="text-sm">No service records found</p>
                </div>
              )}

              {customer.serviceRecords?.length > 1 && (
                <Section title={`Service History (${customer.serviceRecords.length} records)`} defaultOpen={false}>
                  {customer.serviceRecords.map((rec, i) => (
                    <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{rec.serviceType}</p>
                        <p className="text-xs text-gray-400">{formatDate(rec.serviceDate)}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {rec.jobCardNumber && `JC: ${rec.jobCardNumber} • `}
                        {rec.mileageAtService && `${rec.mileageAtService} km • `}
                        {formatCurrency(rec.totalInvoiceAmount)}
                      </p>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <Section title="Follow-up History">
                {customer.notes?.length === 0 && customer.insurancePlans?.[0]?.followUpLogs?.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">No follow-up history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.notes?.map((note, i) => (
                      <div key={i} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center justify-between mb-1">
                          <Badge text={note.noteType === 'cross_module' ? '🔀 Cross Module' : '📌 Note'} color="bg-amber-100 text-amber-700" />
                          <p className="text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                        </div>
                        <p className="text-sm text-gray-700">{note.noteText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerDetailPanel;
