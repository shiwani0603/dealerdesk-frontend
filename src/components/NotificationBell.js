import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '../services/api';
import toast from 'react-hot-toast';

const fd = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return ''; }
};

const TYPE_CONFIG = {
  cross_module:        { icon: '🔀', label: 'Cross-Module Note', color: 'text-blue-600',   bg: 'bg-blue-50' },
  system_auto_close:   { icon: '🔒', label: 'Auto-Closed',       color: 'text-amber-600',  bg: 'bg-amber-50' },
  system_deactivation: { icon: '👤', label: 'User Deactivated',  color: 'text-orange-600', bg: 'bg-orange-50' },
  system_fraud:        { icon: '🚨', label: 'Fraud Attempt',     color: 'text-red-600',    bg: 'bg-red-50' },
  campaign_missed:     { icon: '🎯', label: 'Target Missed',     color: 'text-purple-600', bg: 'bg-purple-50' },
};
const DEFAULT_TYPE = { icon: '🔔', label: 'Alert', color: 'text-gray-600', bg: 'bg-gray-50' };

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [resolving, setResolving] = useState(null);
  const panelRef = useRef(null);

  const load = useCallback(() => {
    notificationService.getAll()
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await notificationService.resolve(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Marked as resolved');
    } catch {
      toast.error('Failed to resolve');
    } finally {
      setResolving(null);
    }
  };

  const count = notifications.length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative px-2.5 py-2 rounded-lg text-sm transition-colors ${
          open ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-84 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden" style={{ width: '340px' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Alerts</span>
              {count > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{count}</span>
              )}
            </div>
            {count > 0 && (
              <button onClick={() => Promise.all(notifications.map(n => notificationService.resolve(n.id))).then(() => { setNotifications([]); toast.success('All cleared'); }).catch(() => {})}
                className="text-xs text-gray-400 hover:text-gray-600">
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {count === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm text-gray-500 font-medium">No unresolved alerts</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.noteType] || DEFAULT_TYPE;
                return (
                  <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{cfg.icon}</span>
                          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-gray-400 ml-auto">{fd(n.createdAt)}</span>
                        </div>
                        {n.customer && (
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {n.customer.name || n.customer.chassisNumber || 'Unknown'}
                            {n.customer.registrationNumber && <span className="font-normal text-gray-400"> · {n.customer.registrationNumber}</span>}
                          </p>
                        )}
                        <p className={`text-xs mt-1 rounded px-2 py-1 leading-snug ${cfg.bg} ${cfg.color}`}>
                          {n.noteText}
                        </p>
                        {n.writtenBy && (
                          <p className="text-xs text-gray-400 mt-1">by {n.writtenBy.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleResolve(n.id)}
                        disabled={resolving === n.id}
                        className="flex-shrink-0 text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:bg-emerald-50 px-2 py-1 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {resolving === n.id ? '…' : '✓'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {count > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">Click ✓ to resolve each alert</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
