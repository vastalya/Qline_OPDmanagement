'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, format, startOfDay } from 'date-fns'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import { formatTime, drName } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'

const LOOKAHEAD_DAYS = 7

function upcomingDates() {
    const today = startOfDay(new Date())
    return Array.from({ length: LOOKAHEAD_DAYS }, (_, index) => addDays(today, index))
}

export default function DoctorDetailPage() {
    const params = useParams()
    const doctorId = params.id

    const [doctor, setDoctor] = useState(null)
    const [slotsByDay, setSlotsByDay] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const dates = useMemo(() => upcomingDates(), [])

    const fetchDoctorDetail = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const doctorResponse = await api.get(`/api/doctors/${doctorId}`)
            const raw = unwrapApiData(doctorResponse)
            const profile = raw?.data ?? raw

            if (!profile?._id) {
                throw new Error('Doctor profile not found')
            }

            setDoctor({
                ...profile,
                name: drName(profile?.user?.name ?? profile?.userId?.name),
                specialization: profile?.specialization || profile?.department || 'General Medicine',
            })

            const slotResults = await Promise.all(
                dates.map(async (day) => {
                    const dateValue = format(day, 'yyyy-MM-dd')
                    try {
                        const slotResponse = await api.get(`/api/doctors/${doctorId}/slots`, {
                            params: { date: dateValue },
                        })
                        const payload = unwrapApiData(slotResponse)
                        const slots = payload?.slots ?? payload?.data ?? []
                        return {
                            date: dateValue,
                            slots: Array.isArray(slots) ? slots : [],
                            availability: payload?.availability ?? null,
                        }
                    } catch {
                        return { date: dateValue, slots: [], availability: null }
                    }
                })
            )

            setSlotsByDay(slotResults)
        } catch (requestError) {
            setError(normalizeApiError(requestError, 'Failed to load doctor details'))
        } finally {
            setLoading(false)
        }
    }, [dates, doctorId])

    useEffect(() => {
        fetchDoctorDetail()
    }, [fetchDoctorDetail])

    if (loading) return <LoadingState label="Loading doctor profile..." />
    if (error || !doctor) {
        return (
            <div className="space-y-4">
                <Link href="/doctors" className="text-body text-primary hover:underline">
                    Back to doctors
                </Link>
                <ErrorState message={error || 'Doctor not found'} onRetry={fetchDoctorDetail} />
            </div>
        )
    }

    const hasAnySlots = slotsByDay.some((row) => row.slots.some((slot) => slot.status === 'available'))
    const workingDays = doctor.schedule?.workingDays ?? doctor.workingDays ?? []

    return (
        <div className="space-y-6">
            <Link href="/doctors" className="text-body text-primary hover:underline">
                Back to doctors
            </Link>

            <Card className="space-y-5 p-6">
                <div>
                    <h1 className="text-h1 text-text-primary">{doctor.name}</h1>
                    <p className="text-body text-text-secondary">{doctor.specialization}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Department" value={doctor.department || 'Not set'} />
                    <Info label="Consultation Duration" value={`${doctor.defaultConsultTime || doctor.schedule?.consultationDuration || 15} min`} />
                    <Info label="Patients in Queue" value={doctor.waitingTime?.patientsInQueue ?? 0} />
                    <Info label="Estimated Wait" value={`${doctor.waitingTime?.estimatedWaitMinutes ?? 0} min`} />
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

                <div className="rounded-lg border border-border bg-bg p-4">
                    <p className="text-caption text-text-secondary">Working Hours</p>
                    <p className="text-body font-semibold text-text-primary">
                        {doctor.workingHours?.start || doctor.schedule?.workingHours?.start || '--:--'} to {doctor.workingHours?.end || doctor.schedule?.workingHours?.end || '--:--'}
                    </p>
                </div>

                {doctor.availabilityStatus?.message ? (
                    <div className={`rounded-lg border p-4 ${doctor.availabilityStatus.available ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
                        <p className="text-body text-text-primary">{doctor.availabilityStatus.message}</p>
                    </div>
                ) : null}

                <div className="flex items-center gap-3">
                    <Link href={`/doctors/${doctor._id}/book`}>
                        <Button>Book Appointment</Button>
                    </Link>
                    <span className="text-caption text-text-secondary">
                        Break slots and working days are reflected in the booking calendar.
                    </span>
                </div>
            </Card>

            <Card className="p-6">
                <CardHeader>
                    <CardTitle>Next 7 Days Availability</CardTitle>
                </CardHeader>

                {!hasAnySlots ? (
                    <p className="text-body text-text-secondary">No open slots in the next 7 days.</p>
                ) : (
                    <div className="space-y-3">
                        {slotsByDay.map(({ date, slots, availability }) => {
                            const availableSlots = slots.filter((slot) => slot.status === 'available')

                            return (
                                <div key={date} className="rounded-lg border border-border bg-bg p-3">
                                    <p className="text-body font-semibold text-text-primary">
                                        {format(new Date(date), 'EEE, MMM d')}
                                    </p>
                                    {availableSlots.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {availableSlots.slice(0, 8).map((slot) => (
                                                <span
                                                    key={slot._id || slot.slotStart || slot.start}
                                                    className="rounded-pill border border-border px-3 py-1 text-caption text-text-primary"
                                                >
                                                    {formatTime(slot.slotStart || slot.start)}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-caption text-text-secondary">
                                            {availability?.message || 'No slots'}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>
        </div>
    )
}

function Info({ label, value }) {
    return (
        <div className="rounded-lg border border-border bg-bg p-4">
            <p className="text-caption text-text-secondary">{label}</p>
            <p className="text-body font-semibold text-text-primary">{value}</p>
        </div>
    )
}
