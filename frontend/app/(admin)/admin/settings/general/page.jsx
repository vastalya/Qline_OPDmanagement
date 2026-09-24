'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function AdminGeneralSettingsPage() {
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({})

    useEffect(() => {
        api.get('/api/admin/settings')
            .then(r => setSettings(r.data?.settings ?? {}))
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false))
    }, [toast])

    const setField = (key) => (e) => setSettings(p => ({ ...p, [key]: e.target.value }))

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/admin/settings', { hospitalName: settings.hospitalName, supportEmail: settings.supportEmail, timezone: settings.timezone })
            toast.success('Settings saved')
        } catch { toast.error('Failed to save') }
        finally { setSaving(false) }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">General Settings</h1>

            <Card>
                <CardHeader><CardTitle>Hospital Information</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Hospital / Clinic Name</label>
                        <Input value={settings.hospitalName ?? ''} onChange={setField('hospitalName')} placeholder="Qline Medical Center" />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Support Email</label>
                        <Input type="email" value={settings.supportEmail ?? ''} onChange={setField('supportEmail')} placeholder="support@example.com" />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Timezone</label>
                        <select value={settings.timezone ?? ''} onChange={setField('timezone')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            {['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'].map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Save Changes</Button>
            </div>
        </div>
    )
}
