'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function AdminIntegrationsSettingsPage() {
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

    const setField = (key) => (e) => setS(p => ({ ...p, [key]: e.target.value }))

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/admin/settings', { emailProvider: s.emailProvider })
            toast.success('Integrations saved')
        } catch { toast.error('Failed to save') }
        finally { setSaving(false) }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Integrations</h1>

            <Card>
                <CardHeader><CardTitle>Email Provider</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Provider</label>
                        <select value={s.emailProvider ?? 'smtp'} onChange={setField('emailProvider')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            <option value="smtp">SMTP</option>
                            <option value="sendgrid">SendGrid</option>
                            <option value="mailgun">Mailgun</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Environment Configuration</CardTitle></CardHeader>
                <p className="text-body text-text-secondary">
                    API keys and secrets are configured via environment variables in your deployment.
                    Review <code className="text-caption bg-bg px-1 rounded">.env.example</code> for required variables.
                </p>
                <div className="mt-4 space-y-2">
                    {[
                        ['SENDGRID_API_KEY', 'SendGrid API Key'],
                        ['MONGODB_URI', 'MongoDB Connection URI'],
                        ['REDIS_HOST', 'Redis Host'],
                        ['JWT_SECRET', 'JWT Secret'],
                        ['MEDICAL_RECORD_ENCRYPTION_KEY', 'Encryption Key'],
                    ].map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-bg border border-border">
                            <div>
                                <p className="text-body text-text-primary">{label}</p>
                                <code className="text-caption text-text-secondary font-mono">{key}</code>
                            </div>
                            <span className={`text-caption px-2 py-0.5 rounded-full ${['MONGODB_URI', 'JWT_SECRET'].includes(key)
                                    ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                }`}>
                                {['MONGODB_URI', 'JWT_SECRET'].includes(key) ? 'Required' : 'Recommended'}
                            </span>
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
