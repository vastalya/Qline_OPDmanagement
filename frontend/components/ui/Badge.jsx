'use client'

import { cn, getStatusConfig } from '@/lib/utils'

export default function Badge({ status, label, className = '' }) {
    const config = getStatusConfig(status)
    const displayLabel = label ?? config.label

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-pill border px-3 py-1 text-caption font-semibold uppercase tracking-[0.02em]',
                config.bg,
                config.text,
                'border-current/15',
                className
            )}
        >
            {displayLabel}
        </span>
    )
}
