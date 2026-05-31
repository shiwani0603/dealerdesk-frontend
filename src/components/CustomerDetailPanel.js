import React, { useState, useEffect } from 'react';
import { customerService, insuranceService, serviceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
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

const InputField = ({ label, value, onChange, type = 'text', options }) => (
  <div className="mb-2">
    <label className="block text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">{label}</label>
    {options ? (
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    )}
  </div>
);

const CustomerDetailPanel = ({ customerId, planId, planType, onClose, onLogCall }) => {
  const { user } = useAuth();
  const canEdit = ['manager', 'team_leader', 'telecaller'].includes(user?.role);

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customer');
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ contactType: 'mobile', value: '' });
  const [editingNote, setEditingNote] = useState(false);
  const [stickyNote, setStickyNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ noteText: '', fromModule: '', toModule: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [extendingAutoClose, setExtendingAutoClose] = useState(null); // 'insurance' | 'service'
  const [newAutoCloseDate, setNewAutoCloseDate] = useState('');

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [custForm, setCustForm] = useState({});
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehForm, setVehForm] = useState({});
  const [saving, setSaving] = useState(false);

useEffect(() => {
  loadCustomer();
}, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openEditCustomer = () => {
    setCustForm({
      name: customer.name || '',
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '',
      age: customer.age || '',
      panNumber: customer.panNumber || '',
      city: customer.city || '',
      pincode: customer.pincode || '',
      address: customer.address || '',
    });
    setEditingCustomer(true);
  };

  const handleSaveCustomer = async () => {
    setSaving(true);
    try {
      await customerService.updateCustomer(customerId, custForm);
      toast.success('Customer details saved');
      setEditingCustomer(false);
      loadCustomer();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openEditVehicle = () => {
    setVehForm({
      registrationNumber: customer.registrationNumber || '',
      engineNumber: customer.engineNumber || '',
      fuelType: customer.fuelType || '',
      transmissionType: customer.transmissionType || '',
      manufacturingYear: customer.manufacturingYear || '',
      vehiclePurchaseDate: customer.vehiclePurchaseDate ? new Date(customer.vehiclePurchaseDate).toISOString().split('T')[0] : '',
      salesConsultantName: customer.salesConsultantName || '',
    });
    setEditingVehicle(true);
  };

  const handleSaveVehicle = async () => {
    setSaving(true);
    try {
      await customerService.updateCustomer(customerId, vehForm);
      toast.success('Vehicle details saved');
      setEditingVehicle(false);
      loadCustomer();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.noteText.trim()) return;
    setSavingNote(true);
    try {
      await customerService.addNote(customerId, noteForm);
      toast.success('Note added');
      setAddingNote(false);
      setNoteForm({ noteText: '', fromModule: '', toModule: '' });
      loadCustomer();
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleExtendAutoClose = async (planId) => {
    if (!newAutoCloseDate || !planId) return;
    try {
      if (extendingAutoClose === 'insurance') {
        await insuranceService.extendAutoClose(planId, newAutoCloseDate);
      } else {
        await serviceService.extendAutoClose(planId, newAutoCloseDate);
      }
      toast.success('Auto-close date extended');
      setExtendingAutoClose(null);
      setNewAutoCloseDate('');
      loadCustomer();
    } catch (err) {
      toast.error('Failed to extend auto-close date');
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
  onClick={() => onLogCall && onLogCall(customer?.insurancePlans?.[0] || customer?.servicePlans?.[0], planType)}
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
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="font-semibold text-gray-700 text-sm">Personal Details</span>
                  {canEdit && !editingCustomer && (
                    <button onClick={openEditCustomer} className="text-xs text-blue-600 hover:underline font-medium">✏️ Edit</button>
                  )}
                </div>
                <div className="px-4 py-3">
                  {editingCustomer ? (
                    <div>
                      <div className="grid grid-cols-2 gap-x-3">
                        <InputField label="Full Name" value={custForm.name} onChange={v => setCustForm(f => ({ ...f, name: v }))} />
                        <InputField label="Date of Birth" type="date" value={custForm.dateOfBirth} onChange={v => setCustForm(f => ({ ...f, dateOfBirth: v }))} />
                        <InputField label="Age" type="number" value={custForm.age} onChange={v => setCustForm(f => ({ ...f, age: v }))} />
                        <InputField label="PAN Number" value={custForm.panNumber} onChange={v => setCustForm(f => ({ ...f, panNumber: v }))} />
                        <InputField label="City" value={custForm.city} onChange={v => setCustForm(f => ({ ...f, city: v }))} />
                        <InputField label="Pincode" value={custForm.pincode} onChange={v => setCustForm(f => ({ ...f, pincode: v }))} />
                      </div>
                      <InputField label="Address" value={custForm.address} onChange={v => setCustForm(f => ({ ...f, address: v }))} />
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleSaveCustomer} disabled={saving}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditingCustomer(false)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-2 gap-x-4">
                        <Field label="Full Name" value={customer.name} />
                        <Field label="Date of Birth" value={formatDate(customer.dateOfBirth)} />
                        <Field label="Age" value={customer.age} />
                        <Field label="PAN Number" value={customer.panNumber} />
                        <Field label="City" value={customer.city} />
                        <Field label="Pincode" value={customer.pincode} />
                      </div>
                      <Field label="Address" value={customer.address} />
                    </div>
                  )}
                </div>
              </div>

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
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                <span className="font-semibold text-gray-700 text-sm">Vehicle Details</span>
                {canEdit && !editingVehicle && (
                  <button onClick={openEditVehicle} className="text-xs text-blue-600 hover:underline font-medium">✏️ Edit</button>
                )}
              </div>
              <div className="px-4 py-3">
                {/* Always show non-editable identifiers */}
                <div className="grid grid-cols-2 gap-x-4 mb-3 pb-3 border-b border-gray-100">
                  <Field label="Make" value={customer.make} highlight />
                  <Field label="Model" value={customer.model} highlight />
                  <Field label="Sub Model" value={customer.subModel} />
                  <Field label="Chassis No" value={customer.chassisNumber} />
                </div>

                {editingVehicle ? (
                  <div>
                    <div className="grid grid-cols-2 gap-x-3">
                      <InputField label="Registration No" value={vehForm.registrationNumber} onChange={v => setVehForm(f => ({ ...f, registrationNumber: v }))} />
                      <InputField label="Engine Number" value={vehForm.engineNumber} onChange={v => setVehForm(f => ({ ...f, engineNumber: v }))} />
                      <InputField label="Fuel Type" value={vehForm.fuelType} onChange={v => setVehForm(f => ({ ...f, fuelType: v }))}
                        options={['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG']} />
                      <InputField label="Transmission" value={vehForm.transmissionType} onChange={v => setVehForm(f => ({ ...f, transmissionType: v }))}
                        options={['Manual', 'Automatic', 'AMT', 'CVT', 'DCT']} />
                      <InputField label="Mfg. Year" type="number" value={vehForm.manufacturingYear} onChange={v => setVehForm(f => ({ ...f, manufacturingYear: v }))} />
                      <InputField label="Purchase Date" type="date" value={vehForm.vehiclePurchaseDate} onChange={v => setVehForm(f => ({ ...f, vehiclePurchaseDate: v }))} />
                      <div className="col-span-2">
                        <InputField label="Sales Consultant" value={vehForm.salesConsultantName} onChange={v => setVehForm(f => ({ ...f, salesConsultantName: v }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleSaveVehicle} disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditingVehicle(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4">
                    <Field label="Registration No" value={customer.registrationNumber} highlight />
                    <Field label="Engine Number" value={customer.engineNumber} />
                    <Field label="Fuel Type" value={customer.fuelType} />
                    <Field label="Transmission" value={customer.transmissionType} />
                    <Field label="Mfg. Year" value={customer.manufacturingYear} />
                    <Field label="Purchase Date" value={formatDate(customer.vehiclePurchaseDate)} />
                    {customer.salesConsultantName && <Field label="Sales Consultant" value={customer.salesConsultantName} />}
                    {customer.chargerType && <Field label="Charger Type" value={customer.chargerType} />}
                    {customer.soldByOwnDealership && (
                      <div className="col-span-2 mt-1 bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-blue-600 font-medium">✓ Sold by this dealership</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insurance Tab */}
          {activeTab === 'insurance' && (
            <div>
              {openInsurancePlan && (
                <div className="bg-blue-50 rounded-xl p-4 mb-3 border border-blue-200">
                  <p className="text-xs font-medium text-blue-600 mb-2">ACTIVE PLAN</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Field label="Category" value={openInsurancePlan.policyCategory} />
                    <Field label="Next Follow-up" value={formatDate(openInsurancePlan?.nextFollowupDate)} />
                    <div className="flex items-end gap-2">
                      <Field label="Auto-close Date" value={formatDate(openInsurancePlan?.autoCloseDate)} />
                      <button onClick={() => { setExtendingAutoClose('insurance'); setNewAutoCloseDate(''); }}
                        className="text-xs text-blue-600 hover:underline mb-2 flex-shrink-0">Extend</button>
                    </div>
                  </div>
                  {extendingAutoClose === 'insurance' && (
                    <div className="mt-2 flex gap-2 items-center">
                      <input type="date" value={newAutoCloseDate} onChange={e => setNewAutoCloseDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1.5" />
                      <button onClick={() => handleExtendAutoClose(openInsurancePlan.id)}
                        className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                      <button onClick={() => setExtendingAutoClose(null)} className="text-sm text-gray-500">✕</button>
                    </div>
                  )}
                </div>
              )}

              {customer.insuranceRecords?.length > 0 ? (
                <Section title={`Policy Details (${customer.insuranceRecords.length})`}>
                  <div className="overflow-x-auto -mx-4">
                    <table className="w-full text-xs" style={{ minWidth: '520px' }}>
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 font-semibold">
                          <td className="px-3 py-2 w-8">S No</td>
                          <td className="px-3 py-2">Policy No.</td>
                          <td className="px-3 py-2">Insurance Company</td>
                          <td className="px-3 py-2 whitespace-nowrap">Issue Date</td>
                          <td className="px-3 py-2 whitespace-nowrap">OD Expiry</td>
                          <td className="px-3 py-2 whitespace-nowrap">TP Expiry</td>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.insuranceRecords.map((rec, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
                            <td className="px-3 py-2 font-mono text-gray-700 text-xs break-all">{rec.policyNumber || '—'}</td>
                            <td className="px-3 py-2 text-gray-800">{rec.insurerName || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(rec.policyInceptionDate)}</td>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium ${i === 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                              {formatDate(rec.odExpiryDate || rec.policyExpiryDate)}
                            </td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(rec.tpExpiryDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🛡️</p>
                  <p className="text-sm">No insurance records found</p>
                </div>
              )}

              {latestInsurance && (
                <Section title="Premium Details" defaultOpen={false}>
                  <div className="grid grid-cols-2 gap-x-4">
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
                    <Field label="Service Due" value={openServicePlan?.currentServiceDue} />
                    <Field label="Due Date" value={formatDate(openServicePlan?.calculatedNextDueDate)} highlight />
                    <Field label="Next Follow-up" value={formatDate(openServicePlan?.nextFollowupDate)} />
                    <div className="flex items-end gap-2">
                      <Field label="Auto-close" value={formatDate(openServicePlan?.autoCloseDate)} />
                      <button onClick={() => { setExtendingAutoClose('service'); setNewAutoCloseDate(''); }}
                        className="text-xs text-green-600 hover:underline mb-2 flex-shrink-0">Extend</button>
                    </div>
                  </div>
                  {extendingAutoClose === 'service' && (
                    <div className="mt-2 flex gap-2 items-center">
                      <input type="date" value={newAutoCloseDate} onChange={e => setNewAutoCloseDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="flex-1 text-sm border border-green-300 rounded-lg px-2 py-1.5" />
                      <button onClick={() => handleExtendAutoClose(openServicePlan.id)}
                        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                      <button onClick={() => setExtendingAutoClose(null)} className="text-sm text-gray-500">✕</button>
                    </div>
                  )}
                  {openServicePlan?.appointmentDate && (
                    <div className="mt-2 bg-green-100 rounded-lg p-2">
                      <p className="text-xs text-green-700 font-medium">
                        📅 Appointment: {formatDate(openServicePlan?.appointmentDate)} at {openServicePlan.appointmentTime || 'TBD'}
                      </p>
                      <p className="text-xs text-green-600">
                        {openServicePlan.appointmentType === 'pickup' ? '🚗 Pickup' : '🏃 Self Visit'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {customer.serviceRecords?.length > 0 ? (
                <Section title={`Service Detail (${customer.serviceRecords.length})`}>
                  <div className="overflow-x-auto -mx-4">
                    <table className="w-full text-xs" style={{ minWidth: '480px' }}>
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 font-semibold">
                          <td className="px-3 py-2 w-8">S No</td>
                          <td className="px-3 py-2">Job Card No</td>
                          <td className="px-3 py-2 whitespace-nowrap">Job Card Date</td>
                          <td className="px-3 py-2">Service Type</td>
                          <td className="px-3 py-2">Service Location</td>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.serviceRecords.map((rec, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                            <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
                            <td className="px-3 py-2 font-mono text-gray-700">{rec.jobCardNumber || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(rec.serviceDate)}</td>
                            <td className="px-3 py-2 text-gray-800">{rec.serviceType || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{rec.location?.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🔧</p>
                  <p className="text-sm">No service records found</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {/* Cross-module note creation */}
              <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="font-semibold text-gray-700 text-sm">📝 Write Note</span>
                  {!addingNote && (
                    <button onClick={() => setAddingNote(true)} className="text-xs text-blue-600 hover:underline font-medium">+ Add</button>
                  )}
                </div>
                {addingNote && (
                  <div className="px-4 py-3 space-y-2">
                    <textarea value={noteForm.noteText} onChange={e => setNoteForm(f => ({ ...f, noteText: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-blue-300"
                      rows={3} placeholder="Write your note here..." autoFocus />
                    <div className="flex gap-2">
                      <select value={noteForm.fromModule} onChange={e => setNoteForm(f => ({ ...f, fromModule: e.target.value }))}
                        className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5">
                        <option value="">From module (optional)</option>
                        <option value="insurance">Insurance</option>
                        <option value="service">Service</option>
                        <option value="psf">PSF</option>
                      </select>
                      <select value={noteForm.toModule} onChange={e => setNoteForm(f => ({ ...f, toModule: e.target.value }))}
                        className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5">
                        <option value="">To module (optional)</option>
                        <option value="insurance">Insurance</option>
                        <option value="service">Service</option>
                        <option value="psf">PSF</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddNote} disabled={savingNote || !noteForm.noteText.trim()}
                        className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                      <button onClick={() => setAddingNote(false)} className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Unified timeline */}
              <Section title="Interaction Timeline">
                {(() => {
                  const logs = (customer.followUpLogs || []).map(l => ({ ...l, _type: 'log', _ts: new Date(l.loggedAt) }));
                  const notes = (customer.notes || []).map(n => ({ ...n, _type: 'note', _ts: new Date(n.createdAt) }));
                  const timeline = [...logs, ...notes].sort((a, b) => b._ts - a._ts);
                  if (timeline.length === 0) {
                    return <div className="text-center py-4 text-gray-400 text-sm">No interactions yet</div>;
                  }
                  return (
                    <div className="space-y-2">
                      {timeline.map((item, i) => item._type === 'log' ? (
                        <div key={i} className="py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-800">{item.callOutcome?.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-gray-400">{formatDate(item.loggedAt)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item.planType} • {item.loggedBy?.name || 'System'}</p>
                          {item.notes && <p className="text-xs text-gray-600 mt-0.5 italic">"{item.notes}"</p>}
                        </div>
                      ) : (
                        <div key={i} className={`rounded-lg p-3 border ${item.noteType === 'cross_module' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              text={item.noteType === 'cross_module' ? `🔀 ${item.fromModule || ''}→${item.toModule || ''}` : item.noteType === 'system_auto_close' ? '🤖 Auto-closed' : '📌 Note'}
                              color={item.noteType === 'cross_module' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}
                            />
                            <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                          </div>
                          <p className="text-sm text-gray-700">{item.noteText}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Section>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerDetailPanel;
