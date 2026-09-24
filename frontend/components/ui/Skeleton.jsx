'use client'

import { cn } from '@/lib/utils'

export default function Skeleton({ className = '', ...props }) {
    return (
        <div
            aria-hidden="true"
            className={cn('animate-pulse rounded-md bg-border', className)}
            {...props}
        />
    )
}

export function DoctorCardSkeleton() {
    return (
        <div className="space-y-3 rounded-lg bg-surface p-4 shadow-1">
            <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-11 w-full rounded-md" />
        </div>
    )
}

export function AppointmentRowSkeleton() {
    return (
        <div className="flex items-center gap-4 rounded-lg bg-surface p-4 shadow-1">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-7 w-20 rounded-pill" />
        </div>
    )
}

export function StatCardSkeleton() {
    return (
        <div className="space-y-2 rounded-lg bg-surface p-4 shadow-1">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
        </div>
    )
}

