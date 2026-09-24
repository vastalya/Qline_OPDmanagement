'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

const EVENT_TYPES = [
    { key: 'appointmentBooked', label: 'Appointment Booked', desc: 'Send email when patient books appointment' },
    { key: 'appointmentReminder', label: 'Appointment Reminders', desc: 'Send 24h and 2h reminder emails' },
    { key: 'queuePaused', label: 'Queue Paused Alerts', desc: 'Email doctor when queue is paused' },
    { key: 'doctorDelayed', label: 'Doctor Delay Alert', desc: 'Notify patients when doctor is running late' },
]

export default function AdminNotificationSettingsPage() {
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [s, setS] = useState({})

    useEffect(() => {
        api.get('/api/admin/settings')
            .then(r => setS(r.data?.settings ?? {}))
            .catch(() => toast.error('Failed to load'))
            .finally(() => setLoading(false))
    }, [toast])

    const toggle = (key) => {
        setS(p => ({ ...p, notificationsEnabled: { ...p.notificationsEnabled, [key]: !p.notificationsEnabled?.[key] } }))
    }

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/admin/settings', { notificationsEnabled: s.notificationsEnabled })
            toast.success('Notification settings saved')
        } catch { toast.error('Failed to save') }
        finally { setSaving(false) }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Notification Settings</h1>

            <Card>
                <CardHeader><CardTitle>Email Notifications</CardTitle></CardHeader>
                <div className="space-y-4">
                    {EVENT_TYPES.map(t => (
                        <div key={t.key} className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-body font-medium text-text-primary">{t.label}</p>
                                <p className="text-caption text-text-secondary">{t.desc}</p>
                            </div>
                            <button onClick={() => toggle(t.key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${s.notificationsEnabled?.[t.key] ? 'bg-primary' : 'bg-border'}`}>
                                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${s.notificationsEnabled?.[t.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Save Changes</Button>
            </div>
        </div>
    )
}
