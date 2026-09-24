'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { timeAgo, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function AdminUserDetailPage({ params }) {
    const { id } = params
    const toast = useToast()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(false)

    const load = useCallback(() => {
        api.get(`/api/admin/users/${id}`)
            .then(r => setData(r.data))
            .catch(() => toast.error('Failed to load user'))
            .finally(() => setLoading(false))
    }, [id, toast])

    useEffect(() => { load() }, [load])

    const toggleStatus = async () => {
        setToggling(true)
        try {
            const current = data.user.status ?? 'active'
            await api.patch(`/api/admin/users/${id}/status`, { status: current === 'active' ? 'suspended' : 'active' })
            toast.success('Status updated')
            load()
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed')
        } finally {
            setToggling(false)
        }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>
    if (!data) return <p className="text-center py-12 text-text-secondary">User not found</p>

    const { user, doctorProfile, stats, recentAuditLogs } = data

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <Link href="/admin/users" className="text-caption text-primary hover:underline">← Back to Users</Link>
                <h1 className="text-h1 text-text-primary mt-1">User Detail</h1>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-body font-bold text-primary">
                            {(user.name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-body font-semibold text-text-primary">{user.name}</p>
                            <p className="text-caption text-text-secondary">{user.email}</p>
                        </div>
                    </div>
                    <Button variant={user.status === 'suspended' ? 'primary' : 'danger'} size="sm" loading={toggling} onClick={toggleStatus}>
                        {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </Button>
                </CardHeader>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-caption text-text-secondary">Role</p>
                        <p className="text-body font-medium text-text-primary capitalize">{user.role}</p>
                    </div>
                    <div>
                        <p className="text-caption text-text-secondary">Status</p>
                        <p className={`text-body font-medium ${user.status === 'suspended' ? 'text-error' : 'text-success'}`}>
                            {user.status ?? 'active'}
                        </p>
                    </div>
                    <div>
                        <p className="text-caption text-text-secondary">Joined</p>
                        <p className="text-body text-text-primary">{formatDate(user.createdAt)}</p>
                    </div>
                    <div>
                        <p className="text-caption text-text-secondary">Total Appointments</p>
                        <p className="text-body font-medium text-primary">{stats?.totalAppointments ?? 0}</p>
                    </div>
                </div>
            </Card>

            {doctorProfile && (
                <Card>
                    <CardHeader><CardTitle>Doctor Profile</CardTitle></CardHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-caption text-text-secondary">Department</p>
                            <p className="text-body text-text-primary">{doctorProfile.department ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary">Specialization</p>
                            <p className="text-body text-text-primary">{doctorProfile.specialization ?? '—'}</p>
                        </div>
                    </div>
                </Card>
            )}

            {recentAuditLogs?.length > 0 && (
                <Card padding={false}>
                    <div className="px-4 py-3 border-b border-border">
                        <CardTitle>Recent Activity</CardTitle>
                    </div>
                    <div className="divide-y divide-border">
                        {recentAuditLogs.map(log => (
                            <div key={log._id} className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-body text-text-primary">{log.action?.replace(/_/g, ' ')}</p>
                                    <p className="text-caption text-text-secondary">{log.entityType}</p>
                                </div>
                                <p className="text-caption text-text-secondary">{timeAgo(log.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
