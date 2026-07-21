import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

const MAKE_LIST = [
  { value: 'tata', label: 'Tata' }, { value: 'maruti', label: 'Maruti Suzuki' },
  { value: 'hyundai', label: 'Hyundai' }, { value: 'honda', label: 'Honda' },
  { value: 'toyota', label: 'Toyota' }, { value: 'mahindra', label: 'Mahindra' },
  { value: 'kia', label: 'Kia' }, { value: 'mg', label: 'MG' },
  { value: 'renault', label: 'Renault' }, { value: 'nissan', label: 'Nissan' },
  { value: 'volkswagen', label: 'Volkswagen' }, { value: 'skoda', label: 'Skoda' },
  { value: 'jeep', label: 'Jeep' }, { value: 'ford', label: 'Ford' },
  { value: 'mercedes', label: 'Mercedes-Benz' }, { value: 'bmw', label: 'BMW' },
  { value: 'audi', label: 'Audi' }, { value: 'volvo', label: 'Volvo' },
  { value: 'isuzu', label: 'Isuzu' }, { value: 'force', label: 'Force' },
];
const MAKE_LABELS = Object.fromEntries(MAKE_LIST.map(m => [m.value, m.label]));

const SYSTEM_FIELDS = {
  insurance: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'mobile2', 'mobile3', 'email', 'customer_address',
    'customer_city', 'customer_state', 'customer_pan', 'customer_dob',
    'make', 'model', 'sub_model', 'fuel_type', 'vehicle_color',
    'vehicle_purchase_date', 'manufacturing_year',
    'policy_number', 'policy_category', 'policy_type', 'is_fresh_policy',
    'policy_expiry_date', 'od_expiry_date', 'tp_expiry_date',
    'policy_inception_date', 'policy_issue_date', 'od_percentage', 'od_premium',
    'tp_premium', 'idv_value', 'ncb_percentage', 'gross_premium', 'net_premium',
    'gst_amount', 'insurer_name', 'payment_mode', 'addon_description',
    'renewal_category', 'outlet_code',
  ],
  service: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'mobile2', 'mobile3', 'email', 'customer_address',
    'customer_city', 'customer_state', 'customer_pan', 'customer_dob',
    'make', 'model', 'sub_model', 'fuel_type', 'vehicle_color',
    'vehicle_purchase_date', 'manufacturing_year',
    'service_type', 'service_date', 'mileage_at_service', 'job_card_number',
    'total_invoice_amount', 'labour_amount', 'parts_amount',
    'service_adviser_name', 'service_adviser_mspin',
    'warranty_start_date', 'warranty_end_date', 'campaign_name', 'pickup_type',
    'outlet_code',
  ],
  sales: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'mobile2', 'mobile3', 'email', 'customer_address',
    'customer_city', 'customer_state', 'customer_pan', 'customer_dob',
    'make', 'model', 'model_head', 'sub_model', 'fuel_type', 'vehicle_color',
    'transmission_type', 'charger_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'sales_consultant_name', 'dealer_name', 'invoice_number',
    'sold_by_location', 'outlet_code',
  ],
};

const REQUIRED_FIELDS = {
  insurance: ['chassis_number', 'customer_name', 'mobile', 'policy_expiry_date', 'vehicle_purchase_date', 'outlet_code'],
  service:   ['chassis_number', 'customer_name', 'mobile', 'job_card_number', 'service_date', 'service_type', 'mileage_at_service', 'vehicle_purchase_date', 'outlet_code'],
  sales:     ['chassis_number', 'customer_name', 'mobile', 'vehicle_purchase_date', 'outlet_code'],
};

// ─── Upload Flow Modal (same flow as manager upload page) ─────────────────────
const AdminUploadModal = ({ editTemplate, defaultModule, onClose, onSaved }) => {
  const isEdit = !!editTemplate;
  const fileInputRef = useRef(null);

  // Step 1 state
  const [step, setStep] = useState(1);
  const [module, setModule] = useState(editTemplate?.module || defaultModule || 'insurance');
  const [make, setMake] = useState(editTemplate?.make || '');
  const [portalName, setPortalName] = useState(editTemplate?.portalName || '');
  const [file, setFile] = useState(null);

  // Step 2 state
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [savedMappingExists, setSavedMappingExists] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const systemFields = SYSTEM_FIELDS[module] || [];
  const required = REQUIRED_FIELDS[module] || [];

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handlePreview = async () => {
    if (!file || !portalName.trim() || !make || !module) {
      toast.error('Please fill all fields and select a file');
      return;
    }
    setLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('module', module);
      formData.append('portalName', portalName.trim());
      formData.append('make', make);
      // No dealershipId for super_admin — backend finds global templates
      const res = await api.post('/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeaders(res.data.headers);
      setSampleRows(res.data.sampleRows);
      setMapping(res.data.suggestedMapping || {});
      setSavedMappingExists(res.data.savedMappingExists);
      setTotalRows(res.data.totalRows);
      setStep(2);
      if (res.data.savedMappingExists) {
        toast.success('Existing global mapping loaded — review and update if needed');
      } else {
        toast('AI-suggested mapping applied — verify all columns', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to read file');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    if (Object.keys(mapping).length === 0) {
      toast.error('Map at least one column before saving');
      return;
    }
    setSaving(true);
    try {
      await api.post('/upload/save-mapping', {
        module,
        portalName: portalName.trim(),
        make,
        mappingJson: mapping,
        isGlobal: true,
        aiSuggested: false,
      });
      toast.success(isEdit ? 'Global template updated' : 'Global template saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? `Update Template — ${editTemplate.portalName}` : 'New Global Upload Template'}
            </h2>
            {/* Step indicators */}
            <div className="flex items-center gap-1 ml-2">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
                  {s < 2 && <div className={`w-6 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5">
          {/* Step 1 — Select details & upload file */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Module *</label>
                  {isEdit ? (
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700 capitalize font-medium">
                      {module === 'insurance' ? '🛡️' : module === 'service' ? '🔧' : '🚗'} {module}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {['insurance', 'service', 'sales'].map(m => (
                        <button key={m} type="button" onClick={() => setModule(m)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${module === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {m === 'insurance' ? '🛡️' : m === 'service' ? '🔧' : '🚗'} {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Make *</label>
                  {isEdit ? (
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
                      {MAKE_LABELS[make] || make}
                    </div>
                  ) : (
                    <select value={make} onChange={e => setMake(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select make...</option>
                      {MAKE_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Portal / Source Name *</label>
                  {isEdit ? (
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
                      {portalName}
                    </div>
                  ) : (
                    <input value={portalName} onChange={e => setPortalName(e.target.value)}
                      placeholder="e.g. MG Motors Portal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>
              </div>

              {isEdit && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                  Upload a sample Excel file from <strong>{editTemplate.portalName}</strong> to update the column mapping.
                  The existing mapping will be pre-loaded — just correct any changes and save.
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                  onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }}
                  className="hidden" />
                {file ? (
                  <div>
                    <p className="text-3xl mb-2">📄</p>
                    <p className="font-semibold text-blue-700">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-500 mt-2 hover:underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📁</p>
                    <p className="font-medium text-gray-700">Drop a sample Excel file here or click to browse</p>
                    <p className="text-sm text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">Cancel</button>
                <button
                  onClick={handlePreview}
                  disabled={!file || !portalName.trim() || !make || loadingPreview}
                  className="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingPreview && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loadingPreview ? 'Reading file...' : 'Next — Map Columns →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Map columns */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Map Columns — {portalName}</p>
                  <p className="text-xs text-gray-400">{MAKE_LABELS[make] || make} · {module} · {totalRows} rows</p>
                </div>
                <div className="flex items-center gap-2">
                  {savedMappingExists && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Existing mapping loaded</span>
                  )}
                  <span className="text-xs text-red-500 font-medium">* = required</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                  <div>Excel Column</div>
                  <div>System Field</div>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {headers.map(header => {
                    const isReq = required.includes(mapping[header]);
                    return (
                      <div key={header} className="grid grid-cols-2 gap-4 px-4 py-2 items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{header}</p>
                          {sampleRows[0] && sampleRows[0][headers.indexOf(header)] !== undefined && (
                            <p className="text-xs text-gray-400 truncate">e.g. {String(sampleRows[0][headers.indexOf(header)]).substring(0, 30)}</p>
                          )}
                        </div>
                        <select
                          value={mapping[header] || ''}
                          onChange={e => {
                            const next = { ...mapping };
                            if (e.target.value) next[header] = e.target.value;
                            else delete next[header];
                            setMapping(next);
                          }}
                          className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                            isReq ? 'border-red-400 bg-red-50' : mapping[header] ? 'border-green-400 bg-green-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="">-- Skip --</option>
                          {systemFields.map(f => {
                            const alreadyMapped = Object.values(mapping).includes(f) && mapping[header] !== f;
                            const isRequired = required.includes(f);
                            return (
                              <option key={f} value={f} disabled={alreadyMapped} style={alreadyMapped ? { color: '#ccc' } : {}}>
                                {isRequired ? '* ' : ''}{f}{alreadyMapped ? ' ✓' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Required fields coverage check */}
              {(() => {
                const mapped = new Set(Object.values(mapping));
                const missing = required.filter(f => !mapped.has(f));
                return missing.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Required fields not yet mapped:</p>
                    <p className="text-xs text-amber-700">{missing.join(', ')}</p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs font-semibold text-green-800">✓ All required fields mapped</p>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">
                  ← Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || Object.keys(mapping).length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Saving…' : isEdit ? '💾 Update Global Template' : '🌐 Save as Global Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Template Card ────────────────────────────────────────────────────────────
const TemplateCard = ({ template, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mappingEntries = Object.entries(template.mappingJson || {});
  const colCount = mappingEntries.length;

  const handleDelete = async () => {
    if (!window.confirm(`Delete template "${template.portalName}" (${MAKE_LABELS[template.make] || template.make})?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/upload/mappings/${template.id}`);
      onDelete(template.id);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete');
      setDeleting(false);
    }
  };

  const required = REQUIRED_FIELDS[template.module] || [];
  const mappedFields = new Set(Object.values(template.mappingJson || {}));
  const missingRequired = required.filter(f => !mappedFields.has(f));

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-colors ${expanded ? 'border-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <button
          className="flex items-center gap-3 min-w-0 text-left flex-1"
          onClick={() => setExpanded(e => !e)}
        >
          <span className="text-gray-400 text-xs flex-shrink-0">{expanded ? '▾' : '▸'}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{template.portalName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {MAKE_LABELS[template.make] || template.make}
              <span className="mx-1.5 text-gray-300">·</span>
              {colCount} columns mapped
              {missingRequired.length > 0 && (
                <span className="ml-2 text-amber-500">⚠ {missingRequired.length} required missing</span>
              )}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button
            onClick={() => onEdit(template)}
            className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
          >
            ✏️ Update
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Expandable mapping view */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 pb-4 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current Column Mapping</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-4 px-3 py-2 bg-white border-b text-xs font-semibold text-gray-400 uppercase">
              <div>Excel Column</div>
              <div>System Field</div>
            </div>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {mappingEntries.map(([excelCol, sysField]) => {
                const isReq = required.includes(sysField);
                return (
                  <div key={excelCol} className="grid grid-cols-2 gap-4 px-3 py-1.5 items-center bg-white">
                    <p className="text-xs text-gray-700 truncate">{excelCol}</p>
                    <p className={`text-xs font-medium truncate ${isReq ? 'text-red-600' : 'text-green-700'}`}>
                      {isReq ? '* ' : ''}{sysField}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {missingRequired.length > 0 && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="font-semibold">Required fields not mapped: </span>
              {missingRequired.join(', ')}
            </div>
          )}
        </div>
      )}
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/upload/global-templates');
      setTemplates(res.data.templates || []);
    } catch {
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
    } catch {
      toast.error('Failed to load dealerships');
    } finally {
      setLoadingDealerships(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    if (activeTab === 'dealerships') loadDealerships();
  }, [activeTab, loadDealerships]);

  const handleToggleCustomFormat = async (d) => {
    const newVal = !(d.allowCustomUploadFormat ?? true);
    setTogglingId(d.id);
    try {
      await api.put(`/dealerships/${d.id}`, { allowCustomUploadFormat: newVal });
      setDealerships(prev => prev.map(x => x.id === d.id ? { ...x, allowCustomUploadFormat: newVal } : x));
      toast.success(`${d.name}: custom format ${newVal ? 'allowed' : 'locked to global templates'}`);
    } catch {
      toast.error('Failed to update');
    } finally {
      setTogglingId(null);
    }
  };

  const openNew = () => { setEditingTemplate(null); setShowUploadModal(true); };
  const openEdit = (t) => { setEditingTemplate(t); setShowUploadModal(true); };
  const closeModal = () => { setShowUploadModal(false); setEditingTemplate(null); };
  const afterSave = () => { closeModal(); loadTemplates(); };

  const MODULE_TABS = [
    { key: 'insurance', label: '🛡️ Insurance' },
    { key: 'service',   label: '🔧 Service' },
    { key: 'sales',     label: '🚗 Sales' },
    { key: 'dealerships', label: '🏢 Dealership Access' },
  ];

  const filteredTemplates = templates.filter(t => t.module === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">📤 Data Upload Setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define global column mapping templates per make and module. These become the default format used by all dealerships.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {MODULE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template Tabs */}
        {activeTab !== 'dealerships' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800 capitalize">{activeTab} Templates</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredTemplates.length === 0
                    ? 'No global templates yet'
                    : `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={openNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                + New Template
              </button>
            </div>

            {loadingTemplates ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-medium text-gray-700">No global templates for {activeTab}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "+ New Template", upload a sample Excel file from the portal, and map the columns.
                </p>
                <button onClick={openNew} className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
                  + New Template
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...new Set(filteredTemplates.map(t => t.make))].sort().map(make => (
                  <div key={make}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                      {MAKE_LABELS[make] || make}
                    </p>
                    <div className="space-y-2">
                      {filteredTemplates.filter(t => t.make === make).map(t => (
                        <TemplateCard
                          key={t.id}
                          template={t}
                          onDelete={id => setTemplates(prev => prev.filter(x => x.id !== id))}
                          onEdit={openEdit}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">
                Required fields for {activeTab} <span className="font-normal">(marked with * in column mapping)</span>
              </p>
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
                When OFF, the dealership must use global admin templates and cannot save their own column mappings.
              </p>
            </div>
            {loadingDealerships ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                          {canCustom ? 'Can save custom column mappings' : 'Locked — must use global admin templates'}
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

      {showUploadModal && (
        <AdminUploadModal
          editTemplate={editingTemplate}
          defaultModule={activeTab !== 'dealerships' ? activeTab : 'insurance'}
          onClose={closeModal}
          onSaved={afterSave}
        />
      )}

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
    </div>
  );
};

export default AdminUploadSetupPage;
