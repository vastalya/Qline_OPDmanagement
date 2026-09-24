'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import api from '@/lib/api'
import Navbar from '@/components/layout/Navbar'
import { useSocketConnection } from '@/hooks/useSocket'
import { useToast } from '@/hooks/useToast'
import Spinner from '@/components/ui/Spinner'

function SocketConnector() {
    useSocketConnection()
    return null
}

export default function DoctorLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const toast = useToast()
    const [verifying, setVerifying] = useState(true)
    const carryForwardToastShown = useRef(false)

    useEffect(() => {
        let mounted = true
        api.get('/api/doctors/my-schedule')
            .then((r) => {
                const payload = r.data?.data ?? r.data
                const doc = payload?.doctor ?? r.data?.doctor ?? payload
                const autoReassignedAppointments =
                    payload?.autoReassignedAppointments ??
                    r.data?.autoReassignedAppointments ??
                    0
                if (!mounted) return
                if (autoReassignedAppointments > 0 && !carryForwardToastShown.current) {
                    carryForwardToastShown.current = true
                    const plural = autoReassignedAppointments !== 1
                    toast.info(
                        `${autoReassignedAppointments} past appointment${plural ? 's' : ''} ${plural ? 'were' : 'was'} moved to the next available slot${plural ? 's' : ''}.`
                    )
                }
                if (doc && !doc.isConfigured && !pathname.includes('/doctor/configure')) {
                    router.replace('/doctor/configure')
                } else {
                    setVerifying(false)
                }
            })
            .catch(() => {
                if (mounted) {
                    if (!pathname.includes('/doctor/configure')) {
                        router.replace('/doctor/configure')
                    } else {
                        setVerifying(false)
                    }
                }
            })
        return () => { mounted = false }
    }, [pathname, router, toast])

    if (verifying && !pathname.includes('/doctor/configure')) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-bg">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    return (
        <>
            <SocketConnector />
            <div className="min-h-screen bg-bg">
                <Navbar />
                <main className="section-shell">
                    {children}
                </main>
            </div>
        </>
    )
}
