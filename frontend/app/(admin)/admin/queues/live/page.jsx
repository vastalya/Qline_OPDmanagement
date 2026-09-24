'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

export default function AdminLiveQueuesPage() {
    const toast = useToast()
    const [queues, setQueues] = useState([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)

    const load = useCallback(() => {
        api.get('/api/admin/queues/live')
            .then(r => {
                setQueues(r.data?.queues ?? [])
                setLastUpdated(new Date())
            })
            .catch(() => toast.error('Failed to load live queues'))
            .finally(() => setLoading(false))
    }, [toast])

    useEffect(() => {
        load()
        const interval = setInterval(load, 15000)
        return () => clearInterval(interval)
    }, [load])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">Live Queue Monitor</h1>
                    <p className="text-body text-text-secondary">
                        Refreshes every 15s
                        {lastUpdated && <span className="ml-2 text-caption">· Last: {lastUpdated.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <Button variant="secondary" size="sm" onClick={load}>↻ Refresh</Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary" /></div>
            ) : queues.length === 0 ? (
                <Card>
                    <p className="text-center text-text-secondary py-12">No active queues today</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {queues.map(q => (
                        <Card key={q._id}>
                            <CardHeader>
                                <div>
                                    <p className="text-body font-semibold text-text-primary">{q.doctor.name}</p>
                                    <p className="text-caption text-text-secondary">{q.doctor.department}</p>
                                </div>
                                <Badge status={q.status} />
                            </CardHeader>
                            <div className="grid grid-cols-3 gap-3 text-center mt-3 pt-3 border-t border-border">
                                {[
                                    ['Booked', q.totalBooked, 'text-primary'],
                                    ['Waiting', q.waitingCount, 'text-warning'],
                                    ['Done', q.completedCount, 'text-success'],
                                ].map(([label, val, color]) => (
                                    <div key={label}>
                                        <p className={`text-h2 font-bold ${color}`}>{val}</p>
                                        <p className="text-caption text-text-secondary">{label}</p>
                                    </div>
                                ))}
                            </div>
                            {q.currentAppointment && (
                                <div className="mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                                    <p className="text-caption text-primary font-medium">👤 Currently Serving</p>
                                    <p className="text-body text-text-primary">{q.currentAppointment?.patientName ?? `Token #${q.currentAppointment?.tokenNumber ?? '-'}`}</p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

