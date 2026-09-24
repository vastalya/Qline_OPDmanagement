'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function AdminSchedulingSettingsPage() {
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [s, setS] = useState({})

    useEffect(() => {
        api.get('/api/admin/settings')
            .then(r => setS(r.data?.settings ?? {}))
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false))
    }, [toast])

    const setField = (key) => (e) => setS(p => ({ ...p, [key]: e.target.value }))
    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/admin/settings', {
                defaultSlotDuration: parseInt(s.defaultSlotDuration),
                walkinPercentage: parseInt(s.walkinPercentage),
                bufferTime: parseInt(s.bufferTime),
                cancellationDeadlineHours: parseInt(s.cancellationDeadlineHours),
                noShowTimeoutMinutes: parseInt(s.noShowTimeoutMinutes),
            })
            toast.success('Scheduling settings saved')
        } catch { toast.error('Failed to save') }
        finally { setSaving(false) }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Scheduling Settings</h1>

            <Card>
                <CardHeader><CardTitle>Appointment Defaults</CardTitle></CardHeader>
                <div className="space-y-4">
                    {[
                        ['defaultSlotDuration', 'Default Slot Duration (minutes)'],
                        ['walkinPercentage', 'Walk-in Capacity (% of booked slots)'],
                        ['bufferTime', 'Buffer Time Between Appointments (minutes)'],
                        ['cancellationDeadlineHours', 'Cancellation Deadline (hours before appointment)'],
                        ['noShowTimeoutMinutes', 'No-Show Auto-Mark Timeout (minutes)'],
                    ].map(([key, label]) => (
                        <div key={key}>
                            <label className="block text-caption text-text-secondary mb-1">{label}</label>
                            <Input type="number" value={s[key] ?? ''} onChange={setField(key)} min={1} />
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
