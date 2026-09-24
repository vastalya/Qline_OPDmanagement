'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function DoctorQueueSettingsPage() {
    const toast = useToast()
    const [settings, setSettings] = useState({
        defaultMode: 'fifo',
        autoPauseMinutes: 30,
        noShowAlertThreshold: 3,
        allowWalkIn: true,
        afterHoursClose: '18:00',
    })
    const [saving, setSaving] = useState(false)

    const setField = (key) => (e) => setSettings(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/settings/queue', { queueSettings: settings })
            toast.success('Queue settings saved')
        } catch {
            toast.error('Failed to save queue settings')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Queue Settings</h1>

            <Card>
                <CardHeader><CardTitle>Queue Behavior</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Default Queue Mode</label>
                        <select value={settings.defaultMode} onChange={setField('defaultMode')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            <option value="fifo">FIFO (First In, First Out)</option>
                            <option value="priority">Priority-Based</option>
                            <option value="hybrid">Hybrid (Priority + FIFO)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Auto-Pause if Wait Exceeds (minutes)</label>
                        <Input type="number" value={settings.autoPauseMinutes} onChange={setField('autoPauseMinutes')} min={5} max={120} />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Alert me after this many No-Shows</label>
                        <Input type="number" value={settings.noShowAlertThreshold} onChange={setField('noShowAlertThreshold')} min={1} max={20} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-body text-text-primary">Allow Walk-In Overrides</p>
                            <p className="text-caption text-text-secondary">Accept walk-in patients beyond booked slots</p>
                        </div>
                        <button onClick={() => setSettings(p => ({ ...p, allowWalkIn: !p.allowWalkIn }))}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${settings.allowWalkIn ? 'bg-primary' : 'bg-border'}`}>
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${settings.allowWalkIn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">After-Hours Queue Close Time</label>
                        <input type="time" value={settings.afterHoursClose} onChange={setField('afterHoursClose')}
                            className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none" />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Save Settings</Button>
            </div>
        </div>
    )
}
