'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'

function labelFromKey(key) {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function MedicalRecordDetailPage() {
    const params = useParams()
    const recordId = params.id

    const [record, setRecord] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchRecord = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const res = await api.get(`/api/patient/medical-records/${recordId}`)
            const payload = unwrapApiData(res)
            const detail = payload?.record ?? payload?.data?.record ?? payload?.data ?? payload
            setRecord(detail || null)
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to load medical record'))
        } finally {
            setLoading(false)
        }
    }, [recordId])

    useEffect(() => {
        fetchRecord()
    }, [fetchRecord])

    if (loading) return <LoadingState label="Loading medical record..." />
    if (error || !record) {
        return (
            <div className="space-y-4">
                <Link href="/medical-records" className="text-body text-primary hover:underline">
                    Back to records
                </Link>
                <ErrorState message={error || 'Medical record not found'} onRetry={fetchRecord} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link href="/medical-records" className="text-body text-primary hover:underline">
                Back to records
            </Link>

            <Card className="space-y-3 p-6">
                <h1 className="text-h1 text-text-primary">Dr. {record.doctorName}</h1>
                <p className="text-body text-text-secondary">{record.department || 'General'}</p>
                <p className="text-caption text-text-secondary">
                    {new Date(record.consultationDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </p>
                <p className="text-caption text-text-secondary">
                    Export and share actions are deferred in this MVP.
                </p>
            </Card>

            {record.complaint && (
                <Card className="p-6">
                    <CardHeader>
                        <CardTitle>Chief Complaint</CardTitle>
                    </CardHeader>
                    <p className="text-body text-text-secondary">{record.complaint}</p>
                </Card>
            )}

            {record.diagnosis && (
                <Card className="p-6">
                    <CardHeader>
                        <CardTitle>Diagnosis</CardTitle>
                    </CardHeader>
                    <p className="text-body text-text-secondary">{record.diagnosis}</p>
                </Card>
            )}

            {record.vitals && Object.keys(record.vitals).length > 0 && (
                <Card className="p-6">
                    <CardHeader>
                        <CardTitle>Vitals</CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {Object.entries(record.vitals).map(([key, value]) => (
                            <div key={key} className="rounded-lg border border-border bg-bg p-3">
                                <p className="text-caption text-text-secondary">{labelFromKey(key)}</p>
                                <p className="text-body font-semibold text-text-primary">{value || '--'}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {Array.isArray(record.medications) && record.medications.length > 0 && (
                <Card className="p-6">
                    <CardHeader>
                        <CardTitle>Medications</CardTitle>
                    </CardHeader>
                    <div className="space-y-3">
                        {record.medications.map((medication, index) => (
                            <div key={`${medication.name}-${index}`} className="rounded-lg border border-border bg-bg p-3">
                                <p className="text-body font-semibold text-text-primary">{medication.name}</p>
                                <p className="text-caption text-text-secondary">
                                    {medication.dosage || '--'} | {medication.frequency || '--'}
                                </p>
                                {medication.duration && (
                                    <p className="text-caption text-text-secondary">Duration: {medication.duration}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {Array.isArray(record.labTests) && record.labTests.length > 0 && (
                <Card className="p-6">
                    <CardHeader>
                        <CardTitle>Lab Tests</CardTitle>
                    </CardHeader>
                    <div className="space-y-3">
                        {record.labTests.map((test, index) => (
                            <div key={`${test.name}-${index}`} className="rounded-lg border border-border bg-bg p-3">
                                <p className="text-body font-semibold text-text-primary">{test.name}</p>
                                <p className="text-caption text-text-secondary">Result: {test.result || '--'}</p>
                                {test.notes && (
                                    <p className="text-caption text-text-secondary">Notes: {test.notes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {record.followUp && (
                <Card className="border-primary/30 bg-primary-soft p-6">
                    <CardHeader>
                        <CardTitle>Follow-up Instructions</CardTitle>
                    </CardHeader>
                    <p className="text-body text-text-primary">{record.followUp}</p>
                </Card>
            )}
        </div>
    )
}

