'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/AsyncState'
import { drName } from '@/lib/utils'

export default function MedicalRecordsPage() {
    const [records, setRecords] = useState([])
    const [doctors, setDoctors] = useState([])
    const [filterDoctor, setFilterDoctor] = useState('')
    const [filterMonth, setFilterMonth] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchDoctors = useCallback(async () => {
        const res = await api.get('/api/patient/doctors')
        const payload = unwrapApiData(res)
        const list = payload?.doctors ?? payload?.data?.doctors ?? payload?.data ?? []
        setDoctors(Array.isArray(list) ? list : [])
    }, [])

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const params = {}
            if (filterDoctor) params.doctorId = filterDoctor
            if (filterMonth) params.month = filterMonth

            const res = await api.get('/api/patient/medical-records', { params })
            const payload = unwrapApiData(res)
            const list = payload?.records ?? payload?.data?.records ?? payload?.data ?? []
            setRecords(Array.isArray(list) ? list : [])
        } catch (err) {
            setError(normalizeApiError(err, 'Failed to load medical records'))
        } finally {
            setLoading(false)
        }
    }, [filterDoctor, filterMonth])

    useEffect(() => {
        fetchDoctors().catch(() => {
            // Doctors filter is optional for page rendering.
        })
    }, [fetchDoctors])

    useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    if (loading) return <LoadingState label="Loading medical records..." />

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-h1 text-text-primary">Medical Records</h1>
                <p className="mt-1 text-body text-text-secondary">
                    Review your consultation history and doctor notes.
                </p>
            </div>

            <Card className="space-y-4 p-6">
                <h2 className="text-h3 text-text-primary">Filters</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="doctor-filter" className="mb-1 block text-caption text-text-secondary">
                            Doctor
                        </label>
                        <select
                            id="doctor-filter"
                            value={filterDoctor}
                            onChange={(e) => setFilterDoctor(e.target.value)}
                            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                        >
                            <option value="">All doctors</option>
                            {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                    Dr. {doctor.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        id="month-filter"
                        label="Month"
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    />
                </div>
            </Card>

            {error && <ErrorState message={error} onRetry={fetchRecords} />}

            {!error && records.length === 0 && (
                <EmptyState
                    title="No medical records found"
                    description="Try clearing filters or check again after your next consultation."
                />
            )}

            {!error && records.length > 0 && (
                <div className="space-y-4">
                    {records.map((record) => (
                        <Link key={record.id} href={`/medical-records/${record.id}`}>
                            <Card hover className="space-y-3 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-body-lg font-semibold text-text-primary">
                                        {drName(record.doctorName)}
                                    </h3>
                                    <span className="text-caption text-text-secondary">
                                        {new Date(record.consultationDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-caption text-text-secondary">{record.department || 'General'}</p>
                                <p className="text-body text-text-secondary">
                                    {record.diagnosis || record.complaint || 'No summary available'}
                                </p>
                                <Button variant="secondary" size="sm">View details</Button>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

