'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

/**
 * /settings/notifications page
 * 
 * Functionality:
 * - Toggle notifications by event type
 * - Select channel for each event (in-app, email, SMS)
 * - Global mute toggle
 */
export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState({
    appointmentBooked: { enabled: true, channels: ['in-app', 'email'] },
    appointmentReminder: { enabled: true, channels: ['in-app', 'email'] },
    tokenCalled: { enabled: true, channels: ['in-app', 'email'] },
    docDelayed: { enabled: true, channels: ['in-app', 'email'] },
    queueUpdates: { enabled: true, channels: ['in-app'] },
    systemAlerts: { enabled: true, channels: ['in-app', 'email'] },
  });

  const [globalMute, setGlobalMute] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const notificationTypes = [
    {
      key: 'appointmentBooked',
      label: 'Appointment Booked',
      description: 'When you successfully book an appointment',
    },
    {
      key: 'appointmentReminder',
      label: 'Appointment Reminder',
      description: '24 hours before your scheduled appointment',
    },
    {
      key: 'tokenCalled',
      label: 'Token Called',
      description: 'When your token is called in the queue',
    },
    {
      key: 'docDelayed',
      label: 'Doctor Delayed',
      description: 'When the doctor is running behind schedule',
    },
    {
      key: 'queueUpdates',
      label: 'Queue Updates',
      description: 'Your position and wait time changes',
    },
    {
      key: 'systemAlerts',
      label: 'System Alerts',
      description: 'Important system messages and maintenance notices',
    },
  ];

  const channels = [
    { key: 'in-app', label: 'In-App', icon: '🔔' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'sms', label: 'SMS', icon: '💬' },
  ];

  const handleToggle = (type) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled,
      },
    }));
  };

  const handleChannelToggle = (type, channel) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        channels: prev[type].channels.includes(channel)
          ? prev[type].channels.filter((c) => c !== channel)
          : [...prev[type].channels, channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/notifications', { preferences, globalMute });

      setMessage({ type: 'success', text: 'Notification preferences saved' });
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
          <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
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

        {/* Global Mute */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mute All Notifications</h2>
              <p className="text-sm text-gray-600 mt-1">
                Disable all notifications temporarily
              </p>
            </div>
            <button
              onClick={() => setGlobalMute(!globalMute)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                globalMute ? 'bg-red-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 bg-white rounded-full transition-transform ${
                  globalMute ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div
              key={type.key}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              {/* Type Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{type.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(type.key)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    preferences[type.key].enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 bg-white rounded-full transition-transform ${
                      preferences[type.key].enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Channel Toggles */}
              {preferences[type.key].enabled && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Delivery Channels
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {channels.map((channel) => (
                      <button
                        key={channel.key}
                        onClick={() => handleChannelToggle(type.key, channel.key)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          preferences[type.key].channels.includes(
                            channel.key
                          )
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {channel.icon} {channel.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
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
