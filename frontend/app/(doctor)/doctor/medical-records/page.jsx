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

export default function DoctorMedicalRecordsPage() {
    const toast = useToast()
    const [records, setRecords] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/api/medical-records/doctor')
            .then((response) => {
                setRecords(response.data?.records ?? [])
            })
            .catch((error) => {
                toast.error(normalizeApiError(error, 'Failed to load medical records'))
            })
            .finally(() => setLoading(false))
    }, [toast])

    const filteredRecords = useMemo(() => {
        const term = query.trim().toLowerCase()
        if (!term) return records
        return records.filter((record) => (
            record.patientId?.name?.toLowerCase().includes(term) ||
            record.patientId?.email?.toLowerCase().includes(term) ||
            record.chiefComplaint?.toLowerCase().includes(term)
        ))
    }, [records, query])

    if (loading) {
        return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">Medical Records</h1>
                    <p className="text-body text-text-secondary">Browse and update consultation records you have created.</p>
                </div>
                <div className="w-full sm:w-80">
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by patient or complaint"
                    />
                </div>
            </div>

            {filteredRecords.length === 0 ? (
                <Card>
                    <p className="py-8 text-center text-body text-text-secondary">No medical records found.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredRecords.map((record) => (
                        <Card key={record._id}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-body font-semibold text-primary">
                                        {getInitials(record.patientId?.name || 'P')}
                                    </div>
                                    <div>
                                        <CardTitle>{record.patientId?.name || 'Patient'}</CardTitle>
                                        <p className="text-body text-text-secondary">{record.patientId?.email || '-'}</p>
                                    </div>
                                </div>
                            </CardHeader>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <RecordField label="Visit Date" value={formatDate(record.date || record.createdAt)} />
                                <RecordField label="Token" value={record.appointmentId?.tokenNumber ? `#${record.appointmentId.tokenNumber}` : '-'} />
                                <RecordField label="Chief Complaint" value={record.chiefComplaint || '-'} />
                            </div>

                            <div className="mt-4 flex justify-end">
                                <Link href={`/doctor/medical-records/${record._id}/edit`}>
                                    <Button>Edit Record</Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

function RecordField({ label, value }) {
    return (
        <div>
            <p className="text-caption text-text-secondary">{label}</p>
            <p className="text-body font-semibold text-text-primary">{value}</p>
        </div>
    )
}
