'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function DoctorSecuritySettingsPage() {
    const toast = useToast()
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [loading, setLoading] = useState(false)

    const setField = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.newPassword !== form.confirmPassword) return toast.error('New passwords do not match')
        if (form.newPassword.length < 8) return toast.error('Password must be at least 8 characters')

        setLoading(true)
        try {
            await api.post('/api/auth/change-password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            })
            toast.success('Password changed successfully')
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to change password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-h1 text-text-primary">Security Settings</h1>

            <Card>
                <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Current Password</label>
                        <Input type="password" value={form.currentPassword} onChange={setField('currentPassword')} required />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">New Password</label>
                        <Input type="password" value={form.newPassword} onChange={setField('newPassword')} required minLength={8} />
                    </div>
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Confirm New Password</label>
                        <Input type="password" value={form.confirmPassword} onChange={setField('confirmPassword')} required />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" loading={loading}>Change Password</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
