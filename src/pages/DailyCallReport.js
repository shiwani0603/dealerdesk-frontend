import React, { useState, useEffect, useCallback } from 'react';
import { reportService, userService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import toast from 'react-hot-toast';

const fmt = (n) => (n === null || n === undefined ? '—' : n);
const pct = (n) => (n === null || n === undefined ? '—' : `${n}%`);

const ColGroup = ({ label, color, children }) => (
  <th colSpan={children} className={`px-2 py-2 text-center text-xs font-bold uppercase tracking-wide border-b border-white ${color}`}>
    {label}
  </th>
);

const SubHeader = ({ label, color = 'text-gray-500', hint }) => (
  <th className="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap select-none" title={hint}>
    <span className={color}>{label}</span>
  </th>
);

const Cell = ({ value, highlight, dim, bold }) => (
  <td className={`px-3 py-2.5 text-center text-sm border-b border-gray-100 ${
    highlight ? 'text-red-600 font-bold' :
    dim ? 'text-gray-300' :
    bold ? 'font-bold text-gray-900' :
    'text-gray-700'
  }`}>
    {value === 0 && dim ? <span className="text-gray-300">—</span> : value}
  </td>
);

const DailyCallReport = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeModule, setActiveModule] = useState('insurance');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    userService.listLocations().then(res => {
      setLocations(res.data?.locations || []);
    }).catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getDailyCalls(selectedDate, activeModule, selectedLocation);
      setRows(res.data?.rows || []);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeModule, selectedLocation]);

  useEffect(() => { loadReport(); }, [loadReport]);

  // Totals row
  const totals = rows.reduce((acc, r) => ({
    freshDue: (acc.freshDue || 0) + r.freshDue,
    followupDue: (acc.followupDue || 0) + r.followupDue,
    totalDue: (acc.totalDue || 0) + r.totalDue,
    done: (acc.done || 0) + r.done,
    pending: (acc.pending || 0) + r.pending,
    totalCalls: (acc.totalCalls || 0) + r.totalCalls,
    connected: (acc.connected || 0) + r.connected,
    notReachable: (acc.notReachable || 0) + r.notReachable,
    appointmentFixed: (acc.appointmentFixed || 0) + r.appointmentFixed,
    won: (acc.won || 0) + r.won,
    lost: (acc.lost || 0) + r.lost,
    overdueCount: (acc.overdueCount || 0) + r.overdueCount,
    next30Count: (acc.next30Count || 0) + r.next30Count,
  }), {});

  const isToday = selectedDate === today;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-full mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Call Report</h1>
            <p className="text-sm text-gray-500">Per-telecaller activity for a given date</p>
          </div>
          <button onClick={loadReport} className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 shadow-sm">
            ↻ Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-wrap items-end gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Date</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="w-8 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm"
              >‹</button>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  const next = d.toISOString().split('T')[0];
                  if (next <= today) setSelectedDate(next);
                }}
                disabled={selectedDate >= today}
                className="w-8 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm disabled:opacity-30"
              >›</button>
              {selectedDate === today && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">Today</span>
              )}
            </div>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Module</label>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button onClick={() => setActiveModule('insurance')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeModule === 'insurance' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                🛡️ Insurance
              </button>
              <button onClick={() => setActiveModule('service')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeModule === 'service' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                🔧 Service
              </button>
            </div>
          </div>

          {/* Location */}
          {locations.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="ALL">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary chips */}
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { label: 'Total Due', value: totals.totalDue, color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Done', value: totals.done, color: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Pending', value: totals.pending, color: totals.pending > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-200' },
              { label: 'Total Calls', value: totals.totalCalls, color: 'bg-gray-50 text-gray-700 border-gray-200' },
              { label: 'Connected', value: totals.connected, color: 'bg-teal-50 text-teal-700 border-teal-200' },
              { label: activeModule === 'insurance' ? 'Won (Payment)' : 'Won (Reported)', value: totals.won, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'Overdue', value: totals.overdueCount, color: totals.overdueCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200' },
            ].map(c => (
              <div key={c.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${c.color}`}>
                <span className="text-xs text-current opacity-70">{c.label}</span>
                <span className="font-bold">{c.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-500">Loading...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-gray-500 font-medium">No data for this date</p>
              <p className="text-gray-400 text-sm mt-1">No telecallers found or no activity recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {/* Group headers */}
                  <tr>
                    <th className="px-5 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50 sticky left-0 z-10">
                      Telecaller
                    </th>
                    <ColGroup label="Due Plans" color="bg-blue-600 text-white" children={3} />
                    <th className="bg-gray-200 border-b border-white" /> {/* divider */}
                    <ColGroup label="Calls Made" color="bg-gray-700 text-white" children={3} />
                    <th className="bg-gray-200 border-b border-white" />
                    <ColGroup label="Appointments" color="bg-amber-500 text-white" children={2} />
                    <th className="bg-gray-200 border-b border-white" />
                    <ColGroup label={activeModule === 'insurance' ? 'Won / Lost' : 'Reported / Lost'} color="bg-emerald-600 text-white" children={2} />
                    <th className="bg-gray-200 border-b border-white" />
                    <ColGroup label="Overdue" color="bg-red-500 text-white" children={2} />
                  </tr>
                  {/* Sub headers */}
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-5 py-2 text-left text-xs text-gray-400 sticky left-0 bg-gray-50 z-10"> </th>
                    <SubHeader label="Fresh" color="text-blue-600" hint="Due today, never called" />
                    <SubHeader label="Repeat" color="text-blue-500" hint="Due today, called before" />
                    <SubHeader label="Total" color="text-blue-700" bold />
                    <th className="bg-gray-100 w-px" />
                    <SubHeader label="Calls" color="text-gray-600" hint="Total calls made today" />
                    <SubHeader label="Connected" color="text-teal-600" hint="Calls where customer responded" />
                    <SubHeader label="No Answer" color="text-gray-400" hint="Not connected outcomes" />
                    <th className="bg-gray-100 w-px" />
                    <SubHeader label="Fixed" color="text-amber-600" hint="Appointments set today" />
                    <SubHeader label="Appt %" color="text-amber-500" hint="Appointment rate" />
                    <th className="bg-gray-100 w-px" />
                    <SubHeader label="Won" color="text-emerald-600" hint={activeModule === 'insurance' ? 'Payment received' : 'Vehicle reported'} />
                    <SubHeader label="Lost+DNC" color="text-red-500" hint="Lost done elsewhere or invalid" />
                    <th className="bg-gray-100 w-px" />
                    <SubHeader label="Overdue" color="text-red-500" hint="Total overdue open plans" />
                    <SubHeader label="Next 30d" color="text-orange-500" hint="Open plans due in next 30 days" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.telecaller.id}
                      className={`hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      {/* Name */}
                      <td className={`px-5 py-2.5 text-sm font-semibold text-gray-900 border-b border-gray-100 sticky left-0 z-10 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        {row.telecaller.name}
                      </td>
                      {/* Due Plans */}
                      <Cell value={fmt(row.freshDue)} dim={row.freshDue === 0} />
                      <Cell value={fmt(row.followupDue)} dim={row.followupDue === 0} />
                      <Cell value={fmt(row.totalDue)} bold={row.totalDue > 0} dim={row.totalDue === 0} />
                      <td className="w-px bg-gray-100 border-b border-gray-100" />
                      {/* Calls Made */}
                      <Cell value={fmt(row.totalCalls)} bold={row.totalCalls > 0} dim={row.totalCalls === 0} />
                      <Cell value={fmt(row.connected)} dim={row.connected === 0} />
                      <Cell value={row.notReachable > 0 ? row.notReachable : 0} dim={row.notReachable === 0} />
                      <td className="w-px bg-gray-100 border-b border-gray-100" />
                      {/* Appointments */}
                      <Cell value={row.appointmentFixed > 0 ? row.appointmentFixed : 0} dim={row.appointmentFixed === 0} />
                      <Cell value={row.totalCalls > 0 ? pct(row.appointmentPct) : '—'} dim={row.appointmentFixed === 0} />
                      <td className="w-px bg-gray-100 border-b border-gray-100" />
                      {/* Won / Lost */}
                      <td className={`px-3 py-2.5 text-center text-sm border-b border-gray-100 font-bold ${row.won > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                        {row.won > 0 ? row.won : '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-center text-sm border-b border-gray-100 ${row.lost > 0 ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                        {row.lost > 0 ? row.lost : '—'}
                      </td>
                      <td className="w-px bg-gray-100 border-b border-gray-100" />
                      {/* Overdue */}
                      <Cell value={fmt(row.overdueCount)} highlight={row.overdueCount > 10} dim={row.overdueCount === 0} />
                      <Cell value={fmt(row.next30Count)} dim={row.next30Count === 0} />
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-gray-900 text-white">
                    <td className="px-5 py-3 text-sm font-bold sticky left-0 bg-gray-900 z-10">Total</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-300">{fmt(totals.freshDue)}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-300">{fmt(totals.followupDue)}</td>
                    <td className="px-3 py-3 text-center text-sm font-bold">{fmt(totals.totalDue)}</td>
                    <td className="w-px" />
                    <td className="px-3 py-3 text-center text-sm font-bold">{fmt(totals.totalCalls)}</td>
                    <td className="px-3 py-3 text-center text-sm text-teal-300">{fmt(totals.connected)}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-400">{fmt(totals.notReachable)}</td>
                    <td className="w-px" />
                    <td className="px-3 py-3 text-center text-sm text-amber-300 font-bold">{fmt(totals.appointmentFixed)}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-400">
                      {totals.totalCalls > 0 ? `${Math.round((totals.appointmentFixed / totals.totalCalls) * 100)}%` : '—'}
                    </td>
                    <td className="w-px" />
                    <td className="px-3 py-3 text-center text-sm text-emerald-300 font-bold">{fmt(totals.won)}</td>
                    <td className="px-3 py-3 text-center text-sm text-red-300 font-bold">{fmt(totals.lost)}</td>
                    <td className="w-px" />
                    <td className="px-3 py-3 text-center text-sm text-red-300 font-bold">{fmt(totals.overdueCount)}</td>
                    <td className="px-3 py-3 text-center text-sm text-orange-300">{fmt(totals.next30Count)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
          <span><b>Fresh</b> = due today, never called before</span>
          <span><b>Repeat</b> = due today, called at least once</span>
          <span><b>Done</b> = distinct plans with a call logged today</span>
          <span><b>Pending</b> = due today but no call logged yet</span>
          <span><b>Next 30d</b> = open plans with follow-up due in next 30 days</span>
        </div>
      </div>

      {showSearch && (
        <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />
      )}
    </div>
  );
};

export default DailyCallReport;
