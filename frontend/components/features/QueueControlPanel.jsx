'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatTime, getInitials } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'

export default function QueueControlPanel({
    currentAppointment,
    nextAppointment,
    queueList = [],
    queueState,
    onCallNext,
    onComplete,
    onNoShow,
    onPause,
    onResume,
    medicalRecordHref,
    loading = {},
}) {
    const [confirm, setConfirm] = useState(null)
    const isPaused = queueState?.status === 'paused'
    const waitingCount = queueState?.waitingCount ?? queueState?.counts?.waiting ?? 0

    const executeConfirm = async () => {
        if (confirm === 'complete') await onComplete()
        if (confirm === 'no_show') await onNoShow()
        setConfirm(null)
    }

    return (
        <>
            <div className="space-y-5 rounded-lg bg-surface p-5 shadow-1">
                <div className="grid grid-cols-3 gap-0 divide-x divide-border text-center">
                    <StatCell label="Current" value={queueState?.currentToken ?? '-'} />
                    <StatCell label="Waiting" value={waitingCount} />
                    <StatCell label="Status" value={<Badge status={queueState?.status ?? 'active'} />} />
                </div>

                <QueuePersonCard
                    title="Current Patient"
                    appointment={currentAppointment}
                    emptyLabel="No patient currently in consultation"
                />

                <QueuePersonCard
                    title="Next Patient"
                    appointment={nextAppointment}
                    emptyLabel="No patient waiting"
                />

                <div className="rounded-lg border border-border bg-bg p-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-caption text-text-secondary">Queue List</p>
                        <span className="text-caption font-medium text-text-primary">{queueList.length}</span>
                    </div>
                    {queueList.length ? (
                        <div className="mt-3 space-y-2">
                            {queueList.map((appointment) => (
                                <div key={appointment._id} className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-body font-medium text-text-primary">
                                            {appointment.patientId?.name || appointment.patientName || 'Patient'}
                                        </p>
                                        <p className="text-caption text-text-secondary">Token #{appointment.tokenNumber}</p>
                                    </div>
                                    <Badge status={appointment.status} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-2 text-body text-text-secondary">Queue is empty</p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <Button
                        fullWidth
                        onClick={onCallNext}
                        loading={loading.callNext}
                        disabled={isPaused || !!currentAppointment}
                    >
                        Call Next Patient
                    </Button>

                    {currentAppointment ? (
                        <>
                            {medicalRecordHref ? (
                                <Link href={medicalRecordHref}>
                                    <Button variant="secondary" className="w-full">
                                        Add Medical Record
                                    </Button>
                                </Link>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setConfirm('complete')}
                                    loading={loading.complete}
                                >
                                    Mark Complete
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setConfirm('no_show')}
                                    loading={loading.noShow}
                                >
                                    Mark No-Show
                                </Button>
                            </div>
                        </>
                    ) : null}

                    <Button
                        variant={isPaused ? 'primary' : 'secondary'}
                        fullWidth
                        onClick={isPaused ? onResume : onPause}
                        loading={loading.pause}
                    >
                        {isPaused ? 'Resume Queue' : 'Pause Queue'}
                    </Button>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={executeConfirm}
                title={confirm === 'complete' ? 'Mark as Completed' : 'Mark as No-Show'}
                message="This action cannot be undone."
                confirmLabel="Yes, confirm"
                loading={loading.complete || loading.noShow}
            />
        </>
    )
}

function QueuePersonCard({ title, appointment, emptyLabel }) {
    return (
        <div className="rounded-lg border border-border bg-bg p-3">
            <p className="text-caption text-text-secondary">{title}</p>
            {appointment ? (
                <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-body font-semibold text-primary">
                        {getInitials(appointment.patientId?.name || appointment.patientName || 'P')}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-body-lg font-semibold text-text-primary">
                            {appointment.patientId?.name || appointment.patientName || 'Patient'}
                        </p>
                        <p className="text-caption text-text-secondary">
                            Token #{appointment.tokenNumber}
                            {appointment.slotStart ? ` | ${formatTime(appointment.slotStart)}` : ''}
                        </p>
                    </div>
                    <Badge status={appointment.status || 'waiting'} />
                </div>
            ) : (
                <p className="mt-2 text-body text-text-secondary">{emptyLabel}</p>
            )}
        </div>
    )
}

function StatCell({ label, value }) {
    return (
        <div className="px-4 py-2">
            <p className="mb-1 text-caption text-text-secondary">{label}</p>
            <div className="text-h2 font-semibold text-text-primary">{value}</div>
        </div>
    )
}
