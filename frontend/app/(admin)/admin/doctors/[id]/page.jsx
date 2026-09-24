'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { DEPARTMENTS } from '@/lib/utils'

export default function AdminDoctorDetailPage({ params }) {
    const { id } = params
    const router = useRouter()
    const toast = useToast()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    // Edit state
    const [showEdit, setShowEdit] = useState(false)
    const [editForm, setEditForm] = useState({ department: '', defaultConsultTime: 15 })
    const [editing, setEditing] = useState(false)

    // Delete state
    const [showDelete, setShowDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const fetchDoctor = useCallback(async () => {
        try {
            const r = await api.get(`/api/admin/doctors/${id}`)
            setData(r.data)
            setEditForm({
                department: r.data.doctor.department || '',
                defaultConsultTime: r.data.doctor.defaultConsultTime || 15
            })
        } catch {
            toast.error('Failed to load doctor')
        } finally {
            setLoading(false)
        }
    }, [id, toast])

    useEffect(() => { fetchDoctor() }, [fetchDoctor])

    const handleEdit = async (e) => {
        e.preventDefault()
        setEditing(true)
        try {
            await api.patch(`/api/admin/doctors/${id}`, editForm)
            toast.success('Doctor updated successfully')
            setShowEdit(false)
            fetchDoctor()
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update doctor')
        } finally {
            setEditing(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await api.delete(`/api/admin/doctors/${id}`)
            toast.success('Doctor deleted completely.')
            router.push('/admin/doctors')
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to delete doctor')
        } finally {
            setDeleting(false)
            setShowDelete(false)
        }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary" /></div>
    if (!data) return <p className="text-center py-12 text-text-secondary">Doctor not found</p>

    const { doctor, stats, todayQueue } = data

    const kpis = [
        { label: 'Total Appointments', value: stats.totalAppointments },
        { label: 'This Month', value: stats.monthAppointments },
        { label: 'Completed', value: stats.completedAppointments },
        { label: 'No-Show Rate', value: `${stats.noShowRate}%` },
    ]

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex justify-between items-center gap-4">
                <div>
                    <Link href="/admin/doctors" className="text-caption text-primary hover:underline">← Back to Doctors</Link>
                    <h1 className="text-h1 text-text-primary mt-1">Doctor Detail</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit</Button>
                    <Button className="bg-error text-white hover:bg-error/90" onClick={() => setShowDelete(true)}>Delete</Button>
                </div>
            </div>

            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Doctor Profile">
                <form onSubmit={handleEdit} className="space-y-4">
                    <div>
                        <label className="block text-caption text-text-secondary mb-1">Department</label>
                        <select
                            required value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                            className="w-full h-11 px-4 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none"
                        >
                            <option value="">Select department...</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <Input label="Default Consult Time (min)" type="number" min={5} required value={editForm.defaultConsultTime} onChange={e => setEditForm(f => ({ ...f, defaultConsultTime: Number(e.target.value) }))} />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
                        <Button type="submit" loading={editing}>Save Changes</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Confirm Delete">
                <p className="text-body text-text-secondary">Are you sure you want to permanently delete <strong>{doctor.userId?.name}</strong>? This will remove all their appointments and queue history. This action cannot be undone.</p>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
                    <Button className="bg-error text-white" loading={deleting} onClick={handleDelete}>Delete Permanently</Button>
                </div>
            </Modal>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-body">
                            {(doctor.userId?.name ?? 'D').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-body font-semibold text-text-primary">{doctor.userId?.name ?? '—'}</p>
                            <p className="text-caption text-text-secondary">{doctor.userId?.email}</p>
                        </div>
                    </div>
                    {todayQueue && <Badge status={todayQueue.status} />}
                </CardHeader>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                        <p className="text-caption text-text-secondary">Department</p>
                        <p className="text-body font-medium text-text-primary">{doctor.department ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-caption text-text-secondary">Default Consult Time</p>
                        <p className="text-body font-medium text-text-primary">{doctor.defaultConsultTime ?? 15} min</p>
                    </div>
                    <div>
                        <p className="text-caption text-text-secondary">Working Hours</p>
                        <p className="text-body text-text-primary">
                            {doctor.workingHours?.start ?? '—'} – {doctor.workingHours?.end ?? '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-caption text-text-secondary">Joined</p>
                        <p className="text-body text-text-primary">{formatDate(doctor.createdAt)}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {kpis.map(k => (
                    <Card key={k.label}>
                        <p className="text-caption text-text-secondary uppercase tracking-wide">{k.label}</p>
                        <p className="text-h2 font-bold text-primary mt-1">{k.value}</p>
                    </Card>
                ))}
            </div>

            {todayQueue && (
                <Card>
                    <CardHeader><CardTitle>Today's Queue</CardTitle></CardHeader>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                            ['Booked', todayQueue.totalBooked ?? 0],
                            ['Waiting', todayQueue.waitingCount ?? 0],
                            ['Completed', todayQueue.completedCount ?? 0],
                        ].map(([label, val]) => (
                            <div key={label}>
                                <p className="text-h2 font-bold text-primary">{val}</p>
                                <p className="text-caption text-text-secondary">{label}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
