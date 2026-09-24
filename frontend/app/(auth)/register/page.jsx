'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

const ROLES = [
    { value: 'patient', label: 'Patient', chip: 'PT' },
    { value: 'doctor', label: 'Doctor', chip: 'DR' },
]

export default function RegisterPage() {
    const router = useRouter()
    const toast = useToast()

    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)

    const validate = () => {
        const e = {}
        if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
        if (!form.email) e.email = 'Email is required'
        if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            await api.post('/api/auth/register', form)
            toast.success('Account created. Please sign in.')
            router.push('/login')
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="space-y-6 p-7 sm:p-8">
            <div className="space-y-1 text-center">
                <h1 className="text-h1 font-semibold text-primary">Create account</h1>
                <p className="text-body text-text-secondary">Set up your Qline access in under a minute.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                    <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                        className={cn(
                            'flex items-center justify-center gap-2 rounded-lg border py-2.5 text-body font-medium transition-colors duration-200',
                            form.role === r.value
                                ? 'border-primary bg-primary-soft text-primary'
                                : 'border-border text-text-secondary hover:border-primary/50'
                        )}
                    >
                        <span className="rounded bg-surface px-1.5 py-0.5 text-caption font-semibold">{r.chip}</span>
                        {r.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                    label="Full name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    error={errors.name}
                    required
                />
                <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    error={errors.email}
                    required
                />
                <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    error={errors.password}
                    required
                />

                <Button type="submit" fullWidth loading={loading} className="mt-2">
                    Create account
                </Button>
            </form>

            <p className="text-center text-body text-text-secondary">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign in
                </Link>
            </p>
        </Card>
    )
}
