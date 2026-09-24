'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function DoctorSchedulePage() {
    const toast = useToast()
    const [schedule, setSchedule] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/api/doctors/my-schedule')
            .then((response) => {
                const doctor = response.data?.doctor ?? response.data?.data?.doctor ?? response.data?.data ?? response.data
                setSchedule(doctor)
            })
            .catch(() => toast.error('Failed to load schedule'))
            .finally(() => setLoading(false))
    }, [toast])

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-h1 text-text-primary">My Schedule</h1>
                    <p className="text-body text-text-secondary">Working days, hours, breaks, and temporary unavailability.</p>
                </div>
                <Link href="/doctor/configure">
                    <Button variant="secondary" size="sm">Edit Schedule</Button>
                </Link>
            </div>

            {!schedule ? (
                <Card>
                    <p className="py-8 text-center text-body text-text-secondary">
                        No schedule configured yet. <Link href="/doctor/configure" className="text-primary hover:underline">Configure your schedule</Link>
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Availability</CardTitle>
                            <Badge status={schedule.isActive ? 'active' : 'inactive'} />
                        </CardHeader>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Info label="Status" value={schedule.isActive ? 'Active' : 'Inactive'} />
                            <Info label="Unavailable From" value={schedule.inactiveFrom ? format(new Date(schedule.inactiveFrom), 'MMM d, yyyy') : '-'} />
                            <Info label="Unavailable Until" value={schedule.inactiveUntil ? format(new Date(schedule.inactiveUntil), 'MMM d, yyyy') : '-'} />
                            <Info label="Reason" value={schedule.inactiveReason || '-'} />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Working Hours</CardTitle>
                        </CardHeader>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Info label="Start Time" value={schedule.workingHours?.start ?? '-'} />
                            <Info label="End Time" value={schedule.workingHours?.end ?? '-'} />
                            <Info label="Consultation Duration" value={`${schedule.defaultConsultTime ?? '-'} min`} />
                            <Info label="Max Patients / Day" value={schedule.maxPatientsPerDay ?? '-'} />
                        </div>
                    </Card>

                    {schedule.department && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Department</CardTitle>
                            </CardHeader>
                            <p className="text-body text-text-primary">{schedule.department}</p>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Working Days</CardTitle>
                        </CardHeader>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map((day) => {
                                const isWorking = schedule.workingDays?.includes(day)
                                return (
                                    <span
                                        key={day}
                                        className={`rounded-full px-3 py-1 text-caption font-medium ${isWorking ? 'bg-success/10 text-success' : 'bg-border text-text-secondary'}`}
                                    >
                                        {day}
                                    </span>
                                )
                            })}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Break Slots</CardTitle>
                        </CardHeader>
                        {schedule.breakSlots?.length ? (
                            <div className="space-y-2">
                                {schedule.breakSlots.map((slot, index) => (
                                    <div key={`${slot.start}-${slot.end}-${index}`} className="rounded-lg border border-border bg-bg p-3">
                                        <p className="text-body font-semibold text-text-primary">{slot.start} - {slot.end}</p>
                                        {slot.reason ? (
                                            <p className="text-caption text-text-secondary">{slot.reason}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-body text-text-secondary">No break slots configured.</p>
                        )}
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Today</CardTitle>
                        </CardHeader>
                        <p className="text-body text-text-primary">{schedule.availabilityStatus?.message || 'Availability information unavailable.'}</p>
                    </Card>
                </div>
            )}
        </div>
    )
}

function Info({ label, value }) {
    return (
        <div>
            <p className="text-caption text-text-secondary">{label}</p>
            <p className="text-body font-semibold text-text-primary">{value}</p>
        </div>
    )
}
