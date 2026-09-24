'use client'

import { cn } from '@/lib/utils'

export default function Card({ children, className = '', hover = false, padding = true }) {
    return (
        <div
            className={cn(
                'rounded-xl border border-border/70 bg-surface/95 shadow-1 backdrop-blur-[1px]',
                padding && 'p-5',
                hover && 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2',
                className
            )}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className = '' }) {
    return (
        <div className={cn('flex items-center justify-between mb-4', className)}>
            {children}
        </div>
    )
}

export function CardTitle({ children, className = '' }) {
    return <h3 className={cn('text-h3 text-text-primary', className)}>{children}</h3>
}
