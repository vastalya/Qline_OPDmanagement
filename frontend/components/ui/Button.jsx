'use client'

import { cn } from '@/lib/utils'
import Spinner from './Spinner'

const VARIANTS = {
    primary: 'bg-primary text-white shadow-1 hover:bg-primary/90 active:scale-[0.98]',
    secondary: 'border border-primary/25 bg-surface text-primary hover:bg-primary-soft active:scale-[0.98]',
    danger: 'bg-error text-white shadow-1 hover:bg-error/90 active:scale-[0.98]',
    ghost: 'bg-transparent text-text-secondary hover:bg-primary-soft hover:text-text-primary active:scale-[0.98]',
}

const SIZES = {
    sm: 'h-9 px-4 text-body',
    md: 'h-11 px-5 text-body',
    lg: 'h-12 px-6 text-body-lg',
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    ...props
}) {
    const isDisabled = disabled || loading

    return (
        <button
            disabled={isDisabled}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
                'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-primary focus-visible:ring-offset-2 select-none',
                VARIANTS[variant],
                SIZES[size],
                fullWidth && 'w-full',
                isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                className
            )}
            {...props}
        >
            {loading && <Spinner size="sm" />}
            {children}
        </button>
    )
}
