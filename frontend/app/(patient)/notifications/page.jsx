'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/AsyncState'

const TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'appointment_booked', label: 'Appointment Booked' },
    { value: 'appointment_reminder', label: 'Appointment Reminder' },
    { value: 'token_called', label: 'Token Called' },
    { value: 'doctor_delayed', label: 'Doctor Delayed' },
    { value: 'system_alert', label: 'System Alert' },
]

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [filterType, setFilterType] = useState('')

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const res = await api.get('/api/notifications', {
                params: {
                    page,
                    limit: 20,
                    ...(filterType ? { type: filterType } : {}),
                },
            })

            const payload = unwrapApiData(res)
            const list = payload?.notifications ?? payload?.data?.notifications ?? payload?.data ?? []
            const pagination = payload?.pagination ?? payload?.data?.pagination ?? {}

            setNotifications(Array.isArray(list) ? list : [])
            setTotalPages(pagination.pages || 1)
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to load notifications'))
        } finally {
            setLoading(false)
        }
    }, [filterType, page])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications]
    )

    const handleMarkAsRead = async (id) => {
        try {
            await api.patch(`/api/notifications/${id}/read`)
            setNotifications((prev) =>
                prev.map((item) => (item._id === id ? { ...item, read: true } : item))
            )
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to update notification'))
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await api.patch('/api/notifications/read-all')
            setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to update notifications'))
        }
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/api/notifications/${id}`)
            setNotifications((prev) => prev.filter((item) => item._id !== id))
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to delete notification'))
        }
    }

    if (loading) return <LoadingState label="Loading notifications..." />

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-h1 text-text-primary">Notifications</h1>
                    <p className="text-body text-text-secondary">{unreadCount} unread</p>
                </div>
                {unreadCount > 0 && (
                    <Button variant="secondary" onClick={handleMarkAllAsRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            <Card className="p-4">
                <label htmlFor="notification-filter" className="mb-1 block text-caption text-text-secondary">
                    Filter by type
                </label>
                <select
                    id="notification-filter"
                    value={filterType}
                    onChange={(e) => {
                        setPage(1)
                        setFilterType(e.target.value)
                    }}
                    className="h-11 rounded-md border border-border bg-surface px-3 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                    {TYPE_OPTIONS.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </Card>

            {error && <ErrorState message={error} onRetry={fetchNotifications} />}

            {!error && notifications.length === 0 && (
                <EmptyState
                    title="No notifications"
                    description="New alerts will appear here when appointments or queue updates happen."
                />
            )}

            {!error && notifications.length > 0 && (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <Card
                            key={notification._id}
                            className={`flex gap-4 p-4 ${
                                notification.read ? 'border-border' : 'border-primary/40 bg-primary-soft/40'
                            }`}
                        >
                            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                            <div className="flex-1">
                                <h2 className="text-body font-semibold text-text-primary">
                                    {notification.title}
                                </h2>
                                <p className="mt-1 text-body text-text-secondary">
                                    {notification.message}
                                </p>
                                <p className="mt-2 text-caption text-text-secondary">
                                    {new Date(notification.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {!notification.read && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleMarkAsRead(notification._id)}
                                    >
                                        Mark read
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-error hover:text-error"
                                    onClick={() => handleDelete(notification._id)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-body text-text-secondary">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}

