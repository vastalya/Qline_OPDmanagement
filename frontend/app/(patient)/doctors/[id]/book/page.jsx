'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import { formatDate, formatTime } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import SlotPicker from '@/components/features/SlotPicker'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'
import { ErrorState } from '@/components/ui/AsyncState'

const DATE_COUNT = 7

function generateDays() {
    return Array.from({ length: DATE_COUNT }, (_, index) => addDays(startOfDay(new Date()), index))
}

function drName(name) {
    if (!name) return 'Doctor'
    const normalized = name.trim()
    return normalized.toLowerCase().startsWith('dr.') ? normalized : `Dr. ${normalized}`
}

function isWorkingDay(day, workingDays = []) {
    return workingDays.includes(format(day, 'EEEE'))
}

export default function BookPage() {
    const { id: doctorId } = useParams()
    const router = useRouter()
    const toast = useToast()

    const [doctor, setDoctor] = useState(null)
    const [slots, setSlots] = useState([])
    const [slotMeta, setSlotMeta] = useState(null)
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [doctorLoading, setDoctorLoading] = useState(true)
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [bookLoading, setBookLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState('')

    const days = useMemo(() => generateDays(), [])
    const availableSlots = slots.filter((slot) => slot.status === 'available')
    const workingDays = doctor?.schedule?.workingDays ?? doctor?.workingDays ?? []

    useEffect(() => {
        let mounted = true

        api.get(`/api/doctors/${doctorId}`)
            .then((response) => {
                if (!mounted) return
                const payload = unwrapApiData(response)
                const profile = payload?.data ?? payload
                setDoctor(profile)
            })
            .catch((requestError) => {
                if (!mounted) return
                setError(normalizeApiError(requestError, 'Doctor not found'))
            })
            .finally(() => {
                if (mounted) setDoctorLoading(false)
            })

        return () => {
            mounted = false
        }
    }, [doctorId])

    const loadSlots = useCallback(async () => {
        if (!doctorId) return

        try {
            setSlotsLoading(true)
            setError('')
            setSelectedSlot(null)

            const response = await api.get(`/api/doctors/${doctorId}/slots`, {
                params: { date: format(selectedDate, 'yyyy-MM-dd') },
            })

            const payload = unwrapApiData(response)
            const fetchedSlots = payload?.slots ?? payload?.data ?? []
            setSlots(Array.isArray(fetchedSlots) ? fetchedSlots : [])
            setSlotMeta({
                availability: payload?.availability ?? null,
                schedule: payload?.schedule ?? null,
            })
        } catch (requestError) {
            setSlots([])
            setSlotMeta(null)
            setError(normalizeApiError(requestError, 'Could not load slots'))
        } finally {
            setSlotsLoading(false)
        }
    }, [doctorId, selectedDate])

    useEffect(() => {
        loadSlots()
    }, [loadSlots])

    const handleBook = async () => {
        if (!selectedSlot) return

        setBookLoading(true)
        try {
            await api.post('/api/appointments/book', {
                doctorId,
                date: format(selectedDate, 'yyyy-MM-dd'),
                slotStart: selectedSlot.slotStart || selectedSlot.start,
                slotEnd: selectedSlot.slotEnd || selectedSlot.end,
            })

            toast.success('Appointment booked successfully')
            router.push('/appointments')
        } catch (requestError) {
            toast.error(normalizeApiError(requestError, 'Booking failed'))
        } finally {
            setBookLoading(false)
            setShowConfirm(false)
        }
    }

    if (error && !doctorLoading && !doctor) {
        return (
            <ErrorState
                message={error}
                onRetry={() => router.refresh()}
            />
        )
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Card>
                {doctorLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-h2 text-text-primary">
                                {drName(doctor?.user?.name || doctor?.userId?.name)}
                            </h1>
                            <p className="text-body text-text-secondary">{doctor?.department || 'General Medicine'}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Metric label="Consultation Time" value={`${doctor?.defaultConsultTime || doctor?.schedule?.consultationDuration || 15} min`} />
                            <Metric label="Patients in Queue" value={doctor?.waitingTime?.patientsInQueue ?? 0} />
                            <Metric label="Estimated Wait" value={`${doctor?.waitingTime?.estimatedWaitMinutes ?? 0} min`} />
                            <Metric label="Working Hours" value={`${doctor?.workingHours?.start || doctor?.schedule?.workingHours?.start || '--:--'} - ${doctor?.workingHours?.end || doctor?.schedule?.workingHours?.end || '--:--'}`} />
                        </div>

                        <div>
                            <p className="mb-2 text-caption text-text-secondary">Working Days</p>
                            <div className="flex flex-wrap gap-2">
                                {workingDays.map((day) => (
                                    <span key={day} className="rounded-full bg-success/10 px-3 py-1 text-caption font-medium text-success">
                                        {day}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {!doctor?.availabilityStatus?.available && doctor?.availabilityStatus?.message ? (
                            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-body text-text-primary">
                                {doctor.availabilityStatus.message}
                            </div>
                        ) : null}
                    </div>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Select a date</CardTitle>
                </CardHeader>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {days.map((day) => {
                        const active = isSameDay(day, selectedDate)
                        const working = isWorkingDay(day, workingDays)

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={`shrink-0 rounded-md border px-4 py-2.5 transition-all duration-200 ${active
                                    ? 'border-primary bg-primary-soft text-primary'
                                    : working
                                        ? 'border-border text-text-secondary hover:border-primary'
                                        : 'border-border bg-bg text-text-secondary opacity-70'
                                    }`}
                            >
                                <span className="block text-caption uppercase">{format(day, 'EEE')}</span>
                                <span className="block text-body-lg font-semibold">{format(day, 'd')}</span>
                                <span className="block text-caption">{working ? 'Open' : 'Off'}</span>
                            </button>
                        )
                    })}
                </div>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Time Slots</CardTitle>
                    <span className="text-body text-text-secondary">{formatDate(selectedDate)}</span>
                </CardHeader>

                {slotsLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <Skeleton key={index} className="h-10 rounded-pill" />
                        ))}
                    </div>
                ) : (
                    <>
                        <SlotPicker
                            slots={slots}
                            selectedSlot={selectedSlot}
                            onSelect={setSelectedSlot}
                        />

                        {!availableSlots.length ? (
                            <p className="mt-3 text-caption text-text-secondary">
                                {slotMeta?.availability?.message || 'No available slots for this date.'}
                            </p>
                        ) : null}
                    </>
                )}

                {!slotsLoading && error ? (
                    <p className="mt-3 text-caption text-error">{error}</p>
                ) : null}
            </Card>

            {selectedSlot ? (
                <div className="sticky bottom-4">
                    <Card className="flex items-center justify-between gap-4 p-4 shadow-2">
                        <span className="text-body text-text-secondary">
                            Selected: <strong className="text-text-primary">{formatTime(selectedSlot.slotStart || selectedSlot.start)}</strong>
                        </span>
                        <Button onClick={() => setShowConfirm(true)}>Confirm booking</Button>
                    </Card>
                </div>
            ) : null}

            <Modal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Confirm appointment"
                footer={(
                    <>
                        <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={bookLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleBook} loading={bookLoading}>
                            Book now
                        </Button>
                    </>
                )}
            >
                <p>
                    Book with <strong>{drName(doctor?.user?.name || doctor?.userId?.name)}</strong> on <strong>{formatDate(selectedDate)}</strong> at <strong>{formatTime(selectedSlot?.slotStart || selectedSlot?.start)}</strong>?
                </p>
            </Modal>
        </div>
    )
}

function Metric({ label, value }) {
    return (
        <div className="rounded-lg border border-border bg-bg p-4">
            <p className="text-caption text-text-secondary">{label}</p>
            <p className="text-body font-semibold text-text-primary">{value}</p>
        </div>
    )
}
