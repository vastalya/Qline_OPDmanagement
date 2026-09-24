'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { DEPARTMENTS, PAGE_SIZE } from '@/lib/utils'

export default function AdminDoctorsPage() {
    const toast = useToast()
    const [dept, setDept] = useState('')
    const [query, setQuery] = useState({ dept: '' })
    const [showAdd, setShowAdd] = useState(false)
    const [addForm, setAddForm] = useState({ name: '', email: '', password: '', department: '' })
    const [adding, setAdding] = useState(false)

    const fetchDoctors = useCallback(async (page, limit) => {
        const r = await api.get('/api/admin/doctors', {
            params: { page, limit, ...(query.dept && { department: query.dept }) }
        })
        const raw = r.data
        return { data: { data: raw.doctors ?? [], total: raw.pagination?.total ?? 0, pages: raw.pagination?.pages ?? 1 } }
    }, [query])

    const { data: doctors, page, pages, loading, fetch, goToPage } = usePagination(fetchDoctors, PAGE_SIZE)
    useEffect(() => { fetch(1) }, [fetch])

    const applyFilter = (e) => { e.preventDefault(); setQuery({ dept }) }

    const handleAdd = async (e) => {
        e.preventDefault()
        setAdding(true)
        try {
            await api.post('/api/admin/doctors', addForm)
            toast.success('Doctor added successfully')
            setShowAdd(false)
            setAddForm({ name: '', email: '', password: '', department: '' })
            fetch(1)
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to add doctor')
        } finally {
            setAdding(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-h1 text-text-primary">Doctor Management</h1>
                    <p className="text-body text-text-secondary">All doctors registered in the system</p>
                </div>
                <Button onClick={() => setShowAdd(true)}>+ Add Doctor</Button>
            </div>

            <form onSubmit={applyFilter} className="flex gap-3">
                <select value={dept} onChange={e => setDept(e.target.value)}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <Button type="submit" variant="secondary" size="sm">Filter</Button>
            </form>

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Doctor">
                <form onSubmit={handleAdd} className="space-y-4">
                    <Input label="Name" required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
                    <Input label="Email" type="email" required value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                    <Input label="Password" type="password" required minLength={6} value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} />
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Department</label>
                        <select
                            required value={addForm.department} onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))}
                            className="w-full h-11 px-4 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none"
                        >
                            <option value="">Select department...</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button type="submit" loading={adding}>Add Doctor</Button>
                    </div>
                </form>
            </Modal>

            <Card padding={false}>
                <div className="overflow-x-auto">
                    <table className="w-full text-body">
                        <thead>
                            <tr className="border-b border-border text-caption text-text-secondary uppercase tracking-wide">
                                <th className="text-left px-4 py-3">Doctor</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">Department</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">Total Appointments</th>
                                <th className="text-left px-4 py-3 hidden lg:table-cell">Joined</th>
                                <th className="text-right px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 5 }).map((__, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-4 bg-border rounded animate-pulse" /></td>
                                    ))}</tr>
                                ))
                                : doctors.map(d => (
                                    <tr key={d._id} className="hover:bg-bg transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-text-primary">{d.userId?.name ?? '—'}</p>
                                            <p className="text-caption text-text-secondary">{d.userId?.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{d.department ?? '—'}</td>
                                        <td className="px-4 py-3 text-primary font-medium hidden md:table-cell">{d.stats?.totalAppointments ?? 0}</td>
                                        <td className="px-4 py-3 text-text-secondary text-caption hidden lg:table-cell">{formatDate(d.createdAt)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/admin/doctors/${d._id}`}>
                                                <Button variant="secondary" size="sm">View</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {!loading && doctors.length === 0 && (
                        <p className="text-center text-text-secondary py-8">No doctors found</p>
                    )}
                </div>
                <div className="p-4">
                    <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />
                </div>
            </Card>
        </div>
    )
}
