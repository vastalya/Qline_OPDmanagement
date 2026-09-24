'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { formatTime, drName } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useSocket, useSocketEvent } from '@/hooks/useSocket'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

export default function QueuePage() {
    const { appointmentId } = useParams()
    const toast = useToast()
    const { joinRoom, leaveRoom } = useSocket()

    const [appointment, setAppointment] = useState(null)
    const [waitInfo, setWaitInfo] = useState(null)
    const [queueState, setQueueState] = useState(null)
    const [loading, setLoading] = useState(true)

    const refreshWaitInfo = useCallback(() => {
        api.get(`/api/appointments/${appointmentId}/wait-info`)
            .then((res) => setWaitInfo(res.data?.data ?? res.data))
            .catch(() => {})
    }, [appointmentId])

    const load = useCallback(async () => {
        try {
            const [apptRes, waitRes] = await Promise.all([
                api.get(`/api/appointments/${appointmentId}`),
                api.get(`/api/appointments/${appointmentId}/wait-info`),
            ])

            const appt = apptRes.data?.data ?? apptRes.data
            const wait = waitRes.data?.data ?? waitRes.data
            setAppointment(appt)
            setWaitInfo(wait)

            const doctorId = appt?.doctorId?._id ?? appt?.doctorId
            const roomDate = appt?.date ?? appt?.slotStart
            if (doctorId && roomDate) {
                joinRoom(doctorId, roomDate)
            }
        } catch {
            toast.error('Could not load queue information')
        } finally {
            setLoading(false)
        }
    }, [appointmentId, joinRoom, toast])

    useEffect(() => {
        load()
        return () => leaveRoom()
    }, [load, leaveRoom])

    useSocketEvent('queue:updated', setQueueState)
    useSocketEvent('queue:update', setQueueState)
    useSocketEvent('queue:token-called', () => {
        refreshWaitInfo()
        load()
    })
    useSocketEvent('queue:paused', (data) => {
        setQueueState((prev) => ({ ...(prev || {}), status: data?.status ?? 'paused' }))
    })
    useSocketEvent('queue:resumed', (data) => {
        setQueueState((prev) => ({ ...(prev || {}), status: data?.status ?? 'active' }))
    })
    useSocketEvent('queue:closed', (data) => {
        setQueueState((prev) => ({ ...(prev || {}), status: data?.status ?? 'closed' }))
    })
    useSocketEvent('appointment:status-changed', (data) => {
        if (data?.appointmentId !== appointmentId) return
        setAppointment((prev) => prev ? { ...prev, status: data.newStatus } : prev)
        refreshWaitInfo()
    })

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    const position = waitInfo?.position ?? '-'
    const patientsAhead = waitInfo?.patientsAhead ?? 0
    const estWait = waitInfo?.estimatedWait
    const currentToken = waitInfo?.currentToken ?? queueState?.currentToken ?? '-'
    const myToken = appointment?.tokenNumber

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <Card className="p-8 text-center">
                <p className="mb-2 text-caption uppercase tracking-wider text-text-secondary">
                    Now Serving
                </p>
                <div className="text-[72px] font-bold leading-none text-primary">
                    {currentToken}
                </div>
                <Badge status={queueState?.status ?? 'active'} className="mt-4" />
            </Card>

            <Card>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-caption text-text-secondary">Your Token</p>
                        <p className="text-h1 font-bold text-text-primary">#{myToken}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-caption text-text-secondary">Patients Ahead</p>
                        <p className="text-h2 font-semibold text-text-primary">{patientsAhead}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-caption text-text-secondary">Queue Position</p>
                        <p className="text-h3 font-semibold text-text-primary">
                            {typeof position === 'number' ? `#${position}` : position}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-caption text-text-secondary">Doctor</p>
                        <p className="text-body font-semibold text-text-primary">
                            {drName(appointment?.doctorId?.name)}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className="text-center">
                    <p className="mb-1 text-caption text-text-secondary">Estimated Wait</p>
                    <p className="text-h2 font-semibold text-text-primary">
                        {estWait != null ? `${estWait} min` : '-'}
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="mb-1 text-caption text-text-secondary">Your Slot</p>
                    <p className="text-h3 font-semibold text-text-primary">
                        {appointment?.slotStart ? formatTime(appointment.slotStart) : '-'}
                    </p>
                </Card>
            </div>

            <Card>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-body font-medium text-text-primary">Appointment Status</p>
                        <p className="mt-0.5 text-caption text-text-secondary">
                            {drName(appointment?.doctorId?.name)}
                        </p>
                    </div>
                    <Badge status={appointment?.status ?? 'waiting'} />
                </div>
            </Card>

            <div className="flex items-center justify-center gap-2 text-caption text-text-secondary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                Updates live via socket
            </div>
        </div>
    )
}
