'use client'

import Link from 'next/link'
import { formatTime, getInitials } from '@/lib/utils'
import Button from '@/components/ui/Button'

function drName(name) {
    if (!name) return 'Doctor'
    const n = name.trim()
    return n.toLowerCase().startsWith('dr.') ? n : `Dr. ${n}`
}

export default function DoctorCard({ doctor }) {
    const { _id, user, department, defaultConsultTime, nextAvailableSlot, waitingTime } = doctor

    const name = drName(user?.name)
    const dept = department || 'General Medicine'
    const slotTime = nextAvailableSlot ? formatTime(nextAvailableSlot) : null

    return (
        <article className="flex flex-col gap-4 rounded-xl border border-border/70 bg-surface/95 p-5 shadow-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-body-lg font-semibold text-primary">
                    {getInitials(name)}
                </div>
                <div className="min-w-0">
                    <h3 className="truncate text-body-lg font-semibold text-text-primary">{name}</h3>
                    <p className="truncate text-body text-text-secondary">{dept}</p>
                </div>
            </div>

            <div className="space-y-2.5 rounded-lg bg-surface/50 p-3">
                <div className="flex items-center justify-between text-caption">
                    <span className="text-text-secondary">Consultation Time:</span>
                    <span className="font-medium text-text-primary">{defaultConsultTime || 15} min</span>
                </div>

                {waitingTime && (
                    <>
                        <div className="h-px bg-border/30" />
                        <div className="flex items-center justify-between text-caption">
                            <span className="text-text-secondary">Est. Wait Time:</span>
                            <span className="font-semibold text-primary">{waitingTime.estimatedWaitMinutes} min</span>
                        </div>
                        <div className="flex items-center justify-between text-caption">
                            <span className="text-text-secondary">Queue:</span>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2 w-2 rounded-full bg-warning" />
                                {waitingTime.patientsInQueue} patient{waitingTime.patientsInQueue !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-caption">
                <span className="inline-flex items-center gap-1 text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Available for Booking
                </span>
            </div>

            <Link href={`/doctors/${_id}/book`} tabIndex={-1} className="mt-auto">
                <Button fullWidth>
                    Book Appointment
                </Button>
            </Link>
        </article>
    )
}
