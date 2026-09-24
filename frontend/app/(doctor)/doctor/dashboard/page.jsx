'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import api from '@/lib/api'
import { formatTime } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useSocket, useSocketEvent } from '@/hooks/useSocket'
import QueueControlPanel from '@/components/features/QueueControlPanel'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'

const TODAY = format(new Date(), 'yyyy-MM-dd')

const PRIORITIES = [
    { value: 'emergency', label: 'Emergency', color: 'bg-error text-white', ring: 'ring-error' },
    { value: 'senior', label: 'Senior', color: 'bg-warning text-white', ring: 'ring-warning' },
    { value: 'standard', label: 'Standard', color: 'bg-border text-text-primary', ring: 'ring-border' },
]

function PriorityModal({ appointment, onClose, onSaved }) {
    const toast = useToast()
    const [priority, setPriority] = useState(appointment?.priority ?? 'standard')
    const [note, setNote] = useState(appointment?.priorityNote ?? '')
    const [loading, setLoading] = useState(false)

    const save = async () => {
        setLoading(true)
        try {
            await api.patch(`/api/appointments/${appointment._id}/priority`, {
                priority,
                priorityNote: note,
            })
            toast.success(`Priority set to ${priority}`)
            onSaved({ appointmentId: appointment._id, priority, priorityNote: note })
            onClose()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to set priority')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen onClose={onClose} title="Set Appointment Priority">
            <div className="space-y-4">
                <p className="text-body text-text-secondary">
                    Patient: <span className="font-medium text-text-primary">{appointment?.patientId?.name ?? 'Patient'}</span>
                    <span className="ml-2 text-text-secondary">Token #{appointment?.tokenNumber}</span>
                </p>

                <div className="grid grid-cols-3 gap-2">
                    {PRIORITIES.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setPriority(option.value)}
                            className={`rounded-lg border-2 px-2 py-3 text-body font-medium transition-all ${priority === option.value
                                ? `${option.color} border-transparent ring-2 ${option.ring}`
                                : 'border-border bg-surface text-text-secondary hover:border-primary'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="mb-1 block text-caption text-text-secondary">Note (optional)</label>
                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Reason for priority"
                        rows={2}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} loading={loading}>Save Priority</Button>
                </div>
            </div>
        </Modal>
    )
}

function AvailabilityCard({ schedule, form, onChange, onSubmit, onReactivate, loading }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Doctor Availability</CardTitle>
                <Badge status={schedule?.isActive ? 'active' : 'inactive'} />
            </CardHeader>

            <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-bg p-4">
                        <p className="text-caption text-text-secondary">Status</p>
                        <p className="text-body font-semibold text-text-primary">{schedule?.isActive ? 'Accepting appointments' : 'Temporarily unavailable'}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg p-4">
                        <p className="text-caption text-text-secondary">Today</p>
                        <p className="text-body font-semibold text-text-primary">{schedule?.availabilityStatus?.message || 'No availability data'}</p>
                    </div>
                </div>

                {!schedule?.isActive && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                        <p className="text-body font-semibold text-text-primary">
                            Unavailable from {schedule?.inactiveFrom ? format(new Date(schedule.inactiveFrom), 'MMM d, yyyy') : '-'} to {schedule?.inactiveUntil ? format(new Date(schedule.inactiveUntil), 'MMM d, yyyy') : '-'}
                        </p>
                        {schedule?.inactiveReason ? (
                            <p className="mt-1 text-body text-text-secondary">{schedule.inactiveReason}</p>
                        ) : null}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-caption text-text-secondary">Unavailable from</label>
                        <input
                            type="date"
                            value={form.inactiveFrom}
                            onChange={(event) => onChange('inactiveFrom', event.target.value)}
                            className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-caption text-text-secondary">Unavailable until</label>
                        <input
                            type="date"
                            value={form.inactiveUntil}
                            onChange={(event) => onChange('inactiveUntil', event.target.value)}
                            className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-caption text-text-secondary">Reason (optional)</label>
                    <textarea
                        value={form.inactiveReason}
                        onChange={(event) => onChange('inactiveReason', event.target.value)}
                        rows={2}
                        placeholder="Conference, leave, emergency duty"
                        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-caption text-text-secondary">Affected appointments</label>
                    <select
                        value={form.handlingMode}
                        onChange={(event) => onChange('handlingMode', event.target.value)}
                        className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                    >
                        <option value="reschedule">Reschedule to next available slot</option>
                        <option value="cancel">Cancel affected appointments</option>
                    </select>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button onClick={onSubmit} loading={loading}>
                        Mark Unavailable
                    </Button>
                    {!schedule?.isActive && (
                        <Button variant="secondary" onClick={onReactivate} loading={loading}>
                            Reactivate Availability
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}

export default function DoctorDashboardPage() {
    const toast = useToast()
    const { joinRoom, leaveRoom } = useSocket()

    const [appointments, setAppointments] = useState([])
    const [queueState, setQueueState] = useState(null)
    const [currentAppt, setCurrentAppt] = useState(null)
    const [schedule, setSchedule] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState({})
    const [availabilityLoading, setAvailabilityLoading] = useState(false)
    const [priorityTarget, setPriorityTarget] = useState(null)
    const [availabilityForm, setAvailabilityForm] = useState({
        inactiveFrom: TODAY,
        inactiveUntil: TODAY,
        inactiveReason: '',
        handlingMode: 'reschedule',
    })

    const hydrateSchedule = (doctor) => {
        if (!doctor) return
        setSchedule(doctor)
        setAvailabilityForm((prev) => ({
            ...prev,
            inactiveFrom: doctor.inactiveFrom ? format(new Date(doctor.inactiveFrom), 'yyyy-MM-dd') : prev.inactiveFrom,
            inactiveUntil: doctor.inactiveUntil ? format(new Date(doctor.inactiveUntil), 'yyyy-MM-dd') : prev.inactiveUntil,
            inactiveReason: doctor.inactiveReason || '',
        }))
    }

    const load = useCallback(async () => {
        try {
            const [appointmentRes, queueRes, scheduleRes] = await Promise.all([
                api.get('/api/appointments/doctor-appointments', { params: { date: TODAY } }),
                api.get('/api/queue/current-state', { params: { date: TODAY } }),
                api.get('/api/doctors/my-schedule'),
            ])

            const appointmentPayload = appointmentRes.data
            const queuePayload = queueRes.data
            const schedulePayload = scheduleRes.data?.doctor ?? scheduleRes.data?.data?.doctor ?? scheduleRes.data?.data ?? scheduleRes.data

            const appointmentList = appointmentPayload?.appointments ?? appointmentPayload?.data?.appointments ?? appointmentPayload?.data ?? []
            const queue = queuePayload?.data ?? queuePayload

            setAppointments(Array.isArray(appointmentList) ? appointmentList : [])
            setQueueState({
                ...queue,
                waitingCount: queue?.waitingCount ?? queue?.counts?.waiting ?? 0,
            })
            setCurrentAppt(
                queue?.currentPatient ||
                queue?.currentAppointment ||
                (Array.isArray(appointmentList) ? appointmentList : []).find((appointment) => ['in_consultation', 'in_progress'].includes(appointment.status)) ||
                queue?.currentAppointment ||
                null
            )
            hydrateSchedule(schedulePayload)
        } catch {
            toast.error('Could not load dashboard data')
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        if (!queueState?.doctorId) return
        joinRoom(queueState.doctorId, TODAY)
        return () => leaveRoom()
    }, [queueState?.doctorId, joinRoom, leaveRoom])

    useSocketEvent('queue:updated', (data) => {
        setQueueState((prev) => ({
            ...prev,
            ...data,
            waitingCount: data?.waitingCount ?? data?.counts?.waiting ?? prev?.waitingCount ?? 0,
        }))
        const socketAppointments = Array.isArray(data.appointments) ? data.appointments : []
        setCurrentAppt(
            data.currentPatient ||
            data.currentAppointment ||
            socketAppointments.find((appointment) => ['in_consultation', 'in_progress'].includes(appointment.status)) ||
            null
        )
        if (data.appointments) setAppointments(data.appointments)
    })
    useSocketEvent('queue:update', (data) => {
        setQueueState((prev) => ({
            ...prev,
            ...data,
            waitingCount: data?.waitingCount ?? data?.counts?.waiting ?? prev?.waitingCount ?? 0,
        }))
        const socketAppointments = Array.isArray(data.appointments) ? data.appointments : []
        setCurrentAppt(
            data.currentPatient ||
            data.currentAppointment ||
            socketAppointments.find((appointment) => ['in_consultation', 'in_progress'].includes(appointment.status)) ||
            null
        )
        if (data.appointments) setAppointments(data.appointments)
    })
    useSocketEvent('queue:token-called', () => { load() })
    useSocketEvent('queue:paused', () => { load() })
    useSocketEvent('queue:resumed', () => { load() })
    useSocketEvent('queue:closed', () => { load() })

    const withLoading = (key, fn) => async () => {
        setActionLoading((prev) => ({ ...prev, [key]: true }))
        try {
            await fn()
            await load()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Action failed')
        } finally {
            setActionLoading((prev) => ({ ...prev, [key]: false }))
        }
    }

    const onCallNext = withLoading('callNext', () =>
        api.post('/api/queue/call-next', { date: TODAY }, { headers: { 'X-Action-ID': crypto.randomUUID() } })
    )
    const onComplete = withLoading('complete', () =>
        api.post('/api/queue/mark-completed', { date: TODAY }, { headers: { 'X-Action-ID': crypto.randomUUID() } })
    )
    const onNoShow = withLoading('noShow', () =>
        api.post('/api/queue/mark-no-show', { date: TODAY }, { headers: { 'X-Action-ID': crypto.randomUUID() } })
    )
    const onPause = withLoading('pause', () =>
        api.post('/api/queue/pause', { date: TODAY })
    )
    const onResume = withLoading('pause', () =>
        api.post('/api/queue/resume', { date: TODAY })
    )

    const handlePrioritySaved = ({ appointmentId, priority, priorityNote }) => {
        setAppointments((prev) => prev.map((appointment) => (
            appointment._id === appointmentId
                ? { ...appointment, priority, priorityNote }
                : appointment
        )))
    }

    const updateAvailabilityField = (key, value) => {
        setAvailabilityForm((prev) => ({ ...prev, [key]: value }))
    }

    const submitAvailability = async () => {
        if (!availabilityForm.inactiveFrom || !availabilityForm.inactiveUntil) {
            toast.error('Select unavailable from and until dates')
            return
        }

        if (availabilityForm.inactiveFrom > availabilityForm.inactiveUntil) {
            toast.error('Unavailable until date must be after unavailable from date')
            return
        }

        setAvailabilityLoading(true)
        try {
            const response = await api.patch('/api/doctors/availability', {
                isActive: false,
                inactiveFrom: availabilityForm.inactiveFrom,
                inactiveUntil: availabilityForm.inactiveUntil,
                inactiveReason: availabilityForm.inactiveReason,
                handlingMode: availabilityForm.handlingMode,
            })

            const doctor = response.data?.doctor ?? response.data?.data?.doctor ?? response.data?.data ?? response.data
            hydrateSchedule(doctor)

            const handled = response.data?.handledAppointments ?? 0
            const rescheduled = response.data?.rescheduledAppointments ?? 0
            const cancelled = response.data?.cancelledAppointments ?? 0
            toast.success(`Availability updated. ${handled} appointments handled (${rescheduled} rescheduled, ${cancelled} cancelled).`)
            await load()
        } catch (error) {
            toast.error(error?.response?.data?.message || error?.response?.data?.errors?.[0] || 'Failed to update availability')
        } finally {
            setAvailabilityLoading(false)
        }
    }

    const reactivateAvailability = async () => {
        setAvailabilityLoading(true)
        try {
            const response = await api.patch('/api/doctors/availability', { isActive: true })
            const doctor = response.data?.doctor ?? response.data?.data?.doctor ?? response.data?.data ?? response.data
            hydrateSchedule(doctor)
            toast.success('Availability reactivated')
            await load()
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to reactivate availability')
        } finally {
            setAvailabilityLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-h1 text-text-primary">Today's Dashboard</h1>
                <p className="text-body text-text-secondary">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>

            <AvailabilityCard
                schedule={schedule}
                form={availabilityForm}
                onChange={updateAvailabilityField}
                onSubmit={submitAvailability}
                onReactivate={reactivateAvailability}
                loading={availabilityLoading}
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Today's Appointments</CardTitle>
                            <span className="text-caption text-text-secondary">{appointments.length} appointments</span>
                        </CardHeader>

                        {appointments.length === 0 ? (
                            <p className="py-8 text-center text-body text-text-secondary">No appointments today</p>
                        ) : (
                            <div className="space-y-2">
                                {appointments.map((appointment) => {
                                    const isCurrent = appointment._id === currentAppt?._id
                                    const canSetPriority = ['booked', 'waiting'].includes(appointment.status)

                                    return (
                                        <div
                                            key={appointment._id}
                                            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${isCurrent ? 'border-primary bg-primary-soft' : 'border-border'}`}
                                        >
                                            <div className="w-16 shrink-0 text-caption font-medium text-text-secondary">
                                                {formatTime(appointment.slotStart)}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-body font-medium text-text-primary">
                                                    {appointment.patientId?.name ?? 'Patient'}
                                                </p>
                                                <p className="text-caption text-text-secondary">
                                                    Token #{appointment.tokenNumber}
                                                    {appointment.priorityNote ? ` | ${appointment.priorityNote}` : ''}
                                                </p>
                                            </div>

                                            {appointment.priority && appointment.priority !== 'standard' ? (
                                                <Badge status={appointment.priority} />
                                            ) : null}
                                            <Badge status={appointment.status} />

                                            {canSetPriority ? (
                                                <button
                                                    onClick={() => setPriorityTarget(appointment)}
                                                    className="shrink-0 text-caption text-primary hover:underline"
                                                    title="Set priority"
                                                >
                                                    Priority
                                                </button>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                <div>
                    <QueueControlPanel
                        currentAppointment={currentAppt}
                        nextAppointment={queueState?.nextPatient}
                        queueList={queueState?.queueList || []}
                        queueState={queueState}
                        onCallNext={onCallNext}
                        onComplete={onComplete}
                        onNoShow={onNoShow}
                        onPause={onPause}
                        onResume={onResume}
                        medicalRecordHref={currentAppt ? `/doctor/medical-records/new?appointmentId=${currentAppt._id}` : undefined}
                        loading={actionLoading}
                    />
                </div>
            </div>

            {priorityTarget ? (
                <PriorityModal
                    appointment={priorityTarget}
                    onClose={() => setPriorityTarget(null)}
                    onSaved={handlePrioritySaved}
                />
            ) : null}
        </div>
    )
}
