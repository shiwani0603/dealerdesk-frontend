import React from 'react';
import { OUTLET_MODULES } from './OutletTree';

// Rights table: which outlets a user can see / be assigned cases of.
// value = [{ locationId, includeSubs }]. Empty = no restriction (all outlets).
const OutletRightsEditor = ({ outlets = [], value = [], onChange }) => {
  const rights = Array.isArray(value) ? value : [];
  const find = (id) => rights.find(r => r.locationId === id);
  const outletModule = (loc) => (Array.isArray(loc.modules) && loc.modules.length === 1 ? loc.modules[0] : null);

  const toggle = (loc) => {
    if (find(loc.id)) onChange(rights.filter(r => r.locationId !== loc.id));
    else onChange([...rights, { locationId: loc.id, includeSubs: !loc.parentId }]);
  };
  const toggleSubs = (loc) =>
    onChange(rights.map(r => (r.locationId === loc.id ? { ...r, includeSubs: !r.includeSubs } : r)));

  const groups = OUTLET_MODULES.map(m => {
    const inModule = outlets.filter(l => outletModule(l) === m.key);
    const mains = inModule.filter(l => !l.parentId);
    return { ...m, mains, subsOf: (id) => inModule.filter(l => l.parentId === id) };
  }).filter(g => g.mains.length > 0);

  if (outlets.length === 0) return <p className="text-xs text-gray-400 italic">No outlets set up yet.</p>;

  const Row = ({ loc, isSub, main }) => {
    const r = find(loc.id);
    const mainRight = isSub ? find(main.id) : null;
    const includedViaMain = isSub && mainRight?.includeSubs;
    const subCount = isSub ? 0 : outlets.filter(l => l.parentId === loc.id).length;
    return (
      <div className={`flex items-center justify-between gap-2 py-1 ${isSub ? 'pl-6' : ''}`}>
        <label className={`flex items-center gap-2 text-sm min-w-0 ${includedViaMain ? '' : 'cursor-pointer'}`}>
          <input type="checkbox" disabled={includedViaMain} checked={!!r || includedViaMain} onChange={() => toggle(loc)} />
          <span className="truncate text-gray-700">{isSub ? '└ ' : '🏢 '}{loc.name}</span>
          {loc.code && <span className="text-xs text-gray-400 font-mono">{loc.code}</span>}
          {includedViaMain && (
            <span className="text-xs text-indigo-600 whitespace-nowrap">✔ included with {main.name}</span>
          )}
        </label>
        {!isSub && r && subCount > 0 && (
          <button type="button" onClick={() => toggleSubs(loc)}
            title="Click to switch"
            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap border ${r.includeSubs
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            {r.includeSubs ? `Sub outlets: Included (${subCount})` : 'Sub outlets: Not included'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3 max-h-72 overflow-y-auto">
      <p className="text-xs text-gray-500">
        Tick each outlet this user works for — you can tick several, in any module.
        Ticking a <b>main</b> outlet also includes its sub outlets; click <i>Sub outlets: Included</i> to switch that off and tick sub outlets one by one.
      </p>
      {groups.map(g => (
        <div key={g.key}>
          <p className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-1 ${g.badge}`}>{g.label}</p>
          {g.mains.map(main => (
            <div key={main.id}>
              <Row loc={main} />
              {g.subsOf(main.id).map(sub => <Row key={sub.id} loc={sub} isSub main={main} />)}
            </div>
          ))}
        </div>
      ))}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
        {rights.length === 0
          ? 'Nothing ticked = no restriction (all outlets).'
          : `Rights on ${rights.length} outlet${rights.length > 1 ? 's' : ''} — user works only with these outlets' data.`}
      </p>
    </div>
  );
};

export default OutletRightsEditor;
