'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'

const TIMEZONES = [
    'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney',
]
const LANGUAGES = [
    { value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' },
    { value: 'fr', label: 'French' }, { value: 'es', label: 'Spanish' },
    { value: 'ar', label: 'Arabic' },
]

export default function DoctorPreferencesPage() {
    const toast = useToast()
    const [prefs, setPrefs] = useState({
        timezone: 'Asia/Kolkata',
        language: 'en',
        dateFormat: 'MMM d, yyyy',
        timeFormat: '12h',
        reducedMotion: false,
        highContrast: false,
        fontSize: 'default',
    })
    const [saving, setSaving] = useState(false)

    const setField = (key) => (e) => setPrefs(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/settings/preferences', { preferences: prefs })
            toast.success('Preferences saved')
        } catch {
            toast.error('Failed to save preferences')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Preferences</h1>

            <Card>
                <CardHeader><CardTitle>Regional Settings</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Timezone</label>
                        <select value={prefs.timezone} onChange={setField('timezone')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Language</label>
                        <select value={prefs.language} onChange={setField('language')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Date Format</label>
                            <select value={prefs.dateFormat} onChange={setField('dateFormat')}
                                className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                                <option value="MMM d, yyyy">Mar 3, 2026</option>
                                <option value="dd/MM/yyyy">03/03/2026</option>
                                <option value="MM/dd/yyyy">03/03/2026</option>
                                <option value="yyyy-MM-dd">2026-03-03</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">Time Format</label>
                            <select value={prefs.timeFormat} onChange={setField('timeFormat')}
                                className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                                <option value="12h">12-hour (AM/PM)</option>
                                <option value="24h">24-hour</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Accessibility</CardTitle></CardHeader>
                <div className="space-y-4">
                    {[
                        ['reducedMotion', 'Reduced Motion', 'Minimize animations throughout the UI'],
                        ['highContrast', 'High Contrast', 'Increase contrast for better readability'],
                    ].map(([key, label, desc]) => (
                        <div key={key} className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-body font-medium text-text-primary">{label}</p>
                                <p className="text-caption text-text-secondary">{desc}</p>
                            </div>
                            <button onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[key] ? 'bg-primary' : 'bg-border'}`}>
                                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    ))}
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Font Size</label>
                        <select value={prefs.fontSize} onChange={setField('fontSize')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            <option value="small">Small</option>
                            <option value="default">Default</option>
                            <option value="large">Large</option>
                        </select>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Save Preferences</Button>
            </div>
        </div>
    )
}
