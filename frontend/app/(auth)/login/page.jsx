'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function LoginPage() {
    const { login } = useAuth()
    const toast = useToast()

    const [form, setForm] = useState({ email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)

    const validate = () => {
        const e = {}
        if (!form.email) e.email = 'Email is required'
        if (!form.password) e.password = 'Password is required'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            await login(form.email, form.password)
        } catch (err) {
            const msg = err?.response?.data?.message || 'Invalid credentials'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="space-y-6 p-7 sm:p-8">
            <div className="space-y-1 text-center">
                <h1 className="text-h1 font-semibold text-primary">Welcome back</h1>
                <p className="text-body text-text-secondary">Sign in to continue to your Qline workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

                <div className="space-y-3">
                    <Input
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        error={errors.password}
                        required
                    />
                    <div className="text-right">
                        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                </div>

                <Button type="submit" fullWidth loading={loading} className="mt-2">
                    Sign in
                </Button>
            </form>

            <p className="text-center text-body text-text-secondary">
                Do not have an account?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    Register
                </Link>
            </p>
        </Card>
    )
}
