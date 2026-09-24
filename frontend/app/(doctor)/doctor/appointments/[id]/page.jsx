'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format, isBefore, startOfToday } from 'date-fns'
import api from '@/lib/api'
import { formatDateTime, timeAgo } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

export default function DoctorAppointmentDetailPage({ params }) {
    const { id } = params
    const toast = useToast()
    const [appointment, setAppointment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState({})
    const [showConfirm, setShowConfirm] = useState(null)

    const load = useCallback(async () => {
        try {
            const response = await api.get(`/api/appointments/${id}`)
            setAppointment(response.data?.appointment ?? response.data?.data ?? response.data)
        } catch {
            toast.error('Failed to load appointment')
        } finally {
            setLoading(false)
        }
    }, [id, toast])

    useEffect(() => {
        load()
    }, [load])

    const doQueueAction = async (actionKey, endpoint) => {
        setActionLoading((prev) => ({ ...prev, [actionKey]: true }))
        try {
            const appointmentDate = format(new Date(appointment?.date || appointment?.slotStart), 'yyyy-MM-dd')
            await api.post(endpoint, { date: appointmentDate }, { headers: { 'X-Action-ID': crypto.randomUUID() } })
            toast.success('Action completed')
            await load()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Action failed')
        } finally {
            setActionLoading((prev) => ({ ...prev, [actionKey]: false }))
            setShowConfirm(null)
        }
    }

    const reassignToNextAvailable = async () => {
        setActionLoading((prev) => ({ ...prev, reassign: true }))
        try {
            await api.post(`/api/appointments/${appointment._id}/reassign-next-available`)
            toast.success('Appointment moved to the next available slot')
            await load()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Reassignment failed')
        } finally {
            setActionLoading((prev) => ({ ...prev, reassign: false }))
        }
    }

    if (loading) {
        return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>
    }

    if (!appointment) {
        return <p className="py-12 text-center text-text-secondary">Appointment not found</p>
    }

    const patient = appointment.patientId
    const appointmentStart = new Date(appointment.slotStart || appointment.date)
    const canTakeQueueActions = ['in_consultation', 'in_progress'].includes(appointment.status)
    const canReassign = ['booked', 'waiting', 'in_consultation', 'in_progress'].includes(appointment.status)
    const isPastActiveAppointment = ['booked', 'waiting'].includes(appointment.status) && isBefore(appointmentStart, startOfToday())

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/doctor/appointments" className="text-caption text-primary hover:underline">
                        Back to Appointments
                    </Link>
                    <h1 className="mt-1 text-h1 text-text-primary">Appointment Detail</h1>
                </div>
                <Badge status={appointment.status} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Patient Information</CardTitle>
                </CardHeader>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-body font-semibold text-primary">
                            {(patient?.name ?? 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-text-primary">{patient?.name ?? 'Unknown Patient'}</p>
                            <p className="text-caption text-text-secondary">{patient?.email ?? '-'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                        <div>
                            <p className="text-caption text-text-secondary">Appointment Date</p>
                            <p className="text-body font-medium text-text-primary">{formatDateTime(appointment.slotStart)}</p>
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary">Token Number</p>
                            <p className="text-body font-medium text-text-primary">#{appointment.tokenNumber ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary">Priority</p>
                            <Badge status={appointment.priority ?? 'standard'} />
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary">Booked At</p>
                            <p className="text-body text-text-secondary">{timeAgo(appointment.createdAt)}</p>
                        </div>
                    </div>
                    {appointment.priorityNote ? (
                        <p className="rounded-md bg-warning/10 px-3 py-2 text-body text-warning">
                            Note: {appointment.priorityNote}
                        </p>
                    ) : null}
                </div>
            </Card>

            {(canTakeQueueActions || canReassign) ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Queue Actions</CardTitle>
                    </CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        {canTakeQueueActions ? (
                            <>
                                <Button
                                    onClick={() => setShowConfirm('complete')}
                                    loading={actionLoading.complete}
                                    className="flex-1"
                                >
                                    Mark Complete
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => setShowConfirm('noshow')}
                                    loading={actionLoading.noshow}
                                    className="flex-1"
                                >
                                    Mark No-Show
                                </Button>
                            </>
                        ) : null}
                        {canReassign ? (
                            <Button
                                variant="secondary"
                                onClick={reassignToNextAvailable}
                                loading={actionLoading.reassign}
                                className="flex-1"
                            >
                                Reassign Next Available
                            </Button>
                        ) : null}
                        <Link href={`/doctor/medical-records/new?appointmentId=${appointment._id}`} className="flex-1">
                            <Button variant="secondary" className="w-full">
                                Add Medical Record
                            </Button>
                        </Link>
                    </div>
                    {isPastActiveAppointment ? (
                        <p className="mt-3 text-body text-text-secondary">
                            This appointment belongs to a previous day and is still pending. Move it to the next available slot instead of trying to close today&apos;s queue with it.
                        </p>
                    ) : null}
                </Card>
            ) : null}

            {showConfirm ? (
                <Modal
                    isOpen
                    onClose={() => setShowConfirm(null)}
                    title={showConfirm === 'complete' ? 'Mark as Complete?' : 'Mark as No-Show?'}
                >
                    <p className="mb-4 text-body text-text-secondary">
                        {showConfirm === 'complete'
                            ? 'This will mark the current consultation as completed and move the queue forward.'
                            : 'This will mark the patient as no-show and move the queue forward.'}
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setShowConfirm(null)}>Cancel</Button>
                        <Button
                            variant={showConfirm === 'noshow' ? 'danger' : 'primary'}
                            onClick={() => doQueueAction(
                                showConfirm,
                                showConfirm === 'complete' ? '/api/queue/mark-completed' : '/api/queue/mark-no-show'
                            )}
                            loading={actionLoading[showConfirm]}
                        >
                            Confirm
                        </Button>
                    </div>
                </Modal>
            ) : null}
        </div>
    )
}
