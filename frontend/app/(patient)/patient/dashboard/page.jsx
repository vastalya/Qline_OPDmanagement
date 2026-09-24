'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useSocketEvent } from '@/hooks/useSocket'
import api from '@/lib/api'
import { normalizeApiError, normalizePaginatedResponse } from '@/lib/apiClient'
import { formatDate, formatTime, drName } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'

const UPCOMING_STATUSES = new Set(['booked', 'waiting', 'in_consultation', 'in_progress'])

function pickUpcomingAppointments(list) {
    return [...list]
        .filter((item) => UPCOMING_STATUSES.has(item.status))
        .sort((a, b) => new Date(a.slotStart || a.date) - new Date(b.slotStart || b.date))
}

export default function PatientDashboardPage() {
    const { user } = useAuth()
    const [nextAppointment, setNextAppointment] = useState(null)
    const [recentNotifications, setRecentNotifications] = useState([])
    const [upcomingAppointments, setUpcomingAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const [appointmentsRes, notificationsRes] = await Promise.all([
                api.get('/api/appointments/my-appointments', { params: { page: 1, limit: 8 } }),
                api.get('/api/notifications', { params: { page: 1, limit: 5 } }),
            ])

            const appointments = normalizePaginatedResponse(appointmentsRes, {
                arrayKeys: ['data', 'appointments'],
            }).items

            const notifications = normalizePaginatedResponse(notificationsRes, {
                arrayKeys: ['notifications', 'data', 'items'],
            }).items

            const upcoming = pickUpcomingAppointments(appointments)
            setUpcomingAppointments(upcoming.slice(0, 3))
            setNextAppointment(upcoming[0] || null)
            setRecentNotifications(notifications.slice(0, 5))
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to load dashboard data'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    useSocketEvent('queue:token-called', fetchDashboardData)
    useSocketEvent('appointment:status-changed', fetchDashboardData)
    useSocketEvent('notification', fetchDashboardData)
    useSocketEvent('notification:new', fetchDashboardData)
    useSocketEvent('queue:updated', fetchDashboardData)

    const unreadCount = useMemo(
        () => recentNotifications.filter((n) => !n.read && !n.isRead).length,
        [recentNotifications]
    )

    if (loading) {
        return <LoadingState label="Loading dashboard..." />
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-h1 text-text-primary">
                    Welcome back, {user?.name?.split(' ')[0] || 'Patient'}
                </h1>
                <p className="mt-2 text-body text-text-secondary">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            {error && <ErrorState message={error} onRetry={fetchDashboardData} className="mb-0" />}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="space-y-1 p-6">
                    <p className="text-caption text-text-secondary">Upcoming appointments</p>
                    <p className="text-h2 font-bold text-text-primary">{upcomingAppointments.length}</p>
                </Card>
                <Card className="space-y-1 p-6">
                    <p className="text-caption text-text-secondary">Unread notifications</p>
                    <p className="text-h2 font-bold text-text-primary">{unreadCount}</p>
                </Card>
                <Card className="space-y-1 p-6">
                    <p className="text-caption text-text-secondary">Profile status</p>
                    <p className="text-h2 font-bold text-primary">Active</p>
                </Card>
            </div>

            {nextAppointment ? (
                <Card className="space-y-6 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-h2 font-bold text-text-primary">Next appointment</h2>
                        <Badge status={nextAppointment.status || 'waiting'} />
                    </div>

                    <div className="space-y-4 border-t border-border pt-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-body font-bold text-primary">
                                DR
                            </div>
                            <div>
                                <p className="text-body font-semibold text-text-primary">
                                    {drName(nextAppointment.doctorId?.name)}
                                </p>
                                <p className="text-caption text-text-secondary">
                                    {nextAppointment.doctorId?.department || 'General'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-bg p-4">
                            <div>
                                <p className="text-caption text-text-secondary">Date</p>
                                <p className="text-body font-semibold text-text-primary">
                                    {formatDate(nextAppointment.slotStart || nextAppointment.date)}
                                </p>
                            </div>
                            <div>
                                <p className="text-caption text-text-secondary">Time</p>
                                <p className="text-body font-semibold text-text-primary">
                                    {formatTime(nextAppointment.slotStart || nextAppointment.date)}
                                </p>
                            </div>
                        </div>

                        <Link href={`/appointments/${nextAppointment._id}`} className="inline-block">
                            <Button variant="secondary" size="sm">View appointment</Button>
                        </Link>
                    </div>
                </Card>
            ) : (
                <Card className="p-6">
                    <div className="space-y-4 text-center">
                        <p className="text-text-secondary">No appointments scheduled yet.</p>
                        <Link href="/doctors">
                            <Button>Book your first appointment</Button>
                        </Link>
                    </div>
                </Card>
            )}

            {recentNotifications.length > 0 && (
                <Card className="space-y-4 p-6">
                    <h2 className="text-h2 font-bold text-text-primary">Recent notifications</h2>
                    <div className="space-y-3">
                        {recentNotifications.map((notif) => (
                            <div key={notif._id} className="rounded-lg border border-border bg-bg p-3">
                                <p className="text-body font-medium text-text-primary">{notif.title}</p>
                                <p className="mt-1 text-caption text-text-secondary">{notif.message}</p>
                            </div>
                        ))}
                    </div>
                    <Link href="/notifications">
                        <Button variant="secondary" fullWidth>View all notifications</Button>
                    </Link>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link href="/doctors">
                    <Card hover className="p-6">
                        <div className="space-y-2">
                            <p className="text-caption font-semibold text-primary">FIND</p>
                            <p className="text-body font-semibold text-text-primary">Find doctors</p>
                            <p className="text-caption text-text-secondary">Browse specialists and book quickly.</p>
                        </div>
                    </Card>
                </Link>
                <Link href="/medical-records">
                    <Card hover className="p-6">
                        <div className="space-y-2">
                            <p className="text-caption font-semibold text-primary">RECORDS</p>
                            <p className="text-body font-semibold text-text-primary">Medical records</p>
                            <p className="text-caption text-text-secondary">View your health history and visit notes.</p>
                        </div>
                    </Card>
                </Link>
                <Link href="/profile">
                    <Card hover className="p-6">
                        <div className="space-y-2">
                            <p className="text-caption font-semibold text-primary">PROFILE</p>
                            <p className="text-body font-semibold text-text-primary">Profile settings</p>
                            <p className="text-caption text-text-secondary">Keep your contact details up to date.</p>
                        </div>
                    </Card>
                </Link>
                <Link href="/notifications">
                    <Card hover className="p-6">
                        <div className="space-y-2">
                            <p className="text-caption font-semibold text-primary">ALERTS</p>
                            <p className="text-body font-semibold text-text-primary">Notification center</p>
                            <p className="text-caption text-text-secondary">Track booking and queue updates.</p>
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
