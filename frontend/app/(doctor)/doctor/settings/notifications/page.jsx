'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const NOTIFICATION_TYPES = [
    { key: 'newAppointment', label: 'New Appointment Booked', description: 'When a patient books an appointment' },
    { key: 'appointmentCancelled', label: 'Appointment Cancelled', description: 'When a patient cancels' },
    { key: 'queuePaused', label: 'Queue Paused Alert', description: 'System alerts about queue state' },
    { key: 'noShowSpike', label: 'No-Show Spike', description: 'When 3+ no-shows occur in one day' },
    { key: 'systemAlert', label: 'System Alerts', description: 'General system notifications' },
]

export default function DoctorNotificationSettingsPage() {
    const toast = useToast()
    const [prefs, setPrefs] = useState({
        newAppointment: true, appointmentCancelled: true, queuePaused: true, noShowSpike: true, systemAlert: true,
    })
    const [channels, setChannels] = useState({ inApp: true, email: true, sms: false })
    const [saving, setSaving] = useState(false)

    const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))
    const toggleChannel = (key) => setChannels(p => ({ ...p, [key]: !p[key] }))

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/settings/notifications', { notificationPreferences: prefs, channels })
            toast.success('Notification preferences saved')
        } catch {
            toast.error('Failed to save notification preferences')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Notification Settings</h1>

            <Card>
                <CardHeader><CardTitle>Notification Types</CardTitle></CardHeader>
                <div className="space-y-4">
                    {NOTIFICATION_TYPES.map(t => (
                        <div key={t.key} className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-body font-medium text-text-primary">{t.label}</p>
                                <p className="text-caption text-text-secondary">{t.description}</p>
                            </div>
                            <button onClick={() => toggle(t.key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[t.key] ? 'bg-primary' : 'bg-border'}`}>
                                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${prefs[t.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Notification Channels</CardTitle></CardHeader>
                <div className="space-y-4">
                    {[['inApp', 'In-App'], ['email', 'Email'], ['sms', 'SMS']].map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                            <p className="text-body text-text-primary">{label}</p>
                            <button onClick={() => toggleChannel(key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${channels[key] ? 'bg-primary' : 'bg-border'}`}>
                                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${channels[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Save Preferences</Button>
            </div>
        </div>
    )
}
