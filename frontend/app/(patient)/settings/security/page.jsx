'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

/**
 * /settings/security page
 * 
 * Functionality:
 * - Change password
 * - View active sessions
 * - Logout all sessions
 */
export default function SecuritySettingsPage() {
  const [activeTab, setActiveTab] = useState('password'); // password, sessions
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loadingSessions, setLoadingSessions] = useState(false);

  const handlePasswordChange  = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/settings/security/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Are you sure? You will be logged out on all devices.')) return;

    setSaving(true);
    try {
      await api.post('/api/settings/security/logout-all');

      setMessage({ type: 'success', text: 'Logged out from all devices' });
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get('/api/settings/security/sessions');
      setSessions(res.data?.sessions || []);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message });
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleLogoutSession = async (sessionId) => {
    setSaving(true);
    try {
      await api.post('/api/settings/security/logout-session', { sessionId });
      setMessage({ type: 'success', text: 'Session signed out' });
      await loadSessions();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link href="/profile" className="text-blue-600 hover:text-blue-700 font-medium mb-4 block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        </div>

        {/* Messages */}
        {message.text && (
          <div
            className={`rounded-lg p-4 border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 bg-white rounded-t-lg">
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => {
              setActiveTab('sessions');
              loadSessions();
            }}
            className={`py-4 px-6 font-medium border-b-2 transition ${
              activeTab === 'sessions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Sessions
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Change Password */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handlePasswordSubmit}
                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || saving}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          )}

          {/* Active Sessions */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <button
                onClick={loadSessions}
                disabled={loadingSessions}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                {loadingSessions ? 'Loading...' : 'Refresh Sessions'}
              </button>

              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No active sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border border-gray-200 rounded-lg flex items-start justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {session.device} {session.current && '(This device)'}
                        </p>
                        <p className="text-sm text-gray-600">{session.ip}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last active: {new Date(session.lastActive).toLocaleString()}
                        </p>
                      </div>
                      {!session.current && (
                        <button
                          onClick={() => handleLogoutSession(session.id)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                        >
                          Sign Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleLogoutAll}
                disabled={sessions.length === 0 || saving}
                className="w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Signing Out...' : 'Sign Out From All Devices'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
