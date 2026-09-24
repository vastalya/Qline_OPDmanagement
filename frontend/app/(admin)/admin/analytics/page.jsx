'use client'

import { useEffect, useState } from 'react'
import { subDays, format } from 'date-fns'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'

function BarChart({ bars }) {
    const max = Math.max(...bars.map(b => b.value), 1)
    return (
        <div className="flex items-end gap-3 h-32">
            {bars.map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-caption font-semibold text-text-primary">{value}</span>
                    <div className="w-full rounded-t-sm" style={{ height: `${Math.max(Math.round((value / max) * 100), 4)}%`, backgroundColor: color }} />
                    <span className="text-caption text-text-secondary text-center">{label}</span>
                </div>
            ))}
        </div>
    )
}

const PRESETS = [{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }]

export default function AdminAnalyticsPage() {
    const toast = useToast()
    const [analytics, setAnalytics] = useState(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    useEffect(() => {
        setLoading(true)
        api.get('/api/admin/analytics', {
            params: { from: format(subDays(new Date(), days), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }
        })
            .then(r => setAnalytics(r.data?.analytics))
            .catch(() => toast.error('Failed to load analytics'))
            .finally(() => setLoading(false))
    }, [days, toast])

    const kpis = analytics ? [
        { label: 'Total Appointments', value: analytics.appointments.total },
        { label: 'Completed', value: analytics.appointments.completed },
        { label: 'Cancelled', value: analytics.appointments.cancelled },
        { label: 'No-Shows', value: analytics.appointments.noShow },
        { label: 'Total Patients', value: analytics.users.patients },
        { label: 'Total Doctors', value: analytics.users.doctors },
    ] : []

    const bars = analytics ? [
        { label: 'Completed', value: analytics.appointments.completed, color: '#22c55e' },
        { label: 'Cancelled', value: analytics.appointments.cancelled, color: '#f97316' },
        { label: 'No-Show', value: analytics.appointments.noShow, color: '#ef4444' },
    ] : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">System Analytics</h1>
                    <p className="text-body text-text-secondary">Hospital-wide performance metrics</p>
                </div>
                <div className="flex gap-1">
                    {PRESETS.map(p => (
                        <button key={p.days} onClick={() => setDays(p.days)}
                            className={`px-3 py-1 rounded-md text-caption font-medium transition-colors ${days === p.days ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary hover:border-primary'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {loading ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
                    : kpis.map(k => (
                        <Card key={k.label}>
                            <p className="text-caption text-text-secondary uppercase tracking-wide">{k.label}</p>
                            <p className="text-h2 font-bold text-primary mt-1">{k.value}</p>
                        </Card>
                    ))}
            </div>

            {!loading && analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle>Appointment Outcomes</CardTitle></CardHeader>
                        <BarChart bars={bars} />
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Department Distribution</CardTitle></CardHeader>
                        <div className="space-y-2 mt-2">
                            {(analytics.departmentBreakdown ?? []).slice(0, 6).map(d => {
                                const total = analytics.departmentBreakdown.reduce((s, x) => s + x.count, 0)
                                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
                                return (
                                    <div key={d.department}>
                                        <div className="flex justify-between text-caption mb-1">
                                            <span className="text-text-primary">{d.department}</span>
                                            <span className="text-text-secondary">{d.count} ({pct}%)</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-border">
                                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
