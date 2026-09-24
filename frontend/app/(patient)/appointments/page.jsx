'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { normalizeApiError } from '@/lib/apiClient'
import { formatDate, formatTime, PAGE_SIZE, drName } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { usePagination } from '@/hooks/usePagination'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Pagination from '@/components/ui/Pagination'
import { ConfirmModal } from '@/components/ui/Modal'
import { AppointmentRowSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/AsyncState'

const SKELETONS = Array.from({ length: 5 })
const TRACKABLE_STATUSES = new Set(['booked', 'waiting', 'in_consultation', 'in_progress'])
const CANCELABLE_STATUSES = new Set(['booked', 'waiting', 'in_progress'])

export default function AppointmentsPage() {
    const toast = useToast()
    const [cancelTarget, setCancelTarget] = useState(null)
    const [cancelLoading, setCancelLoading] = useState(false)

    const fetchAppointments = useCallback(
        (page, limit) => api.get('/api/appointments/my-appointments', { params: { page, limit } }),
        []
    )

    const {
        data: appointments,
        page,
        pages,
        loading,
        error,
        fetch,
        goToPage,
    } = usePagination(fetchAppointments, PAGE_SIZE)

    useEffect(() => {
        fetch(1)
    }, [fetch])

    const appointmentsById = useMemo(
        () => appointments.reduce((acc, item) => ({ ...acc, [item._id]: item }), {}),
        [appointments]
    )

    const handleCancel = async () => {
        if (!cancelTarget) return

        setCancelLoading(true)
        try {
            await api.delete(`/api/appointments/${cancelTarget}/cancel`)
            toast.success('Appointment cancelled')
            setCancelTarget(null)
            fetch(page)
        } catch (err) {
            toast.error(normalizeApiError(err, 'Cancellation failed'))
        } finally {
            setCancelLoading(false)
        }
    }

    const selectedAppointment = cancelTarget ? appointmentsById[cancelTarget] : null

    return (
        <div className="space-y-6">
            <h1 className="text-h1 text-text-primary">My Appointments</h1>

            {error && <ErrorState message={error} onRetry={() => fetch(page)} />}

            <div className="space-y-3">
                {loading
                    ? SKELETONS.map((_, i) => <AppointmentRowSkeleton key={i} />)
                    : appointments.map((appointment) => (
                        <Card key={appointment._id} className="flex items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md bg-primary-soft">
                                <span className="text-caption font-medium uppercase text-primary">
                                    {formatDate(appointment.date).split(' ')[0]}
                                </span>
                                <span className="text-h3 font-bold text-primary">
                                    {formatDate(appointment.date).split(' ')[1]?.replace(',', '')}
                                </span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-body-lg font-semibold text-text-primary">
                                    {drName(appointment.doctorId?.name)}
                                </p>
                                <p className="text-body text-text-secondary">
                                    {(appointment.doctorId?.department || 'General')} | {formatTime(appointment.slotStart)} | Token #{appointment.tokenNumber}
                                </p>
                            </div>

                            <div className="shrink-0 space-y-2 text-right">
                                <Badge status={appointment.status} />
                                <div className="flex gap-2">
                                    <Link href={`/appointments/${appointment._id}`}>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </Link>
                                    {TRACKABLE_STATUSES.has(appointment.status) && (
                                        <Link href={`/queue/${appointment._id}`}>
                                            <Button variant="ghost" size="sm">Track</Button>
                                        </Link>
                                    )}
                                    {CANCELABLE_STATUSES.has(appointment.status) && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setCancelTarget(appointment._id)}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
            </div>

            {!loading && !error && appointments.length === 0 && (
                <EmptyState
                    title="No appointments yet"
                    description="Book your first appointment to start your queue history."
                    action={
                        <Link href="/doctors">
                            <Button>Book an appointment</Button>
                        </Link>
                    }
                />
            )}

            <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />

            <ConfirmModal
                isOpen={!!cancelTarget}
                onClose={() => setCancelTarget(null)}
                onConfirm={handleCancel}
                title="Cancel appointment"
                message={
                    selectedAppointment
                        ? `Cancel your appointment with Dr. ${selectedAppointment.doctorId?.name || 'Doctor'}?`
                        : 'Are you sure you want to cancel this appointment?'
                }
                confirmLabel="Yes, cancel"
                loading={cancelLoading}
            />
        </div>
    )
}
