import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import CustomerDetailPanel from '../components/CustomerDetailPanel';

const MAKE_LABEL_MAP = {
  tata: 'Tata', maruti: 'Maruti Suzuki', hyundai: 'Hyundai', honda: 'Honda',
  toyota: 'Toyota', mahindra: 'Mahindra', kia: 'Kia', mg: 'MG',
  renault: 'Renault', nissan: 'Nissan', volkswagen: 'Volkswagen', skoda: 'Skoda',
  jeep: 'Jeep', ford: 'Ford', mercedes: 'Mercedes-Benz', bmw: 'BMW', audi: 'Audi',
  volvo: 'Volvo', isuzu: 'Isuzu', force: 'Force',
};

const SYSTEM_FIELDS = {
  insurance: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'email', 'make', 'model', 'model_head', 'sub_model', 'fuel_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'customer_pan', 'customer_aadhaar', 'customer_dob', 'customer_state',
    'policy_number', 'policy_category', 'policy_type', 'policy_expiry_date',
    'policy_inception_date','policy_issue_date', 'od_expiry_date', 'tp_expiry_date',
    'od_percentage', 'od_premium', 'tp_premium', 'idv_value', 'ncb_percentage',
    'gross_premium', 'net_premium', 'gst_amount', 'insurer_name', 'payment_mode',
    'financer_name', 'outlet_name', 'location_name',
  ],
  service: [
    'chassis_number', 'registration_number', 'engine_number', 'customer_name',
    'mobile', 'email', 'make', 'model', 'model_head', 'sub_model', 'fuel_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'customer_pan', 'customer_dob', 'customer_state',
    'service_type', 'service_date', 'mileage_at_service', 'job_card_number',
    'total_invoice_amount', 'labour_amount', 'parts_amount',
    'service_adviser_name', 'outlet_name', 'location_name',
  ],
  sales: [
    'chassis_number', 'registration_number', 'customer_name', 'mobile',
    'make', 'model', 'model_head', 'sub_model', 'fuel_type',
    'vehicle_purchase_date', 'manufacturing_year',
    'customer_pan', 'customer_dob', 'customer_state',
    'sales_consultant_name', 'outlet_name', 'location_name',
  ],
};

const ServiceOverrideUpload = ({ dealershipId }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (dealershipId) formData.append('dealershipId', dealershipId);
      const res = await api.post('/upload/service-override', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data.results);
      toast.success(`Service override complete: ${res.data.results.updated} plans updated`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 border border-orange-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">📅</div>
        <div>
          <h2 className="font-bold text-gray-900">Service Due Date Override</h2>
          <p className="text-xs text-gray-500">Upload a 2-column file (chassis_number + actual_due_date) to correct service plan due dates</p>
        </div>
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-xs text-orange-700">
        <strong>File format:</strong> Column 1 = <code>chassis_number</code>, Column 2 = <code>actual_due_date</code> (e.g. 15/06/2026)
      </div>
      <div className="flex gap-3 items-center">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
          onChange={e => setFile(e.target.files[0])}
          className="flex-1 text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200" />
        <button onClick={handleUpload} disabled={!file || loading}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
          {loading ? 'Processing...' : 'Upload Override'}
        </button>
      </div>
      {results && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{results.updated}</p>
            <p className="text-xs text-green-600 mt-0.5">Updated</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{results.notFound}</p>
            <p className="text-xs text-yellow-600 mt-0.5">Not Found</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{results.errors}</p>
            <p className="text-xs text-red-600 mt-0.5">Errors</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── GENERATE MISSING PLANS ──────────────────────────────────────────────────
const GeneratePlansCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async (reset = false) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/upload/backfill', { reset });
      setResult(res.data);
      const msg = reset
        ? `Reset & regenerated: ${res.data.servicePlansCreated} service, ${res.data.insurancePlansCreated} insurance plans`
        : `Plans generated: ${res.data.servicePlansCreated} service, ${res.data.insurancePlansCreated} insurance`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate plans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">⚡</span> Generate Missing Plans
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Creates service &amp; insurance follow-up plans from existing customer data.
              Use <strong>Reset &amp; Regenerate</strong> to fix plans with incorrect dates.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => handleGenerate(false)} disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-sm whitespace-nowrap">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '⚡'}
              Generate
            </button>
            <button onClick={() => handleGenerate(true)} disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-sm whitespace-nowrap">
              🔄 Reset &amp; Regenerate
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.servicePlansCreated}</p>
              <p className="text-xs text-green-600 mt-0.5">Service Plans Created</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{result.insurancePlansCreated}</p>
              <p className="text-xs text-blue-600 mt-0.5">Insurance Plans Created</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
              <p className="text-xs text-gray-500 mt-0.5">Already Had Plans</p>
            </div>
            {result.errors > 0 && (
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                <p className="text-xs text-red-500 mt-0.5">Errors</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const UploadPage = () => {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const fileInputRef = useRef(null);

  const [module, setModule] = useState('insurance');
  const [portalName, setPortalName] = useState('');
  const [make, setMake] = useState('');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1);
  const [portals, setPortals] = useState([]);
  const [allowedMakes, setAllowedMakes] = useState([]);

  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [savedMappingExists, setSavedMappingExists] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const dealershipId = user?.dealershipId || '';

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const res = await api.get(`/upload/mappings?dealershipId=${dealershipId}`);
        const loadedMakes = res.data.allowedMakes || [];
        setPortals(res.data.portals || []);
        setAllowedMakes(loadedMakes);
        // Auto-select make if only one is available
        if (loadedMakes.length === 1) setMake(loadedMakes[0]);
      } catch (err) {
        console.error('Failed to load mappings');
      }
    };
    if (dealershipId) loadMappings();
  }, [dealershipId]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handlePreview = async () => {
    if (!file || !portalName || !make) {
      toast.error('Please fill all fields and select a file');
      return;
    }
    setLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('module', module);
      formData.append('portalName', portalName);
      formData.append('make', make);
      formData.append('dealershipId', dealershipId);

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
        toast.success('Saved mapping found and applied!');
      } else {
        toast('No saved mapping. Please map the columns.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to read file');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveMapping = async () => {
    try {
      await api.post('/upload/save-mapping', {
        module, portalName, make, dealershipId,
        mappingJson: mapping,
        aiSuggested: false,
      });
      toast.success('Column mapping saved!');
    } catch (err) {
      toast.error('Failed to save mapping');
    }
  };

  const handleImport = async () => {
    if (Object.keys(mapping).length === 0) {
      toast.error('Please map at least one column before importing');
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('module', module);
      formData.append('portalName', portalName);
      formData.append('make', make);
      formData.append('dealershipId', dealershipId);
      formData.append('mappingJson', JSON.stringify(mapping));

      const res = await api.post('/upload/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data.results);
      setStep(3);
      toast.success('Import completed!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setStep(1);
    setHeaders([]);
    setMapping({});
    setResults(null);
    setPortalName('');
    setMake('');
  };

  const systemFields = SYSTEM_FIELDS[module] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      {/* Generate Missing Plans — prominent at top */}
      <GeneratePlansCard />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-gray-900">📤 Upload Data</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{s}</div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Step 1 — Select File & Details</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Module *</label>
              <div className="flex gap-3">
                {['insurance', 'service', 'sales'].map(m => (
                  <button key={m} onClick={() => setModule(m)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                      module === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {m === 'insurance' ? '🛡️' : m === 'service' ? '🔧' : '🚗'} {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                {allowedMakes.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-700">
                    No makes configured — contact your admin
                  </div>
                ) : allowedMakes.length === 1 ? (
                  <div className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm text-green-700 font-medium">
                    {MAKE_LABEL_MAP[allowedMakes[0]] || allowedMakes[0]}
                  </div>
                ) : (
                  <select
                    value={make}
                    onChange={e => { setMake(e.target.value); setPortalName(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select make...</option>
                    {allowedMakes.map(m => (
                      <option key={m} value={m}>{MAKE_LABEL_MAP[m] || m}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal / Source Name *</label>
                {(() => {
                  const filteredPortals = make
                    ? portals.filter(p => p.makes && p.makes.map(pm => pm.toLowerCase()).includes(make.toLowerCase()))
                    : portals;
                  return (
                    <select
                      value={portalName}
                      onChange={e => setPortalName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">{make ? 'Select portal...' : 'Select make first...'}</option>
                      {filteredPortals.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  );
                })()}
              </div>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div>
                  <p className="text-4xl mb-2">📄</p>
                  <p className="font-semibold text-blue-700">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-500 mt-2 hover:underline">Remove</button>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-2">📁</p>
                  <p className="font-medium text-gray-700">Drop Excel file here or click to browse</p>
                  <p className="text-sm text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>

            <button onClick={handlePreview} disabled={!file || !portalName || !make || loadingPreview}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loadingPreview ? 'Reading file...' : 'Next — Map Columns →'}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Step 2 — Map Columns</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{totalRows} rows in file</span>
                {savedMappingExists && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Saved mapping applied</span>}
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">Match each Excel column to the correct system field. Leave blank to skip.</p>

            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                <div>Excel Column</div>
                <div>System Field</div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {headers.map(header => (
                  <div key={header} className="grid grid-cols-2 gap-4 px-4 py-2 border-b border-gray-100 items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{header}</p>
                      {sampleRows[0] && sampleRows[0][headers.indexOf(header)] !== undefined && (
                        <p className="text-xs text-gray-400 truncate">e.g. {String(sampleRows[0][headers.indexOf(header)]).substring(0, 30)}</p>
                      )}
                    </div>
                    <select
                      value={mapping[header] || ''}
                      onChange={e => {
                        const newMapping = { ...mapping };
                        if (e.target.value) newMapping[header] = e.target.value;
                        else delete newMapping[header];
                        setMapping(newMapping);
                      }}
                      className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                        mapping[header] ? 'border-green-400 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Skip --</option>
                      {systemFields.map(field => {
  const alreadyMapped = Object.values(mapping).includes(field) && mapping[header] !== field;
  return (
    <option key={field} value={field} disabled={alreadyMapped} style={alreadyMapped ? {color:'#ccc'} : {}}>
      {field}{alreadyMapped ? ' ✓' : ''}
    </option>
  );
})}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">← Back</button>
              <button onClick={handleSaveMapping} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">💾 Save Mapping</button>
              <button onClick={handleImport} disabled={importing || Object.keys(mapping).length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {importing ? 'Importing...' : `Import ${totalRows} Records →`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && results && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-6">Step 3 — Import Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{results.totalRows}</p>
                <p className="text-sm text-gray-500 mt-1">Total Rows</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{results.imported}</p>
                <p className="text-sm text-green-600 mt-1">✅ New Imported</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{results.updated}</p>
                <p className="text-sm text-blue-600 mt-1">🔄 Updated</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-700">{results.errors}</p>
                <p className="text-sm text-red-600 mt-1">❌ Errors</p>
              </div>
            </div>

            {results.errorDetails && results.errorDetails.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Error Details:</h3>
                <div className="border border-red-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {results.errorDetails.map((err, i) => (
                    <div key={i} className="px-4 py-2 border-b border-red-100 bg-red-50">
                      <p className="text-sm text-red-700"><span className="font-medium">Row {err.row}:</span> {err.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={resetUpload} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Upload Another File
            </button>
          </div>
        )}
      </div>

      {/* Service Due Date Override Upload */}
      <ServiceOverrideUpload dealershipId={user?.dealershipId} />

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={(customerId) => {
          setSelectedCustomer({ customerId, planId: null, planType: null });
          setShowSearch(false);
        }} />
      )}

      {selectedCustomer && (
        <CustomerDetailPanel customerId={selectedCustomer.customerId} planId={selectedCustomer.planId}
          planType={selectedCustomer.planType} onClose={() => setSelectedCustomer(null)} onLogCall={() => {}} />
      )}
    </div>
  );
};

export default UploadPage;