'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { DEPARTMENTS } from '@/lib/utils'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function DoctorProfilePage() {
    const toast = useToast()
    const { user: authUser } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [form, setForm] = useState({ name: '', phone: '', bio: '', specialization: '', department: '' })

    useEffect(() => {
        api.get('/api/profile')
            .then(r => {
                const u = r.data?.user ?? r.data
                const d = r.data?.doctorProfile
                setForm({
                    name: u.name ?? '',
                    phone: u.phone ?? '',
                    bio: d?.bio ?? '',
                    specialization: d?.specialization ?? '',
                    department: d?.department ?? '',
                })
            })
            .catch(() => toast.error('Failed to load profile'))
            .finally(() => setLoading(false))
    }, [toast])

    const setField = (key) => (e) => { setForm(p => ({ ...p, [key]: e.target.value })); setDirty(true) }

    const handleSave = async () => {
        setSaving(true)
        try {
            await api.put('/api/profile', form)
            toast.success('Profile saved')
            setDirty(false)
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-h1 text-text-primary">My Profile</h1>
                <p className="text-body text-text-secondary">Professional and personal information</p>
            </div>

            {dirty && (
                <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 text-caption text-warning">
                    You have unsaved changes
                </div>
            )}

            {/* Avatar */}
            <Card>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-h2 font-bold text-primary">
                        {(form.name || authUser?.name || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-body font-semibold text-text-primary">{form.name || authUser?.name}</p>
                        <p className="text-caption text-text-secondary capitalize">{authUser?.role}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Full Name</label>
                        <Input value={form.name} onChange={setField('name')} />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Phone</label>
                        <Input value={form.phone} onChange={setField('phone')} placeholder="+1 234 567 8900" />
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader><CardTitle>Professional Details</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Department</label>
                        <select value={form.department} onChange={setField('department')}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            <option value="">Select Department</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Specialization</label>
                        <Input value={form.specialization} onChange={setField('specialization')} placeholder="e.g. Pediatric Cardiologist" />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Bio <span className="text-text-secondary">(for patients)</span></label>
                        <textarea value={form.bio} onChange={setField('bio')} rows={4}
                            placeholder="Describe your expertise and background..."
                            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-body text-text-primary resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none" />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setDirty(false)}>Discard</Button>
                <Button onClick={handleSave} loading={saving}>Save Profile</Button>
            </div>
        </div>
    )
}
