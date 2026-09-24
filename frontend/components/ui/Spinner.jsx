'use client'

import { cn } from '@/lib/utils'

export default function Spinner({ size = 'md', className = '' }) {
    const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' }
    return (
        <span
            role="status"
            aria-label="Loading"
            className={cn(
                'inline-block rounded-full border-2 border-current border-t-transparent animate-spin',
                sizes[size],
                className
            )}
        />
    )
}
