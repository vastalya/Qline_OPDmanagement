'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

/**
 * /settings/account page
 * 
 * Functionality:
 * - Account-level settings
 * - Primary email, alternate contact
 * - Locale, display preferences
 */
export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    primaryEmail: user?.email || '',
    alternateEmail: '',
    locale: 'en-US',
    displayName: user?.firstName + ' ' + user?.lastName || '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/account', settings);

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setIsDirty(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
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

        {/* Email Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Email Addresses</h2>

          <div>
            <label htmlFor="primaryEmail" className="block text-sm font-medium text-gray-700">
              Primary Email
            </label>
            <input
              id="primaryEmail"
              type="email"
              name="primaryEmail"
              value={settings.primaryEmail}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Primary email cannot be changed here. Go to Profile page to update.
            </p>
          </div>

          <div>
            <label htmlFor="alternateEmail" className="block text-sm font-medium text-gray-700">
              Alternate Email
            </label>
            <input
              id="alternateEmail"
              type="email"
              name="alternateEmail"
              value={settings.alternateEmail}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="alternate@example.com"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Preferences</h2>

          <div>
            <label htmlFor="locale" className="block text-sm font-medium text-gray-700">
              Language & Locale
            </label>
            <select
              id="locale"
              name="locale"
              value={settings.locale}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
            </select>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              name="displayName"
              value={settings.displayName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Account Actions</h2>

          <div className="space-y-2">
            <Link
              href="/settings/security"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <p className="font-medium text-gray-900">Security Settings</p>
              <p className="text-sm text-gray-600 mt-1">Change password and manage sessions</p>
            </Link>

            <button className="w-full p-4 border border-red-300 rounded-lg hover:bg-red-50 transition text-left">
              <p className="font-medium text-red-700">Delete Account</p>
              <p className="text-sm text-red-600 mt-1">Permanently delete your account and data</p>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
