'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { normalizeApiError } from '@/lib/apiClient'
import { formatDate, getInitials } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

export default function DoctorPatientsPage() {
    const toast = useToast()
    const [patients, setPatients] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/api/medical-records/doctor/patients')
            .then((response) => {
                setPatients(response.data?.patients ?? [])
            })
            .catch((error) => {
                toast.error(normalizeApiError(error, 'Failed to load patients'))
            })
            .finally(() => setLoading(false))
    }, [toast])

    const filteredPatients = useMemo(() => {
        const term = query.trim().toLowerCase()
        if (!term) return patients
        return patients.filter((patient) => (
            patient.name?.toLowerCase().includes(term) ||
            patient.email?.toLowerCase().includes(term)
        ))
    }, [patients, query])

    if (loading) {
        return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">Patients</h1>
                    <p className="text-body text-text-secondary">Review your patient roster and open their medical history.</p>
                </div>
                <div className="w-full sm:w-80">
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search patient name or email"
                    />
                </div>
            </div>

            {filteredPatients.length === 0 ? (
                <Card>
                    <p className="py-8 text-center text-body text-text-secondary">No patients found.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredPatients.map((patient) => (
                        <Card key={patient.patientId}>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-body font-semibold text-primary">
                                        {getInitials(patient.name || 'P')}
                                    </div>
                                    <div>
                                        <p className="text-body-lg font-semibold text-text-primary">{patient.name}</p>
                                        <p className="text-body text-text-secondary">{patient.email || '-'}</p>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-4 sm:text-right">
                                    <Metric label="Appointments" value={patient.totalVisits} />
                                    <Metric label="Records" value={patient.totalRecords ?? 0} />
                                    <Metric label="Last Visit" value={patient.lastVisitDate ? formatDate(patient.lastVisitDate) : '-'} />
                                    <div>
                                        <p className="text-caption text-text-secondary">Last Status</p>
                                        {patient.lastAppointmentStatus ? (
                                            <Badge status={patient.lastAppointmentStatus} className="mt-1" />
                                        ) : (
                                            <p className="text-body font-semibold text-text-primary">-</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {patient.latestComplaint ? (
                                <div className="mt-4 rounded-xl bg-background px-4 py-3">
                                    <p className="text-caption text-text-secondary">Latest Complaint</p>
                                    <p className="text-body font-medium text-text-primary">{patient.latestComplaint}</p>
                                </div>
                            ) : null}

                            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                                <Link href={`/doctor/patients/${patient.patientId}`}>
                                    <Button variant="secondary">View History</Button>
                                </Link>
                                {patient.latestRecordId ? (
                                    <Link href={`/doctor/medical-records/${patient.latestRecordId}/edit`}>
                                        <Button>Edit Latest Record</Button>
                                    </Link>
                                ) : null}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

function Metric({ label, value }) {
    return (
        <div>
            <p className="text-caption text-text-secondary">{label}</p>
            <p className="text-body font-semibold text-text-primary">{value}</p>
        </div>
    )
}
