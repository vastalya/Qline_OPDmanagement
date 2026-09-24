'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function AdminProfilePage() {
    const toast = useToast()
    const { user: authUser } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: '', phone: '' })

    useEffect(() => {
        api.get('/api/profile')
            .then(r => {
                const u = r.data?.user ?? r.data
                setForm({ name: u.name ?? '', phone: u.phone ?? '' })
            })
            .catch(() => toast.error('Failed to load profile'))
            .finally(() => setLoading(false))
    }, [toast])

    const setField = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

    const save = async () => {
        setSaving(true)
        try {
            await api.put('/api/profile', form)
            toast.success('Profile saved')
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Admin Profile</h1>

            <Card>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-h2 font-bold text-error">
                        {(form.name || authUser?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-body font-semibold text-text-primary">{form.name || authUser?.name}</p>
                        <p className="text-caption text-text-secondary">System Administrator</p>
                        <p className="text-caption text-text-secondary">{authUser?.email}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Full Name</label>
                        <Input value={form.name} onChange={setField('name')} />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Email Address</label>
                        <Input value={authUser?.email ?? ''} disabled className="opacity-60 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Phone</label>
                        <Input value={form.phone} onChange={setField('phone')} placeholder="+1 234 567 8900" />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} loading={saving}>Save Profile</Button>
            </div>
        </div>
    )
}
