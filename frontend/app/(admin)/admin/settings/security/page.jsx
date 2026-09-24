'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function AdminSecuritySettingsPage() {
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [s, setS] = useState({})
    const [newIp, setNewIp] = useState('')

    useEffect(() => {
        api.get('/api/admin/settings')
            .then(r => setS(r.data?.settings ?? {}))
            .catch(() => toast.error('Failed to load'))
            .finally(() => setLoading(false))
    }, [toast])

    const save = async (patch) => {
        setSaving(true)
        try {
            const r = await api.put('/api/admin/settings', { ...s, ...patch })
            setS(r.data?.settings ?? s)
            toast.success('Security settings saved')
        } catch { toast.error('Failed to save') }
        finally { setSaving(false) }
    }

    const addIp = () => {
        if (!newIp) return
        const ips = [...(s.ipWhitelist ?? []), newIp]
        setS(p => ({ ...p, ipWhitelist: ips }))
        setNewIp('')
    }

    const removeIp = (ip) => setS(p => ({ ...p, ipWhitelist: p.ipWhitelist.filter(i => i !== ip) }))

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Security Settings</h1>

            <Card>
                <CardHeader><CardTitle>Session Settings</CardTitle></CardHeader>
                <div>
                    <label className="block text-caption text-text-secondary mb-1">Session Timeout (minutes)</label>
                    <Input type="number" value={s.sessionTimeoutMinutes ?? 60}
                        onChange={e => setS(p => ({ ...p, sessionTimeoutMinutes: parseInt(e.target.value) }))} min={5} />
                </div>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Admin IP Whitelist</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-caption text-text-secondary">Enforce:</span>
                        <button onClick={() => setS(p => ({ ...p, requireIpWhitelist: !p.requireIpWhitelist }))}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${s.requireIpWhitelist ? 'bg-primary' : 'bg-border'}`}>
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${s.requireIpWhitelist ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                </CardHeader>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="192.168.1.1" className="flex-1" />
                        <Button variant="secondary" size="sm" onClick={addIp} type="button">Add IP</Button>
                    </div>
                    <div className="space-y-2">
                        {(s.ipWhitelist ?? []).map(ip => (
                            <div key={ip} className="flex items-center justify-between px-3 py-2 rounded-md bg-bg border border-border">
                                <span className="text-body font-mono text-text-primary">{ip}</span>
                                <button onClick={() => removeIp(ip)} className="text-error text-caption hover:underline">Remove</button>
                            </div>
                        ))}
                        {(s.ipWhitelist ?? []).length === 0 && (
                            <p className="text-caption text-text-secondary">No IPs whitelisted (all admin IPs allowed)</p>
                        )}
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={() => save({})} loading={saving}>Save Changes</Button>
            </div>
        </div>
    )
}
