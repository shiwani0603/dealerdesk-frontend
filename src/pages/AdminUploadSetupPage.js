import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

const MAKE_LIST = [
  { value: 'tata', label: 'Tata' },
  { value: 'maruti', label: 'Maruti Suzuki' },
  { value: 'hyundai', label: 'Hyundai' },
  { value: 'honda', label: 'Honda' },
  { value: 'toyota', label: 'Toyota' },
  { value: 'mahindra', label: 'Mahindra' },
  { value: 'kia', label: 'Kia' },
  { value: 'mg', label: 'MG' },
  { value: 'renault', label: 'Renault' },
  { value: 'nissan', label: 'Nissan' },
  { value: 'volkswagen', label: 'Volkswagen' },
  { value: 'skoda', label: 'Skoda' },
  { value: 'jeep', label: 'Jeep' },
  { value: 'ford', label: 'Ford' },
  { value: 'mercedes', label: 'Mercedes-Benz' },
  { value: 'bmw', label: 'BMW' },
  { value: 'audi', label: 'Audi' },
  { value: 'volvo', label: 'Volvo' },
  { value: 'isuzu', label: 'Isuzu' },
  { value: 'force', label: 'Force' },
];
const MAKE_LABELS = Object.fromEntries(MAKE_LIST.map(m => [m.value, m.label]));

const SYSTEM_FIELDS = {
  insurance: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'email', 'make', 'model', 'sub_model', 'fuel_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'policy_number', 'policy_category', 'policy_type', 'is_fresh_policy',
    'policy_expiry_date', 'od_expiry_date', 'tp_expiry_date',
    'policy_inception_date', 'policy_issue_date', 'od_percentage', 'od_premium',
    'tp_premium', 'idv_value', 'ncb_percentage', 'gross_premium', 'net_premium',
    'gst_amount', 'insurer_name', 'payment_mode', 'addon_description', 'renewal_category',
  ],
  service: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'email', 'make', 'model', 'sub_model', 'fuel_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'service_type', 'service_date', 'mileage_at_service', 'job_card_number',
    'total_invoice_amount', 'labour_amount', 'parts_amount',
    'service_adviser_name', 'service_adviser_mspin',
    'warranty_start_date', 'warranty_end_date', 'campaign_name', 'pickup_type',
  ],
  sales: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'email', 'make', 'model', 'model_head', 'sub_model',
    'fuel_type', 'transmission_type', 'charger_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'sales_consultant_name', 'sold_by_location',
  ],
};

const REQUIRED_FIELDS = {
  insurance: ['chassis_number', 'registration_number', 'customer_name', 'mobile', 'policy_expiry_date'],
  service: ['chassis_number', 'registration_number', 'customer_name', 'mobile', 'service_date'],
  sales: ['chassis_number', 'registration_number', 'customer_name', 'mobile', 'vehicle_purchase_date'],
};

// ─── Column Mapping Editor ────────────────────────────────────────────────────
const MappingEditor = ({ mappingJson, module, onChange }) => {
  const [rows, setRows] = useState(() =>
    Object.entries(mappingJson || {}).map(([col, field]) => ({ col, field, id: Math.random() }))
  );

  const systemFields = SYSTEM_FIELDS[module] || [];
  const required = REQUIRED_FIELDS[module] || [];

  const syncUp = (nextRows) => {
    setRows(nextRows);
    const obj = {};
    nextRows.forEach(r => { if (r.col.trim() && r.field) obj[r.col.trim()] = r.field; });
    onChange(obj);
  };

  const updateRow = (id, key, val) =>
    syncUp(rows.map(r => r.id === id ? { ...r, [key]: val } : r));

  const addRow = () =>
    syncUp([...rows, { col: '', field: '', id: Math.random() }]);

  const removeRow = (id) =>
    syncUp(rows.filter(r => r.id !== id));

  return (
    <div>
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-3 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
          <div>Excel Column Name</div>
          <div>Maps To System Field</div>
          <div></div>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
          {rows.map(row => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 px-3 py-2 items-center">
              <input
                value={row.col}
                onChange={e => updateRow(row.id, 'col', e.target.value)}
                placeholder="e.g. Customer Name"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={row.field}
                onChange={e => updateRow(row.id, 'field', e.target.value)}
                className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${row.field ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
              >
                <option value="">-- Skip --</option>
                {systemFields.map(f => (
                  <option key={f} value={f}>
                    {f}{required.includes(f) ? ' *' : ''}
                  </option>
                ))}
              </select>
              <button onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500 text-sm px-1">✕</button>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400 italic text-center">No columns mapped yet. Add a row below.</p>
          )}
        </div>
      </div>
      <button onClick={addRow} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
        + Add Column
      </button>
    </div>
  );
};

// ─── Template Card ────────────────────────────────────────────────────────────
const TemplateCard = ({ template, module, onDelete, onSave }) => {
  const [expanded, setExpanded] = useState(false);
  const [mapping, setMapping] = useState(template.mappingJson || {});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const colCount = Object.keys(template.mappingJson || {}).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(template.id, mapping);
      setDirty(false);
      toast.success('Template updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete template "${template.portalName}" (${MAKE_LABELS[template.make] || template.make})?`)) return;
    setDeleting(true);
    try {
      await onDelete(template.id);
    } catch {
      toast.error('Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-blue-300 shadow-sm' : 'border-gray-200'}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {expanded ? '▾' : '▸'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{template.portalName}</p>
            <p className="text-xs text-gray-500">{MAKE_LABELS[template.make] || template.make} · {colCount} columns mapped</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3" onClick={e => e.stopPropagation()}>
          {expanded && dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-medium disabled:opacity-50"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
          <MappingEditor
            mappingJson={template.mappingJson}
            module={module}
            onChange={m => { setMapping(m); setDirty(true); }}
          />
        </div>
      )}
    </div>
  );
};

// ─── Create Template Modal ────────────────────────────────────────────────────
const CreateTemplateModal = ({ defaultModule, onClose, onCreated }) => {
  const [form, setForm] = useState({ portalName: '', make: '', module: defaultModule || 'insurance' });
  const [mapping, setMapping] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.portalName.trim()) { toast.error('Portal name is required'); return; }
    if (!form.make) { toast.error('Make is required'); return; }
    if (Object.keys(mapping).length === 0) { toast.error('Add at least one column mapping'); return; }
    setSaving(true);
    try {
      await api.post('/upload/save-mapping', {
        module: form.module,
        portalName: form.portalName.trim(),
        make: form.make,
        mappingJson: mapping,
        isGlobal: true,
        aiSuggested: false,
      });
      toast.success('Global template saved');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Global Upload Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Module</label>
            <select
              value={form.module}
              onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="insurance">🛡️ Insurance</option>
              <option value="service">🔧 Service</option>
              <option value="sales">🚗 Sales</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Make</label>
            <select
              value={form.make}
              onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select make...</option>
              {MAKE_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Portal / Source Name</label>
            <input
              value={form.portalName}
              onChange={e => setForm(f => ({ ...f, portalName: e.target.value }))}
              placeholder="e.g. MG Motors Portal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="block text-xs font-semibold text-gray-600 mb-2">Column Mappings</label>
          <p className="text-xs text-gray-400 mb-3">Enter the exact Excel column names from the portal file and map each to the correct system field.</p>
          <MappingEditor mappingJson={{}} module={form.module} onChange={setMapping} />
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Global Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminUploadSetupPage = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('insurance');
  const [templates, setTemplates] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingDealerships, setLoadingDealerships] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/upload/global-templates');
      setTemplates(res.data.templates || []);
    } catch (err) {
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const loadDealerships = useCallback(async () => {
    setLoadingDealerships(true);
    try {
      const res = await api.get('/dealerships');
      setDealerships(res.data.dealerships || []);
    } catch (err) {
      toast.error('Failed to load dealerships');
    } finally {
      setLoadingDealerships(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    if (activeTab === 'dealerships') loadDealerships();
  }, [activeTab, loadDealerships]);

  const handleSaveTemplate = async (id, mappingJson) => {
    await api.put(`/upload/global-templates/${id}`, { mappingJson });
    loadTemplates();
  };

  const handleDeleteTemplate = async (id) => {
    await api.delete(`/upload/mappings/${id}`);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const handleToggleCustomFormat = async (dealership) => {
    const newVal = !dealership.allowCustomUploadFormat;
    setTogglingId(dealership.id);
    try {
      await api.put(`/dealerships/${dealership.id}`, { allowCustomUploadFormat: newVal });
      setDealerships(prev => prev.map(d => d.id === dealership.id ? { ...d, allowCustomUploadFormat: newVal } : d));
      toast.success(`${dealership.name}: custom upload format ${newVal ? 'allowed' : 'locked to global'}`);
    } catch {
      toast.error('Failed to update');
    } finally {
      setTogglingId(null);
    }
  };

  const MODULE_TABS = [
    { key: 'insurance', label: '🛡️ Insurance' },
    { key: 'service', label: '🔧 Service' },
    { key: 'sales', label: '🚗 Sales' },
    { key: 'dealerships', label: '🏢 Dealership Access' },
  ];

  const filteredTemplates = templates.filter(t => t.module === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">📤 Data Upload Setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define global column mapping templates per make and module. These become the default format for all dealerships.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {MODULE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Templates Tabs */}
        {activeTab !== 'dealerships' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800 capitalize">{activeTab} Templates</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredTemplates.length === 0
                    ? 'No global templates yet'
                    : `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                + New Template
              </button>
            </div>

            {loadingTemplates ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-medium text-gray-700">No global templates for {activeTab}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "+ New Template" to create one, or upload a file as super admin to auto-generate one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Group by make */}
                {[...new Set(filteredTemplates.map(t => t.make))].sort().map(make => {
                  const makeTemplates = filteredTemplates.filter(t => t.make === make);
                  return (
                    <div key={make}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                        {MAKE_LABELS[make] || make}
                      </p>
                      <div className="space-y-2">
                        {makeTemplates.map(t => (
                          <TemplateCard
                            key={t.id}
                            template={t}
                            module={activeTab}
                            onDelete={handleDeleteTemplate}
                            onSave={handleSaveTemplate}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Required fields legend */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Required fields for {activeTab} (marked with *)</p>
              <p className="text-xs text-amber-700">{(REQUIRED_FIELDS[activeTab] || []).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Dealership Access Tab */}
        {activeTab === 'dealerships' && (
          <div>
            <div className="mb-4">
              <h2 className="font-semibold text-gray-800">Dealership Upload Format Access</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Control whether each dealership can save their own column mapping or must use global admin templates.
              </p>
            </div>

            {loadingDealerships ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {dealerships.map(d => {
                  const canCustom = d.allowCustomUploadFormat ?? true;
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {canCustom
                            ? 'Can save custom column mappings'
                            : 'Locked — must use global admin templates'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-medium ${canCustom ? 'text-green-600' : 'text-orange-500'}`}>
                          {canCustom ? 'Custom allowed' : 'Global only'}
                        </span>
                        <button
                          type="button"
                          disabled={togglingId === d.id}
                          onClick={() => handleToggleCustomFormat(d)}
                          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${canCustom ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${canCustom ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTemplateModal
          defaultModule={activeTab !== 'dealerships' ? activeTab : 'insurance'}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadTemplates(); }}
        />
      )}

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
    </div>
  );
};

export default AdminUploadSetupPage;
