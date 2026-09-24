'use client'

import { useEffect, useMemo, useState } from 'react'
import { subDays, format } from 'date-fns'
import api from '@/lib/api'
import { normalizeApiError } from '@/lib/apiClient'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCardSkeleton } from '@/components/ui/Skeleton'

const SKELETONS = Array.from({ length: 4 })
const PRESETS = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
]

function BarChart({ items, color = '#0f766e' }) {
    const max = Math.max(...items.map((item) => item.value), 1)
    return (
        <div className="flex h-40 items-end gap-3">
            {items.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-caption font-semibold text-text-primary">{item.value}</span>
                    <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                            height: `${Math.max(8, Math.round((item.value / max) * 100))}%`,
                            backgroundColor: item.color || color,
                        }}
                    />
                    <span className="text-center text-caption text-text-secondary">{item.label}</span>
                </div>
            ))}
        </div>
    )
}

export default function DoctorAnalyticsPage() {
    const toast = useToast()
    const [days, setDays] = useState(30)
    const [loading, setLoading] = useState(true)
    const [dashboard, setDashboard] = useState(null)
    const [rangeAnalytics, setRangeAnalytics] = useState(null)
    const [waitAnalysis, setWaitAnalysis] = useState(null)

    useEffect(() => {
        const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')
        const endDate = format(new Date(), 'yyyy-MM-dd')

        setLoading(true)
        Promise.all([
            api.get('/api/analytics/dashboard'),
            api.get('/api/analytics/range', { params: { startDate, endDate } }),
            api.get('/api/analytics/wait-times', { params: { startDate, endDate } }),
        ])
            .then(([dashboardRes, rangeRes, waitRes]) => {
                setDashboard(dashboardRes.data?.stats ?? dashboardRes.data?.data ?? dashboardRes.data)
                setRangeAnalytics(rangeRes.data?.analytics ?? rangeRes.data?.data ?? rangeRes.data)
                setWaitAnalysis(waitRes.data?.analysis ?? waitRes.data?.data ?? waitRes.data)
            })
            .catch((error) => {
                toast.error(normalizeApiError(error, 'Failed to load analytics'))
            })
            .finally(() => setLoading(false))
    }, [days, toast])

    const periodBreakdown = useMemo(() => {
        if (!rangeAnalytics) return []
        const total = rangeAnalytics.totalAppointments ?? 0
        const completed = rangeAnalytics.completedAppointments ?? 0
        const cancelled = rangeAnalytics.cancelledAppointments ?? 0
        const noShow = rangeAnalytics.noShowAppointments ?? 0
        const pending = Math.max(0, total - completed - cancelled - noShow)
        return [
            { label: 'Completed', value: completed, color: '#16a34a' },
            { label: 'Cancelled', value: cancelled, color: '#f97316' },
            { label: 'No Show', value: noShow, color: '#ef4444' },
            { label: 'Pending', value: pending, color: '#0f766e' },
        ]
    }, [rangeAnalytics])

    const waitBars = useMemo(() => {
        const items = waitAnalysis?.hourlyWaitTimes || []
        return items.slice(0, 8).map((item) => ({
            label: item.hour,
            value: item.averageWaitTime,
        }))
    }, [waitAnalysis])

    const kpis = rangeAnalytics ? [
        { label: 'Period Appointments', value: rangeAnalytics.totalAppointments ?? 0 },
        { label: 'Completed', value: rangeAnalytics.completedAppointments ?? 0 },
        { label: 'Avg Consult Time', value: `${rangeAnalytics.averageConsultTime ?? 0} min` },
        { label: 'Efficiency', value: `${rangeAnalytics.averageEfficiencyRate ?? 0}%` },
    ] : []

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">Analytics</h1>
                    <p className="text-body text-text-secondary">Track queue performance, throughput, and wait time trends.</p>
                </div>
                <div className="flex gap-2">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.days}
                            onClick={() => setDays(preset.days)}
                            className={`rounded-md px-3 py-1.5 text-caption font-medium transition-colors ${
                                days === preset.days
                                    ? 'bg-primary text-white'
                                    : 'border border-border bg-surface text-text-secondary hover:border-primary'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {loading
                    ? SKELETONS.map((_, index) => <StatCardSkeleton key={index} />)
                    : kpis.map((item) => (
                        <Card key={item.label}>
                            <p className="text-caption uppercase tracking-wide text-text-secondary">{item.label}</p>
                            <p className="mt-1 text-h1 font-bold text-text-primary">{item.value}</p>
                        </Card>
                    ))}
            </div>

            {!loading && dashboard ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Today&apos;s Queue</CardTitle>
                        </CardHeader>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Info label="Total" value={dashboard.today?.total ?? 0} />
                            <Info label="Waiting" value={dashboard.today?.waiting ?? 0} />
                            <Info label="In Consultation" value={dashboard.today?.in_progress ?? 0} />
                            <Info label="Completed" value={dashboard.today?.completed ?? 0} />
                            <Info label="No Show" value={dashboard.today?.no_show ?? 0} />
                            <Info label="Queue Status" value={dashboard.queue?.status ?? 'inactive'} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>This Week</CardTitle>
                        </CardHeader>
                        <div className="grid grid-cols-3 gap-4">
                            <Info label="Appointments" value={dashboard.thisWeek?.totalAppointments ?? 0} />
                            <Info label="Completed" value={dashboard.thisWeek?.completedAppointments ?? 0} />
                            <Info label="Efficiency" value={`${dashboard.thisWeek?.efficiencyRate ?? 0}%`} />
                        </div>
                    </Card>
                </div>
            ) : null}

            {!loading && periodBreakdown.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Appointment Breakdown</CardTitle>
                    </CardHeader>
                    <BarChart items={periodBreakdown} />
                </Card>
            ) : null}

            {!loading && waitBars.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Average Wait Time by Hour</CardTitle>
                    </CardHeader>
                    <BarChart items={waitBars} color="#0284c7" />
                </Card>
            ) : null}
        </div>
    )
}

function Info({ label, value }) {
    return (
        <div>
            <p className="text-caption text-text-secondary">{label}</p>
            <p className="text-body-lg font-semibold text-text-primary">{value}</p>
        </div>
    )
}
