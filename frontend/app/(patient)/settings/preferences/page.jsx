'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

/**
 * /settings/preferences page
 * 
 * Functionality:
 * - Timezone setting
 * - Date/time format (12/24h)
 * - Language selection
 * - Accessibility preferences (reduced motion, high contrast)
 */
export default function PreferencesSettingsPage() {
  const [preferences, setPreferences] = useState({
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en-US',
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setPreferences((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/preferences', preferences);

      setMessage({ type: 'success', text: 'Preferences saved successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Australia/Sydney',
    'UTC',
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link href="/profile" className="text-blue-600 hover:text-blue-700 font-medium mb-4 block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
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

        {/* Date & Time Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Date & Time</h2>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={preferences.timezone}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700">
              Date Format
            </label>
            <select
              id="dateFormat"
              name="dateFormat"
              value={preferences.dateFormat}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/25/2026)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (25/12/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-25)</option>
            </select>
          </div>

          <div>
            <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700">
              Time Format
            </label>
            <select
              id="timeFormat"
              name="timeFormat"
              value={preferences.timeFormat}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="12h">12-hour (2:30 PM)</option>
              <option value="24h">24-hour (14:30)</option>
            </select>
          </div>
        </div>

        {/* Language & Regional */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Language & Regional</h2>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language
            </label>
            <select
              id="language"
              name="language"
              value={preferences.language}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="pt-PT">Portuguese</option>
              <option value="ja-JP">Japanese</option>
              <option value="zh-CN">Chinese (Simplified)</option>
            </select>
          </div>
        </div>

        {/* Accessibility */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Accessibility</h2>

          <div>
            <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700 mb-3">
              Font Size
            </label>
            <div className="flex gap-3">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => setPreferences((prev) => ({ ...prev, fontSize: size }))}
                  className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                    preferences.fontSize === size
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {size === 'small' && 'A'} {size === 'medium' && 'A A'}{' '}
                  {size === 'large' && 'A A A'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label htmlFor="reducedMotion" className="block text-sm font-medium text-gray-700">
                Reduce Motion
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Minimize animations and auto-playing content
              </p>
            </div>
            <input
              id="reducedMotion"
              type="checkbox"
              name="reducedMotion"
              checked={preferences.reducedMotion}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label htmlFor="highContrast" className="block text-sm font-medium text-gray-700">
                High Contrast
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Increase contrast for better visibility
              </p>
            </div>
            <input
              id="highContrast"
              type="checkbox"
              name="highContrast"
              checked={preferences.highContrast}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
