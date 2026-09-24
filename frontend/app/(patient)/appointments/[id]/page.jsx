'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import { formatDateTime, formatTime, drName } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/Modal'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'

const CANCELABLE_STATUSES = new Set(['booked', 'waiting', 'in_progress'])
const TRACKABLE_STATUSES = new Set(['booked', 'waiting', 'in_consultation', 'in_progress'])

export default function AppointmentDetailPage() {
    const params = useParams()
    const appointmentId = params.id

    const [appointment, setAppointment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [canceling, setCanceling] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    const fetchAppointment = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const res = await api.get(`/api/appointments/${appointmentId}`)
            const payload = unwrapApiData(res)
            const detail = payload?.data ?? payload

            setAppointment(detail)
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to load appointment'))
        } finally {
            setLoading(false)
        }
    }, [appointmentId])

    useEffect(() => {
        fetchAppointment()
    }, [fetchAppointment])

    const handleCancel = async () => {
        setCanceling(true)
        try {
            await api.delete(`/api/appointments/${appointmentId}/cancel`)
            setAppointment((prev) => ({ ...(prev || {}), status: 'cancelled' }))
            setShowCancelConfirm(false)
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to cancel appointment'))
        } finally {
            setCanceling(false)
        }
    }

    if (loading) return <LoadingState label="Loading appointment..." />

    if (error || !appointment) {
        return (
            <div className="space-y-4">
                <Link href="/appointments" className="text-body text-primary hover:underline">
                    Back to appointments
                </Link>
                <ErrorState message={error || 'Appointment not found'} onRetry={fetchAppointment} />
            </div>
        )
    }

    const doctorName = drName(appointment.doctorId?.name)
    const doctorDepartment = appointment.doctorId?.department || 'General'
    const slotStart = appointment.slotStart || appointment.date
    const slotEnd = appointment.slotEnd
    const canCancel = CANCELABLE_STATUSES.has(appointment.status)
    const canTrackQueue = TRACKABLE_STATUSES.has(appointment.status)

    return (
        <div className="space-y-6">
            <Link href="/appointments" className="text-body text-primary hover:underline">
                Back to appointments
            </Link>

            <Card className="space-y-5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-h1 text-text-primary">Appointment details</h1>
                        <p className="text-body text-text-secondary">ID: {appointment._id}</p>
                    </div>
                    <Badge status={appointment.status} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-bg p-4">
                        <p className="text-caption text-text-secondary">Doctor</p>
                        <p className="text-body font-semibold text-text-primary">{doctorName}</p>
                        <p className="text-caption text-text-secondary">{doctorDepartment}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg p-4">
                        <p className="text-caption text-text-secondary">Token</p>
                        <p className="text-body font-semibold text-text-primary">#{appointment.tokenNumber || '--'}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg p-4">
                        <p className="text-caption text-text-secondary">Start time</p>
                        <p className="text-body font-semibold text-text-primary">{formatDateTime(slotStart)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg p-4">
                        <p className="text-caption text-text-secondary">End time</p>
                        <p className="text-body font-semibold text-text-primary">
                            {slotEnd ? formatTime(slotEnd) : '--'}
                        </p>
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-bg p-4">
                    <p className="text-caption text-text-secondary">Supported actions in MVP</p>
                    <p className="text-body text-text-primary">
                        Queue tracking and cancellation are available while the appointment is active.
                        If your doctor becomes unavailable, the booking will be rescheduled or cancelled automatically.
                    </p>
                </div>
            </Card>

            <Card className="p-6">
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row">
                    {canTrackQueue && (
                        <Link href={`/queue/${appointment._id}`} className="flex-1">
                            <Button variant="secondary" fullWidth>View queue status</Button>
                        </Link>
                    )}
                    {canCancel && (
                        <Button
                            className="flex-1"
                            variant="danger"
                            onClick={() => setShowCancelConfirm(true)}
                        >
                            Cancel appointment
                        </Button>
                    )}
                    {!canTrackQueue && !canCancel && (
                        <p className="text-body text-text-secondary">No actions available for current status.</p>
                    )}
                </div>
            </Card>

            <ConfirmModal
                isOpen={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                onConfirm={handleCancel}
                title="Cancel appointment"
                message="This cannot be undone."
                confirmLabel="Cancel appointment"
                loading={canceling}
            />
        </div>
    )
}
