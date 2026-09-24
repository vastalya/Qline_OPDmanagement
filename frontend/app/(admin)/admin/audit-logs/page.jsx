'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { timeAgo, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { PAGE_SIZE } from '@/lib/utils'

const ACTION_TYPES = ['', 'update_user_status', 'update_appointment', 'configure_schedule', 'create_medical_record']

export default function AdminAuditLogsPage() {
    const toast = useToast()
    const [filters, setFilters] = useState({ action: '', startDate: '', endDate: '' })
    const [query, setQuery] = useState({})

    const fetchLogs = useCallback(async (page, limit) => {
        const r = await api.get('/api/admin/audit-logs', {
            params: { page, limit, ...query }
        })
        const raw = r.data
        return { data: { data: raw.logs ?? [], total: raw.pagination?.total ?? 0, pages: raw.pagination?.pages ?? 1 } }
    }, [query])

    const { data: logs, page, pages, loading, fetch, goToPage } = usePagination(fetchLogs, PAGE_SIZE)
    useEffect(() => { fetch(1) }, [fetch])

    const setF = (key) => (e) => setFilters(p => ({ ...p, [key]: e.target.value }))
    const applyFilter = (e) => {
        e.preventDefault()
        const q = {}
        if (filters.action) q.action = filters.action
        if (filters.startDate) q.startDate = filters.startDate
        if (filters.endDate) q.endDate = filters.endDate
        setQuery(q)
    }
    const clearFilters = () => { setFilters({ action: '', startDate: '', endDate: '' }); setQuery({}) }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-h1 text-text-primary">Audit Logs</h1>
                <p className="text-body text-text-secondary">Full system activity trail</p>
            </div>

            <form onSubmit={applyFilter} className="flex flex-col sm:flex-row gap-3">
                <select value={filters.action} onChange={setF('action')}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                    {ACTION_TYPES.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
                </select>
                <input type="date" value={filters.startDate} onChange={setF('startDate')}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none" />
                <input type="date" value={filters.endDate} onChange={setF('endDate')}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none" />
                <Button type="submit" variant="secondary" size="sm">Apply</Button>
                <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>Clear</Button>
            </form>

            <Card padding={false}>
                <div className="overflow-x-auto">
                    <table className="w-full text-body">
                        <thead>
                            <tr className="border-b border-border text-caption text-text-secondary uppercase tracking-wide">
                                <th className="text-left px-4 py-3">Action</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">Entity</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">User</th>
                                <th className="text-left px-4 py-3">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 4 }).map((__, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-4 bg-border rounded animate-pulse" /></td>
                                    ))}</tr>
                                ))
                                : logs.map(log => (
                                    <tr key={log._id} className="hover:bg-bg transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-text-primary">{log.action?.replace(/_/g, ' ')}</p>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell capitalize">{log.entityType}</td>
                                        <td className="px-4 py-3 text-text-secondary hidden md:table-cell">{log.userId?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-caption text-text-secondary">{timeAgo(log.createdAt)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {!loading && logs.length === 0 && <p className="text-center text-text-secondary py-8">No audit logs found</p>}
                </div>
                <div className="p-4">
                    <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />
                </div>
            </Card>
        </div>
    )
}
