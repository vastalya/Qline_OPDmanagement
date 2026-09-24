'use client'

import { useState } from 'react'
import { format, subDays } from 'date-fns'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const REPORT_TYPES = [
    { value: 'appointments', label: 'Appointment Summary' },
    { value: 'users', label: 'User Growth Report' },
    { value: 'departments', label: 'Department Breakdown' },
]

const today = format(new Date(), 'yyyy-MM-dd')
const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

export default function AdminReportsPage() {
    const toast = useToast()
    const [reportType, setReportType] = useState('appointments')
    const [dateFrom, setDateFrom] = useState(thirtyDaysAgo)
    const [dateTo, setDateTo] = useState(today)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const generate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setResult(null)
        try {
            const r = await api.get('/api/admin/analytics', { params: { from: dateFrom, to: dateTo } })
            setResult({ type: reportType, analytics: r.data?.analytics, from: dateFrom, to: dateTo })
        } catch {
            toast.error('Failed to generate report')
        } finally {
            setLoading(false)
        }
    }

    const downloadCSV = () => {
        if (!result) return
        const { analytics } = result
        const rows = [
            ['Metric', 'Value'],
            ['Total Appointments', analytics.appointments.total],
            ['Completed', analytics.appointments.completed],
            ['Cancelled', analytics.appointments.cancelled],
            ['No-Show', analytics.appointments.noShow],
            ['Total Patients', analytics.users.patients],
            ['Total Doctors', analytics.users.doctors],
            ...(analytics.departmentBreakdown ?? []).map(d => [d.department, d.count]),
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url; a.download = `qline-report-${result.from}-${result.to}.csv`; a.click()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-h1 text-text-primary">Reports</h1>
                <p className="text-body text-text-secondary">Generate and export system reports</p>
            </div>

            <Card>
                <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
                <form onSubmit={generate} className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Report Type</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)}
                            className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                            {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">From</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-caption text-text-secondary mb-1">To</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="w-full h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none" />
                        </div>
                    </div>
                    <Button type="submit" loading={loading}>Generate Report</Button>
                </form>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Report: {REPORT_TYPES.find(r => r.value === result.type)?.label}</CardTitle>
                            <p className="text-caption text-text-secondary">{result.from} · to · {result.to}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={downloadCSV}>⬇ CSV</Button>
                    </CardHeader>
                    <div className="mt-4 space-y-2">
                        {[
                            ['Total Appointments', result.analytics.appointments.total],
                            ['Completed', result.analytics.appointments.completed],
                            ['Cancelled', result.analytics.appointments.cancelled],
                            ['No-Show', result.analytics.appointments.noShow],
                            ['Total Patients', result.analytics.users.patients],
                            ['Total Doctors', result.analytics.users.doctors],
                        ].map(([label, val]) => (
                            <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                                <span className="text-body text-text-secondary">{label}</span>
                                <span className="text-body font-semibold text-text-primary">{val}</span>
                            </div>
                        ))}
                        {result.analytics.departmentBreakdown?.length > 0 && (
                            <>
                                <p className="text-caption text-text-secondary pt-2 uppercase tracking-wide">Department Breakdown</p>
                                {result.analytics.departmentBreakdown.map(d => (
                                    <div key={d.department} className="flex justify-between py-1 border-b border-border last:border-0">
                                        <span className="text-body text-text-secondary">{d.department}</span>
                                        <span className="text-body font-semibold text-text-primary">{d.count}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}
