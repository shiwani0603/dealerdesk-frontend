import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ChangePassword = ({ forced = false }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const pwStrength = strength(form.newPassword);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength] || '';
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'][pwStrength] || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (pwStrength < 2) {
      toast.error('Please choose a stronger password.');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(form.currentPassword, form.newPassword);
      toast.success('Password changed successfully!');
      if (forced) {
        updateUser({ mustChangePassword: false });
        navigate('/dashboard', { replace: true });
      } else {
        navigate(-1);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {forced ? 'Set Your Password' : 'Change Password'}
          </h1>
          {forced ? (
            <p className="text-sm text-amber-600 mt-1 bg-amber-50 rounded-lg px-3 py-2 mt-2">
              Your admin has set a temporary password. Please set a new one before continuing.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Hi, {user?.name}. Your password is private — only you know it.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {forced ? 'Temporary Password (from admin)' : 'Current Password'}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-1">
                {showCurrent ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-1">
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
            {/* Strength bar */}
            {form.newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwStrength ? strengthColor : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-500">{strengthLabel} — use uppercase, numbers & symbols for a stronger password</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                form.confirmPassword && form.confirmPassword !== form.newPassword
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="Repeat new password"
              required
              autoComplete="new-password"
            />
            {form.confirmPassword && form.confirmPassword !== form.newPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !form.currentPassword || !form.newPassword || form.newPassword !== form.confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Saving…' : 'Set New Password'}
          </button>

          {!forced && (
            <button type="button" onClick={() => navigate(-1)}
              className="w-full text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors">
              Cancel
            </button>
          )}
        </form>

        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600 mb-2">🔒 Password tips</p>
          <p>• Min. 8 characters</p>
          <p>• Mix uppercase, lowercase, numbers & symbols</p>
          <p>• Don't share it with anyone — not even your admin</p>
          <p>• Admins cannot see your password once set</p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
