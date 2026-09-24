'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { usePagination } from '@/hooks/usePagination'
import { PAGE_SIZE, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import { StatCardSkeleton } from '@/components/ui/Skeleton'

const STAT_SKELETONS = Array.from({ length: 4 })

/* ── Pure-CSS bar chart ───────────────────────────────────────────────────── */
function BarChart({ bars }) {
    const max = Math.max(...bars.map((b) => b.value), 1)
    return (
        <div className="flex items-end gap-3 h-32">
            {bars.map(({ label, value, color }) => {
                const pct = Math.round((value / max) * 100)
                return (
                    <div key={label} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-caption font-semibold text-text-primary">{value}</span>
                        <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color }} />
                        <span className="text-caption text-text-secondary text-center leading-tight">{label}</span>
                    </div>
                )
            })}
        </div>
    )
}

/* ── Donut / ratio bar ────────────────────────────────────────────────────── */
function RatioBar({ items }) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1
    return (
        <div className="space-y-2">
            {items.map(({ label, value, color }) => {
                const pct = Math.round((value / total) * 100)
                return (
                    <div key={label} className="flex items-center gap-3">
                        <span className="text-caption text-text-secondary w-24 shrink-0">{label}</span>
                        <div className="flex-1 h-3 rounded-full bg-border overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                        </div>
                        <span className="text-caption font-semibold text-text-primary w-8 text-right">{value}</span>
                    </div>
                )
            })}
        </div>
    )
}

export default function AdminDashboardPage() {
    const toast = useToast()
    const [stats, setStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [togglingId, setTogglingId] = useState(null)

    /* ── Audit log filters ────────────────────────────────────────────────── */
    const [auditAction, setAuditAction] = useState('')
    const [auditStart, setAuditStart] = useState('')
    const [auditEnd, setAuditEnd] = useState('')
    const [auditQuery, setAuditQuery] = useState({ action: '', startDate: '', endDate: '' })

    /* ── Load system stats ──────────────────────────────────────────────────── */
    useEffect(() => {
        api.get('/api/admin/stats')
            .then((r) => setStats(r.data?.stats ?? r.data?.data ?? r.data))
            .catch(() => toast.error('Could not load stats'))
            .finally(() => setStatsLoading(false))
    }, [toast])

    /* ── Doctor table with pagination ───────────────────────────────────────── */
    const fetchDoctors = useCallback(
        (page, limit) => api.get('/api/admin/doctors', { params: { page, limit } }),
        []
    )
    // Admin doctors endpoint returns { doctors, pagination } — adapt for usePagination
    const fetchDoctorsAdapted = useCallback(
        async (page, limit) => {
            const r = await fetchDoctors(page, limit)
            const raw = r.data
            return {
                data: {
                    data: raw.doctors ?? [],
                    total: raw.pagination?.total ?? 0,
                    pages: raw.pagination?.pages ?? 1,
                }
            }
        },
        [fetchDoctors]
    )
    const { data: doctors, page, pages, loading: doctorsLoading, fetch: fetchDoctorList, goToPage } =
        usePagination(fetchDoctorsAdapted, PAGE_SIZE)

    useEffect(() => { fetchDoctorList(1) }, [fetchDoctorList])

    /* ── Audit logs with pagination ─────────────────────────────────────────── */
    const fetchAuditLogs = useCallback(
        async (pg, limit) => {
            const r = await api.get('/api/admin/audit-logs', {
                params: {
                    page: pg, limit,
                    ...(auditQuery.action && { action: auditQuery.action }),
                    ...(auditQuery.startDate && { startDate: auditQuery.startDate }),
                    ...(auditQuery.endDate && { endDate: auditQuery.endDate }),
                }
            })
            const raw = r.data
            return {
                data: {
                    data: raw.logs ?? [],
                    total: raw.pagination?.total ?? 0,
                    pages: raw.pagination?.pages ?? 1,
                }
            }
        },
        [auditQuery]
    )
    const {
        data: logs, page: logPage, pages: logPages, loading: logsLoading,
        fetch: fetchLogs, goToPage: goToLogPage
    } = usePagination(fetchAuditLogs, 20)

    useEffect(() => { fetchLogs(1) }, [fetchLogs])

    /* ── Toggle user status ─────────────────────────────────────────────────── */
    const toggleStatus = async (userId, currentStatus) => {
        setTogglingId(userId)
        try {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
            await api.patch(`/api/admin/users/${userId}/status`, { status: newStatus })
            toast.success(`User ${newStatus}`)
            fetchDoctorList(page)
        } catch {
            toast.error('Status update failed')
        } finally {
            setTogglingId(null)
        }
    }

    /* ── Stat cards ─────────────────────────────────────────────────────────── */
    const statCards = stats
        ? [
            { label: 'Total Users', value: stats.users?.total ?? stats.totalUsers ?? '—' },
            { label: 'Doctors', value: stats.users?.doctors ?? stats.totalDoctors ?? '—' },
            { label: "Today's Appointments", value: stats.appointments?.today ?? stats.todayAppointments ?? '—' },
            { label: 'Active Queues', value: stats.queues?.activeToday ?? stats.activeQueues ?? '—' },
        ]
        : []

    /* ── Chart data ─────────────────────────────────────────────────────────── */
    const apptBars = stats
        ? [
            { label: 'Total', value: stats.appointments?.total ?? 0, color: 'var(--color-primary)' },
            { label: 'Completed', value: stats.appointmentStatus?.completed ?? 0, color: '#22c55e' },
            { label: 'Cancelled', value: stats.appointmentStatus?.cancelled ?? 0, color: '#f97316' },
            { label: 'No-show', value: stats.appointmentStatus?.noShow ?? 0, color: '#ef4444' },
        ]
        : []

    const userRatio = stats
        ? [
            { label: 'Patients', value: stats.users?.patients ?? 0, color: 'var(--color-primary)' },
            { label: 'Doctors', value: stats.users?.doctors ?? 0, color: '#8b5cf6' },
            { label: 'Admins', value: stats.users?.admins ?? 0, color: '#f59e0b' },
        ]
        : []

    const handleAuditFilter = (e) => {
        e.preventDefault()
        setAuditQuery({ action: auditAction, startDate: auditStart, endDate: auditEnd })
    }

    return (
        <div className="space-y-8">
            <h1 className="text-h1 text-text-primary">Admin Dashboard</h1>

            {/* ── Stats row ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading
                    ? STAT_SKELETONS.map((_, i) => <StatCardSkeleton key={i} />)
                    : statCards.map((s) => (
                        <Card key={s.label}>
                            <p className="text-caption text-text-secondary uppercase tracking-wide">{s.label}</p>
                            <p className="text-h1 font-bold text-text-primary mt-1">{s.value}</p>
                        </Card>
                    ))}
            </div>

            {/* ── Analytics charts ────────────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Appointments Breakdown</CardTitle>
                        </CardHeader>
                        <BarChart bars={apptBars} />
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>User Distribution</CardTitle>
                            <span className="text-caption text-text-secondary">
                                {stats.users?.total ?? 0} total
                            </span>
                        </CardHeader>
                        <div className="py-2">
                            <RatioBar items={userRatio} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            {userRatio.map((u) => (
                                <div key={u.label} className="rounded-lg bg-bg p-2">
                                    <p className="text-h3 font-bold text-text-primary">{u.value}</p>
                                    <p className="text-caption text-text-secondary">{u.label}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* ── Doctor management table ──────────────────────────────────────── */}
            <Card padding={false}>
                <CardHeader className="p-4">
                    <CardTitle>Doctors</CardTitle>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="w-full text-body">
                        <thead>
                            <tr className="border-b border-border text-caption text-text-secondary uppercase tracking-wide">
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
                                <th className="text-left px-4 py-3 hidden lg:table-cell">Patients/Day</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-right px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {doctorsLoading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 5 }).map((__, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-border rounded-md animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                                : doctors.map((doc) => {
                                    const userId = doc.userId?._id ?? doc.userId
                                    const name = doc.userId?.name ?? doc.name ?? '—'
                                    const status = doc.userId?.status ?? 'active'
                                    const isBusy = togglingId === userId

                                    return (
                                        <tr key={doc._id} className="hover:bg-bg transition-colors">
                                            <td className="px-4 py-3 font-medium text-text-primary">{name}</td>
                                            <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                                                {doc.department ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">
                                                {doc.maxPatientsPerDay ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge status={status} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    loading={isBusy}
                                                    onClick={() => toggleStatus(userId, status)}
                                                >
                                                    {status === 'active' ? 'Suspend' : 'Activate'}
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>

                    {!doctorsLoading && doctors.length === 0 && (
                        <p className="text-center text-text-secondary text-body py-8">No doctors found</p>
                    )}
                </div>

                <div className="p-4">
                    <Pagination page={page} pages={pages} onPageChange={goToPage} loading={doctorsLoading} />
                </div>
            </Card>

            {/* ── Audit log viewer ────────────────────────────────────────────── */}
            <Card padding={false}>
                <CardHeader className="p-4">
                    <CardTitle>Audit Logs</CardTitle>
                </CardHeader>

                {/* Filters */}
                <form onSubmit={handleAuditFilter} className="px-4 pb-4 flex flex-col sm:flex-row gap-3">
                    <Input
                        placeholder="Filter by action…"
                        value={auditAction}
                        onChange={(e) => setAuditAction(e.target.value)}
                        className="sm:w-48"
                    />
                    <div className="flex gap-2 flex-1">
                        <input
                            type="date"
                            value={auditStart}
                            onChange={(e) => setAuditStart(e.target.value)}
                            className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors flex-1"
                        />
                        <input
                            type="date"
                            value={auditEnd}
                            onChange={(e) => setAuditEnd(e.target.value)}
                            className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors flex-1"
                        />
                    </div>
                    <Button type="submit" variant="secondary" size="sm">Filter</Button>
                </form>

                <div className="overflow-x-auto">
                    <table className="w-full text-body">
                        <thead>
                            <tr className="border-b border-border text-caption text-text-secondary uppercase tracking-wide">
                                <th className="text-left px-4 py-3">Timestamp</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">User</th>
                                <th className="text-left px-4 py-3">Action</th>
                                <th className="text-left px-4 py-3 hidden lg:table-cell">Entity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logsLoading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 4 }).map((__, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-border rounded-md animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                                : logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-bg transition-colors">
                                        <td className="px-4 py-3 text-caption text-text-secondary whitespace-nowrap">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <p className="font-medium text-text-primary">{log.userId?.name ?? '—'}</p>
                                            <p className="text-caption text-text-secondary capitalize">{log.userId?.role}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-caption bg-bg px-2 py-0.5 rounded text-primary">
                                                {log.action ?? '—'}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">
                                            {log.entityType ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

                    {!logsLoading && logs.length === 0 && (
                        <p className="text-center text-text-secondary text-body py-8">No audit logs found</p>
                    )}
                </div>

                <div className="p-4">
                    <Pagination page={logPage} pages={logPages} onPageChange={goToLogPage} loading={logsLoading} />
                </div>
            </Card>
        </div>
    )
}
