'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { PAGE_SIZE } from '@/lib/utils'

export default function DoctorNotificationsPage() {
    const toast = useToast()

    const fetchNotifications = useCallback(async (page, limit) => {
        const r = await api.get('/api/notifications', { params: { page, limit } })
        const raw = r.data
        return { data: { data: raw.notifications ?? raw.data ?? [], total: raw.pagination?.total ?? 0, pages: raw.pagination?.pages ?? 1 } }
    }, [])

    const { data: notifications, page, pages, loading, fetch, goToPage } = usePagination(fetchNotifications, PAGE_SIZE)
    useEffect(() => { fetch(1) }, [fetch])

    const markRead = async (id) => {
        await api.patch(`/api/notifications/${id}/read`).catch(() => { })
        fetch(page)
    }

    const deleteNotif = async (id) => {
        await api.delete(`/api/notifications/${id}`).catch(() => toast.error('Failed to delete'))
        fetch(page)
    }

    const markAll = async () => {
        await api.patch('/api/notifications/read-all').catch(() => { })
        fetch(page)
        toast.success('All marked as read')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">Notifications</h1>
                    <p className="text-body text-text-secondary">Your alerts and messages</p>
                </div>
                <Button variant="secondary" size="sm" onClick={markAll}>Mark All Read</Button>
            </div>

            <Card padding={false}>
                <div className="divide-y divide-border">
                    {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="px-4 py-4 animate-pulse">
                                <div className="h-4 bg-border rounded w-3/4 mb-2" />
                                <div className="h-3 bg-border rounded w-1/2" />
                            </div>
                        ))
                        : notifications.length === 0
                            ? <p className="text-center text-text-secondary py-12">No notifications</p>
                            : notifications.map(n => (
                                <div key={n._id} className={`px-4 py-4 flex items-start gap-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                                    <div className="flex-1">
                                        <p className="text-body font-medium text-text-primary">{n.title ?? n.message}</p>
                                        {n.title && <p className="text-caption text-text-secondary mt-0.5">{n.message}</p>}
                                        <p className="text-caption text-text-secondary mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {!n.read && (
                                            <button onClick={() => markRead(n._id)}
                                                className="text-caption text-primary hover:underline">Read</button>
                                        )}
                                        <button onClick={() => deleteNotif(n._id)}
                                            className="text-caption text-error hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                </div>
                <div className="p-4">
                    <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />
                </div>
            </Card>
        </div>
    )
}
