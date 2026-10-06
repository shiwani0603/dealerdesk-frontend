import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import Navbar from '../components/Navbar';
import SearchModal from '../components/SearchModal';
import OutletTree from '../components/OutletTree';

// Read-only outlet structure for managers — outlets are managed by Super Admin only
const OutletsPage = () => {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    userService.listLocations()
      .then(res => setOutlets(res.data?.locations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearchClick={() => setShowSearch(true)} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Outlets</h1>
          <p className="text-sm text-gray-500">Main and sub outlets of your dealership, by module. Contact Super Admin to add or change outlets.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <OutletTree outlets={outlets} />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
          <span><b>Main</b> = top outlet, also works itself</span>
          <span><b>Sub</b> = outlet that comes under a main outlet</span>
          <span><b>Central</b> = main outlet's team also calls sub outlets' cases</span>
          <span><b>Local</b> = each outlet's own team calls its own cases</span>
        </div>
      </div>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onSelectCustomer={() => setShowSearch(false)} />}
    </div>
  );
};

export default OutletsPage;
