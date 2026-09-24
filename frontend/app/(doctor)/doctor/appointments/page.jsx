'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import api from '@/lib/api'
import { formatTime, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { PAGE_SIZE } from '@/lib/utils'

const STATUSES = ['', 'booked', 'waiting', 'in_consultation', 'completed', 'no_show', 'cancelled']
const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function DoctorAppointmentsPage() {
    const toast = useToast()
    const [date, setDate] = useState(TODAY)
    const [status, setStatus] = useState('')
    const [query, setQuery] = useState({ date: TODAY, status: '' })

    const fetchAppointments = useCallback(async (page, limit) => {
        const r = await api.get('/api/appointments/doctor-appointments', {
            params: { date: query.date, ...(query.status && { status: query.status }), page, limit }
        })
        const raw = r.data
        const appts = raw.appointments ?? raw.data ?? raw ?? []
        return { data: { data: Array.isArray(appts) ? appts : [], total: raw.total ?? appts.length, pages: raw.pages ?? 1 } }
    }, [query])

    const { data: appointments, page, pages, loading, fetch, goToPage } = usePagination(fetchAppointments, PAGE_SIZE)
    useEffect(() => { fetch(1) }, [fetch])

    const applyFilter = (e) => {
        e.preventDefault()
        setQuery({ date, status })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">Appointments</h1>
                    <p className="text-body text-text-secondary">Manage your scheduled appointments</p>
                </div>
            </div>

            {/* Filter bar */}
            <form onSubmit={applyFilter} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors"
                />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none transition-colors"
                >
                    {STATUSES.map(s => (
                        <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>
                    ))}
                </select>
                <Button type="submit" variant="secondary" size="sm">Apply</Button>
            </form>

            <Card padding={false}>
                <div className="overflow-x-auto">
                    <table className="w-full text-body">
                        <thead>
                            <tr className="border-b border-border text-caption text-text-secondary uppercase tracking-wide">
                                <th className="text-left px-4 py-3">Time</th>
                                <th className="text-left px-4 py-3">Patient</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">Token</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-right px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 5 }).map((__, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-border rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                                : appointments.map((appt) => (
                                    <tr key={appt._id} className="hover:bg-bg transition-colors">
                                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                                            {formatTime(appt.slotStart)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-text-primary">{appt.patientId?.name ?? '—'}</p>
                                            <p className="text-caption text-text-secondary">{appt.patientId?.email ?? ''}</p>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">
                                            #{appt.tokenNumber ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge status={appt.status} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/doctor/appointments/${appt._id}`}>
                                                <Button variant="secondary" size="sm">View</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {!loading && appointments.length === 0 && (
                        <p className="text-center text-text-secondary py-8">No appointments for this date</p>
                    )}
                </div>
                <div className="p-4">
                    <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />
                </div>
            </Card>
        </div>
    )
}
