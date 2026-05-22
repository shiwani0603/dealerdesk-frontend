import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, sub, color, icon }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

const SortableHeader = ({ label, col, sortBy, sortDir, onSort }) => (
  <th
    onClick={() => onSort(col)}
    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
  >
    {label}{' '}
    {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
  </th>
);

const ManagerDashboard = () => {
  useAuth();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [summary, setSummary] = useState(null);
  const [locationStats, setLocationStats] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [fromDate, setFromDate] = useState(monthStart.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);
  const [sortBy, setSortBy] = useState('totalCalls');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await dashboardService.getManager();
        setSummary(res.data.summary);
        setLocationStats(res.data.locationStats || []);
      } catch {
        toast.error('Failed to load summary');
      } finally {
        setLoadingSummary(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingPerf(true);
      try {
        const res = await dashboardService.getPerformanceReport(fromDate, toDate);
        setPerformance(res.data.performance || []);
      } catch {
        toast.error('Failed to load performance data');
      } finally {
        setLoadingPerf(false);
      }
    };
    load();
  }, [fromDate, toDate]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const getValue = (row, col) => {
    switch (col) {
      case 'totalCalls': return row.totalCalls;
      case 'connectRate': return parseInt(row.connectRate);
      case 'appointments': return row.appointments;
      case 'conversions': return row.conversions.total;
      case 'lost': return row.lost.total;
      case 'conversionRate': return parseInt(row.conversionRate);
      default: return 0;
    }
  };

  const sortedPerformance = [...performance].sort((a, b) => {
    const diff = getValue(a, sortBy) - getValue(b, sortBy);
    return sortDir === 'asc' ? diff : -diff;
  });

  if (loadingSummary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const ins = summary?.insurance || {};
  const svc = summary?.service || {};
  const customers = summary?.customers || {};

  const cols = [
    { key: 'totalCalls', label: 'Calls' },
    { key: 'connectRate', label: 'Connect %' },
    { key: 'appointments', label: 'Appts' },
    { key: 'conversions', label: 'Won' },
    { key: 'lost', label: 'Lost' },
    { key: 'conversionRate', label: 'Conv. Rate' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Dealership-wide performance overview</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Open Plans"
            value={(ins.totalOpen || 0) + (svc.totalOpen || 0)}
            sub={`${ins.totalOpen || 0} ins · ${svc.totalOpen || 0} svc`}
            color="border-blue-500"
            icon="📋"
          />
          <StatCard
            title="Overdue"
            value={(ins.totalOverdue || 0) + (svc.totalOverdue || 0)}
            sub={`${ins.totalOverdue || 0} ins · ${svc.totalOverdue || 0} svc`}
            color="border-orange-500"
            icon="⚠️"
          />
          <StatCard
            title="Won This Month"
            value={(ins.conversionsThisMonth || 0) + (svc.conversionsThisMonth || 0)}
            sub={`${ins.conversionsThisMonth || 0} ins · ${svc.conversionsThisMonth || 0} svc`}
            color="border-green-500"
            icon="✅"
          />
          <StatCard
            title="Lost Business"
            value={(ins.lostBusiness || 0) + (svc.lostBusiness || 0)}
            sub={`${ins.lostBusiness || 0} ins · ${svc.lostBusiness || 0} svc`}
            color="border-red-500"
            icon="❌"
          />
        </div>

        {/* Customers row */}
        {(customers.total > 0) && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customers.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Own Sale</p>
              <p className="text-2xl font-bold text-green-600">{customers.ownSale || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Non-Own Sale</p>
              <p className="text-2xl font-bold text-gray-600">{customers.nonOwnSale || 0}</p>
            </div>
          </div>
        )}

        {/* Team Performance */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Team Performance</h2>
              <p className="text-sm text-gray-500">Follow-up calls logged per telecaller</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                max={today.toISOString().split('T')[0]}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {loadingPerf ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : sortedPerformance.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400">No telecallers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Telecaller
                    </th>
                    {cols.map((col) => (
                      <SortableHeader
                        key={col.key}
                        label={col.label}
                        col={col.key}
                        sortBy={sortBy}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPerformance.map((row, i) => {
                    const connectPct = parseInt(row.connectRate);
                    const convPct = parseInt(row.conversionRate);
                    return (
                      <tr key={row.telecaller.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                        <td className="px-5 py-3.5 font-medium text-gray-900">{row.telecaller.name}</td>
                        <td className="px-4 py-3.5 text-gray-700">{row.totalCalls}</td>
                        <td className="px-4 py-3.5 font-medium">
                          <span
                            className={
                              connectPct >= 60
                                ? 'text-green-600'
                                : connectPct >= 40
                                ? 'text-orange-500'
                                : 'text-red-500'
                            }
                          >
                            {row.connectRate}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-700">{row.appointments}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-green-600 font-medium">{row.conversions.total}</span>
                          <span className="text-gray-400 text-xs ml-1">
                            ({row.conversions.insurance}i·{row.conversions.service}s)
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-red-500">{row.lost.total}</td>
                        <td className="px-4 py-3.5 font-medium">
                          <span
                            className={
                              convPct >= 20
                                ? 'text-green-600'
                                : convPct >= 10
                                ? 'text-orange-500'
                                : 'text-red-500'
                            }
                          >
                            {row.conversionRate}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Location Breakdown — only shown when >1 location */}
        {locationStats.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Location Breakdown</h2>
              <p className="text-sm text-gray-500">Open plans & conversions this month by location</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ins. Open
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Svc. Open
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ins. Won
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Svc. Won
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locationStats.map((row, i) => (
                    <tr key={row.location.id} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{row.location.name}</td>
                      <td className="px-4 py-3.5 text-gray-700">{row.insurance.open}</td>
                      <td className="px-4 py-3.5 text-gray-700">{row.service.open}</td>
                      <td className="px-4 py-3.5 text-green-600 font-medium">{row.insurance.conversionsThisMonth}</td>
                      <td className="px-4 py-3.5 text-green-600 font-medium">{row.service.conversionsThisMonth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelectCustomer={(customerId) => {
            setShowSearch(false);
            setSelectedCustomer({ customerId, planId: null, planType: null });
          }}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailPanel
          customerId={selectedCustomer.customerId}
          planId={selectedCustomer.planId}
          planType={selectedCustomer.planType}
          onClose={() => setSelectedCustomer(null)}
          onLogCall={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
