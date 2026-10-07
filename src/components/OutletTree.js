import React from 'react';

export const OUTLET_MODULES = [
  { key: 'insurance', label: '🛡️ Insurance', badge: 'bg-blue-100 text-blue-700' },
  { key: 'service',   label: '🔧 Service',   badge: 'bg-green-100 text-green-700' },
  { key: 'sales',     label: '🚗 Sales',     badge: 'bg-amber-100 text-amber-700' },
];

const outletModule = (loc) => (Array.isArray(loc.modules) && loc.modules.length === 1 ? loc.modules[0] : null);

const MODULE_NAME = { insurance: 'Insurance', service: 'Service', sales: 'Sales' };

// Dropdown label: "basti (basto001) · Service · Sub of mahanager"
export const outletLabel = (loc, all = []) => {
  const mod = outletModule(loc);
  const parent = loc.parentId ? all.find(l => l.id === loc.parentId) : null;
  return [
    `${loc.name}${loc.code ? ` (${loc.code})` : ''}`,
    mod ? MODULE_NAME[mod] : null,
    loc.parentId ? `Sub of ${parent?.name || 'main outlet'}` : 'Main',
  ].filter(Boolean).join(' · ');
};

const OutletRow = ({ loc, isSub, onEdit }) => (
  <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${isSub ? 'bg-white border border-gray-100 ml-6' : 'bg-gray-50'}`}>
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
      <span className="text-gray-400 flex-shrink-0">{isSub ? '└' : '🏢'}</span>
      <span className="text-sm font-medium text-gray-800 truncate">{loc.name}</span>
      {loc.code && <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono">{loc.code}</span>}
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isSub ? 'bg-gray-100 text-gray-500' : 'bg-indigo-100 text-indigo-700'}`}>
        {isSub ? 'Sub' : 'Main'}
      </span>
      {!isSub && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${loc.callingMode === 'central' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}
          title={loc.callingMode === 'central' ? "Main outlet's team calls sub outlets' cases too" : "Each outlet's own team calls its own cases"}>
          📞 {loc.callingMode === 'central' ? 'Central' : 'Local'}
        </span>
      )}
      {loc.city && <span className="text-xs text-gray-400">{loc.city}</span>}
      {loc.isActive === false && <span className="text-xs text-red-500">(inactive)</span>}
    </div>
    {onEdit && (
      <button onClick={() => onEdit(loc)}
        className="text-xs text-gray-400 hover:text-blue-600 flex-shrink-0 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
        Edit
      </button>
    )}
  </div>
);

// Outlets grouped by module, each main outlet followed by its sub outlets
const OutletTree = ({ outlets = [], onEdit }) => {
  const byId = Object.fromEntries(outlets.map(l => [l.id, l]));
  const needsUpdate = outlets.filter(l => !outletModule(l));

  const groups = OUTLET_MODULES.map(mod => {
    const inModule = outlets.filter(l => outletModule(l) === mod.key);
    // A sub whose main is missing/other module is shown as top-level so it is never hidden
    const mains = inModule.filter(l => !l.parentId || !byId[l.parentId] || outletModule(byId[l.parentId]) !== mod.key);
    return { ...mod, mains, subsOf: (id) => inModule.filter(l => l.parentId === id) };
  }).filter(g => g.mains.length > 0);

  if (outlets.length === 0) return <p className="text-xs text-gray-400 italic">No outlets yet</p>;

  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.key}>
          <p className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-2 ${g.badge}`}>{g.label}</p>
          <div className="space-y-1.5">
            {g.mains.map(main => (
              <div key={main.id} className="space-y-1">
                <OutletRow loc={main} onEdit={onEdit} />
                {g.subsOf(main.id).map(sub => <OutletRow key={sub.id} loc={sub} isSub onEdit={onEdit} />)}
              </div>
            ))}
          </div>
        </div>
      ))}

      {needsUpdate.length > 0 && (
        <div>
          <p className="inline-block text-xs font-bold px-2 py-0.5 rounded mb-2 bg-red-100 text-red-700">⚠ Needs one module</p>
          <p className="text-xs text-gray-500 mb-2">These outlets have no module or more than one. Edit each and choose a single module.</p>
          <div className="space-y-1.5">
            {needsUpdate.map(loc => <OutletRow key={loc.id} loc={loc} onEdit={onEdit} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutletTree;
