import React, { useState, useEffect, useRef } from 'react';
import { customerService } from '../services/api';
import toast from 'react-hot-toast';

const SearchModal = ({ onClose, onSelectCustomer }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await customerService.search(query);
        setResults(res.data.customers || []);
      } catch (err) {
        toast.error('Search failed');
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-16 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <span className="text-gray-400 text-xl">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, mobile, chassis, registration, policy number..."
            className="flex-1 text-base outline-none text-gray-800 placeholder-gray-400"
          />
          {loading && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length < 3 ? (
            <div className="px-4 py-8 text-center text-gray-400">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm">Type at least 3 characters to search</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-gray-400">
              <p className="text-4xl mb-2">😕</p>
              <p className="text-sm">No customers found for "{query}"</p>
            </div>
          ) : (
            results.map(customer => {
              const primaryMobile = customer.contacts?.find(c => c.contactType === 'mobile' && c.isPrimary)?.value
                || customer.contacts?.find(c => c.contactType === 'mobile')?.value;
              const openInsurance = customer.insurancePlans?.find(p => p.planStatus === 'open');
              const openService = customer.servicePlans?.find(p => p.planStatus === 'open');

              return (
                <div
                  key={customer.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => { onSelectCustomer(customer.id); onClose(); }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{customer.name || 'Unknown'}</p>
                      {customer.hasIncompleteData && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">⚠️ Incomplete</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {customer.registrationNumber || customer.chassisNumber} • {customer.make} {customer.model}
                      {primaryMobile && ` • ${primaryMobile}`}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {openInsurance && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          🛡️ Insurance {openInsurance.nextFollowupDate && new Date(openInsurance.nextFollowupDate) < new Date() ? '⚠️ Overdue' : 'Open'}
                        </span>
                      )}
                      {openService && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          🔧 Service {openService.nextFollowupDate && new Date(openService.nextFollowupDate) < new Date() ? '⚠️ Overdue' : 'Open'}
                        </span>
                      )}
                      {!openInsurance && !openService && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No open plans</span>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-300 ml-3">›</span>
                </div>
              );
            })
          )}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchModal;
