import React, { useState } from 'react';
import { OUTLET_MODULES, OutletFilterBar } from './OutletTree';

// Linked outlets (rights table): which outlets a user works for — one or many, any module.
// value = [{ locationId, includeSubs }]. Empty = no restriction (all outlets).
const OutletRightsEditor = ({ outlets = [], value = [], onChange }) => {
  const [modFilter, setModFilter] = useState('all');
  const [q, setQ] = useState('');
  const rights = Array.isArray(value) ? value : [];
  const find = (id) => rights.find(r => r.locationId === id);
  const outletModule = (loc) => (Array.isArray(loc.modules) && loc.modules.length === 1 ? loc.modules[0] : null);
  const byId = Object.fromEntries(outlets.map(l => [l.id, l]));
  const moduleOf = Object.fromEntries(OUTLET_MODULES.map(m => [m.key, m]));

  const toggle = (loc) => {
    if (find(loc.id)) onChange(rights.filter(r => r.locationId !== loc.id));
    else onChange([...rights, { locationId: loc.id, includeSubs: !loc.parentId }]);
  };
  const toggleSubs = (loc) =>
    onChange(rights.map(r => (r.locationId === loc.id ? { ...r, includeSubs: !r.includeSubs } : r)));

  const term = q.trim().toLowerCase();
  const hit = (l) => !term || [l.name, l.code, l.city].some(v => (v || '').toLowerCase().includes(term));
  const visible = outlets.filter(l => hit(l) || outlets.some(s => s.parentId === l.id && hit(s)));

  const groups = OUTLET_MODULES.filter(m => modFilter === 'all' || modFilter === m.key).map(m => {
    const inModule = visible.filter(l => outletModule(l) === m.key);
    const mains = inModule.filter(l => !l.parentId || !byId[l.parentId]);
    return { ...m, mains, subsOf: (id) => inModule.filter(l => l.parentId === id) };
  }).filter(g => g.mains.length > 0);

  if (outlets.length === 0) return <p className="text-xs text-gray-400 italic">No outlets set up yet.</p>;

  const Row = ({ loc, isSub, main }) => {
    const r = find(loc.id);
    const mainRight = isSub && main ? find(main.id) : null;
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
          <button type="button" onClick={() => toggleSubs(loc)} title="Click to switch"
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
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      {/* Selected outlets summary */}
      <div className="flex flex-wrap gap-1.5">
        {rights.length === 0 ? (
          <span className="text-xs text-gray-500">No outlet selected = <b>no restriction</b> (all outlets).</span>
        ) : rights.map(r => {
          const loc = byId[r.locationId];
          if (!loc) return null;
          const m = moduleOf[outletModule(loc)];
          return (
            <span key={r.locationId} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${m?.badge || 'bg-gray-100 text-gray-700'}`}>
              {loc.name}{r.includeSubs && subCountOf(outlets, loc.id) > 0 ? ' + subs' : ''}
              <button type="button" onClick={() => toggle(loc)} className="opacity-60 hover:opacity-100" title="Remove">✕</button>
            </span>
          );
        })}
      </div>

      {outlets.length > 4 && (
        <OutletFilterBar outlets={outlets} modFilter={modFilter} setModFilter={setModFilter} q={q} setQ={setQ} />
      )}

      <div className="max-h-60 overflow-y-auto space-y-3">
        {groups.length === 0 && <p className="text-xs text-gray-400 italic">No outlets match.</p>}
        {groups.map(g => (
          <div key={g.key}>
            <p className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-1 ${g.badge}`}>{g.label}</p>
            {g.mains.map(main => (
              <div key={main.id}>
                <Row loc={main} isSub={!!main.parentId} main={byId[main.parentId]} />
                {g.subsOf(main.id).map(sub => <Row key={sub.id} loc={sub} isSub main={main} />)}
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
        Tick every outlet this user works for — as many as needed, in any module. Ticking a <b>main</b> outlet
        includes its sub outlets; click <i>Sub outlets: Included</i> to switch that off and tick subs one by one.
      </p>
    </div>
  );
};

const subCountOf = (outlets, id) => outlets.filter(l => l.parentId === id).length;

export default OutletRightsEditor;
