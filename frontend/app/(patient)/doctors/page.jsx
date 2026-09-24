'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { DEPARTMENTS, PAGE_SIZE } from '@/lib/utils'
import { usePagination } from '@/hooks/usePagination'
import DoctorCard from '@/components/features/DoctorCard'
import { DoctorCardSkeleton } from '@/components/ui/Skeleton'
import Pagination from '@/components/ui/Pagination'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/AsyncState'

const SKELETONS = Array.from({ length: 6 })

export default function DoctorsPage() {
    const [search, setSearch] = useState('')
    const [department, setDepartment] = useState('')
    const [query, setQuery] = useState({ search: '', department: '' })

    const fetchDoctors = useCallback(
        (page, limit) =>
            api.get('/api/doctors', {
                params: {
                    q: query.search,
                    department: query.department,
                    page,
                    limit,
                },
            }),
        [query]
    )

    const {
        data: doctors,
        page,
        pages,
        loading,
        error,
        fetch,
        goToPage,
    } = usePagination(fetchDoctors, PAGE_SIZE)

    useEffect(() => {
        fetch(1)
    }, [fetch])

    const handleSearch = (e) => {
        e.preventDefault()
        setQuery({ search: search.trim(), department })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-h1 text-text-primary">Find a Doctor</h1>
                <p className="mt-1 text-body text-text-secondary">
                    Book appointments with verified doctors
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <Input
                    placeholder="Search by doctor name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                />
                <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-11 rounded-md border border-border bg-surface px-4 text-body text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                    aria-label="Filter by department"
                >
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
                <Button type="submit" size="md">Search</Button>
            </form>

            {error && <ErrorState message={error} onRetry={() => fetch(page)} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading
                    ? SKELETONS.map((_, i) => <DoctorCardSkeleton key={i} />)
                    : doctors.map((doctor) => <DoctorCard key={doctor._id} doctor={doctor} />)}
            </div>

            {!loading && !error && doctors.length === 0 && (
                <EmptyState
                    title="No doctors found"
                    description="Try a different name or department filter."
                />
            )}

            <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />
        </div>
    )
}

