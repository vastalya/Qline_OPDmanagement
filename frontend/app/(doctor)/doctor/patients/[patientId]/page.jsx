'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { normalizeApiError } from '@/lib/apiClient'
import { formatDate, formatDateTime, getInitials, timeAgo } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'

export default function DoctorPatientHistoryPage({ params }) {
    const { patientId } = params
    const toast = useToast()
    const [timeline, setTimeline] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`/api/medical-records/doctor/patients/${patientId}/history`)
            .then((response) => {
                setTimeline(response.data)
            })
            .catch((error) => {
                toast.error(normalizeApiError(error, 'Failed to load patient history'))
            })
            .finally(() => setLoading(false))
    }, [patientId, toast])

    if (loading) {
        return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>
    }

    const patient = timeline?.patient
    const summary = timeline?.summary
    const appointments = timeline?.appointments ?? []
    const records = timeline?.records ?? []

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link href="/doctor/patients" className="text-caption text-primary hover:underline">← Back to patients</Link>
                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-body font-semibold text-primary">
                            {getInitials(patient?.name || 'P')}
                        </div>
                        <div>
                            <h1 className="text-h1 text-text-primary">Patient History</h1>
                            <p className="text-body text-text-secondary">{patient?.name || 'Patient'}</p>
                            <p className="text-caption text-text-secondary">{patient?.email || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Appointments" value={summary?.totalAppointments ?? 0} />
                <SummaryCard label="Completed" value={summary?.completedAppointments ?? 0} />
                <SummaryCard label="Active" value={summary?.activeAppointments ?? 0} />
                <SummaryCard label="Records" value={summary?.totalRecords ?? 0} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Appointment Timeline</CardTitle>
                </CardHeader>

                {appointments.length === 0 ? (
                    <p className="py-6 text-body text-text-secondary">No appointment history found for this patient.</p>
                ) : (
                    <div className="space-y-3">
                        {appointments.map((appointment) => (
                            <div key={appointment._id} className="rounded-xl border border-border bg-background px-4 py-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-body-lg font-semibold text-text-primary">
                                            {formatDateTime(appointment.slotStart || appointment.date)}
                                        </p>
                                        <p className="text-caption text-text-secondary">
                                            Token {appointment.tokenNumber ? `#${appointment.tokenNumber}` : '-'} · {timeAgo(appointment.createdAt)}
                                        </p>
                                    </div>
                                    <Badge status={appointment.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Medical Records</CardTitle>
                </CardHeader>

                {records.length === 0 ? (
                    <p className="py-6 text-body text-text-secondary">No medical records have been added for this patient yet.</p>
                ) : (
                    <div className="space-y-4">
                        {records.map((record) => (
                            <div key={record._id} className="rounded-xl border border-border bg-background px-4 py-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-body-lg font-semibold text-text-primary">{formatDate(record.date || record.createdAt)}</p>
                                        <p className="text-caption text-text-secondary">{timeAgo(record.createdAt)}</p>
                                    </div>
                                    <Link href={`/doctor/medical-records/${record._id}/edit`}>
                                        <Button variant="secondary" size="sm">Edit</Button>
                                    </Link>
                                </div>

                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    <DetailField label="Chief Complaint" value={record.chiefComplaint || '-'} />
                                    <DetailField label="Diagnosis" value={record.diagnosis || '-'} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}

function SummaryCard({ label, value }) {
    return (
        <Card>
            <p className="text-caption uppercase tracking-wide text-text-secondary">{label}</p>
            <p className="mt-1 text-h2 font-bold text-text-primary">{value}</p>
        </Card>
    )
}

function DetailField({ label, value }) {
    return (
        <div>
            <p className="text-caption text-text-secondary uppercase tracking-wide">{label}</p>
            <p className="text-body text-text-primary">{value}</p>
        </div>
    )
}
