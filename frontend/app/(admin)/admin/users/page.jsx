'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardHeader, CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { PAGE_SIZE } from '@/lib/utils'

const ROLES = ['', 'patient', 'doctor', 'admin']

export default function AdminUsersPage() {
    const toast = useToast()
    const [search, setSearch] = useState('')
    const [role, setRole] = useState('')
    const [query, setQuery] = useState({ search: '', role: '' })

    const fetchUsers = useCallback(async (page, limit) => {
        const r = await api.get('/api/admin/users', {
            params: { page, limit, ...(query.role && { role: query.role }), ...(query.search && { search: query.search }) }
        })
        const raw = r.data
        return { data: { data: raw.users ?? [], total: raw.pagination?.total ?? 0, pages: raw.pagination?.pages ?? 1 } }
    }, [query])

    const { data: users, page, pages, loading, fetch, goToPage } = usePagination(fetchUsers, PAGE_SIZE)
    useEffect(() => { fetch(1) }, [fetch])

    const applyFilter = (e) => { e.preventDefault(); setQuery({ search, role }); }

    const toggleStatus = async (userId, currentStatus) => {
        try {
            await api.patch(`/api/admin/users/${userId}/status`, {
                status: currentStatus === 'active' ? 'suspended' : 'active'
            })
            toast.success('User status updated')
            fetch(page)
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to update status')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1 text-text-primary">User Management</h1>
                    <p className="text-body text-text-secondary">Manage all users across roles</p>
                </div>
            </div>

            <form onSubmit={applyFilter} className="flex flex-col sm:flex-row gap-3">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..." className="flex-1" />
                <select value={role} onChange={e => setRole(e.target.value)}
                    className="h-11 px-3 rounded-md border border-border bg-surface text-body text-text-primary focus:border-primary outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All Roles'}</option>)}
                </select>
                <Button type="submit" variant="secondary" size="sm">Search</Button>
            </form>

            <Card padding={false}>
                <div className="overflow-x-auto">
                    <table className="w-full text-body">
                        <thead>
                            <tr className="border-b border-border text-caption text-text-secondary uppercase tracking-wide">
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">Email</th>
                                <th className="text-left px-4 py-3">Role</th>
                                <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                                <th className="text-right px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 5 }).map((__, j) => (
                                        <td key={j} className="px-4 py-3"><div className="h-4 bg-border rounded animate-pulse" /></td>
                                    ))}</tr>
                                ))
                                : users.map(u => (
                                    <tr key={u._id} className="hover:bg-bg transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-text-primary">{u.name}</p>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${u.role === 'admin' ? 'bg-error/10 text-error' :
                                                    u.role === 'doctor' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'
                                                }`}>{u.role}</span>
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary text-caption hidden md:table-cell">{timeAgo(u.createdAt)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/users/${u._id}`}>
                                                    <Button variant="secondary" size="sm">View</Button>
                                                </Link>
                                                <Button variant={u.status === 'suspended' ? 'primary' : 'danger'} size="sm"
                                                    onClick={() => toggleStatus(u._id, u.status ?? 'active')}>
                                                    {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {!loading && users.length === 0 && (
                        <p className="text-center text-text-secondary py-8">No users found</p>
                    )}
                </div>
                <div className="p-4">
                    <Pagination page={page} pages={pages} onPageChange={goToPage} loading={loading} />
                </div>
            </Card>
        </div>
    )
}
