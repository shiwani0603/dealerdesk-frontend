import React, { useEffect, useState } from 'react';
import { userService } from '../services/api';
import { OUTLET_MODULES } from './OutletTree';

// Shared report filters: Outlet (a main outlet includes its sub outlets) + Data source.
// value = { outletId: '', dataSource: '' } ('' = all)
export const DATA_SOURCES = [
  { value: '', label: 'All data' },
  { value: 'own', label: 'Own Dealership Data' },
  { value: 'outside', label: 'Outside Data' },
];

// Query string for report APIs: "&outletId=..&dataSource=.."
export const filterQuery = (f = {}) =>
  (f.outletId ? `&outletId=${encodeURIComponent(f.outletId)}` : '')
  + (f.dataSource ? `&dataSource=${encodeURIComponent(f.dataSource)}` : '');

// Main / sub outlet columns from a plan's location (with parent)
export const outletColumns = (loc) => {
  if (!loc) return { main: '—', sub: '' };
  return loc.parentId ? { main: loc.parent?.name || '—', sub: loc.name } : { main: loc.name, sub: '' };
};
export const sourceLabel = (ds) => (ds === 'outside' ? 'Outside Data' : 'Own Dealership Data');

const ReportFilters = ({ value, onChange, showSource = true, module }) => {
  const [outlets, setOutlets] = useState([]);
  useEffect(() => {
    userService.listLocations().then(r => setOutlets(r.data?.locations || [])).catch(() => {});
  }, []);

  const set = (k, v) => onChange({ ...value, [k]: v });
  const outletModule = (l) => (Array.isArray(l.modules) && l.modules.length === 1 ? l.modules[0] : null);
  const groups = OUTLET_MODULES
    .filter(m => !module || m.key === module)
    .map(m => {
      const inModule = outlets.filter(l => outletModule(l) === m.key);
      const mains = inModule.filter(l => !l.parentId || !inModule.some(x => x.id === l.parentId));
      return { ...m, mains, subsOf: (id) => inModule.filter(l => l.parentId === id) };
    })
    .filter(g => g.mains.length > 0);

  const sel = 'px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white';
  return (
    <div className="flex flex-wrap items-center gap-2">
      {outlets.length > 0 && (
        <select value={value.outletId || ''} onChange={e => set('outletId', e.target.value)} className={sel} title="A main outlet includes its sub outlets">
          <option value="">All outlets</option>
          {groups.map(g => (
            <optgroup key={g.key} label={g.label}>
              {g.mains.map(main => [
                <option key={main.id} value={main.id}>
                  🏢 {main.name}{g.subsOf(main.id).length ? ' (+ sub outlets)' : ''}
                </option>,
                ...g.subsOf(main.id).map(sub => (
                  <option key={sub.id} value={sub.id}>&nbsp;&nbsp;&nbsp;└ {sub.name}</option>
                )),
              ])}
            </optgroup>
          ))}
        </select>
      )}
      {showSource && (
        <select value={value.dataSource || ''} onChange={e => set('dataSource', e.target.value)} className={sel}>
          {DATA_SOURCES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      )}
    </div>
  );
};

export default ReportFilters;
