'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARDS } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'

export default function RootPage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading) {
            const dest = user ? ROLE_DASHBOARDS[user.role] : '/login'
            router.replace(dest || '/login')
        }
    }, [user, isLoading, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg">
            <Spinner size="lg" className="text-primary" />
        </div>
    )
}
