'use client'

import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

export function LoadingState({
    label = 'Loading...',
    fullScreen = false,
    className = '',
}) {
    return (
        <div
            className={cn(
                'flex items-center justify-center gap-3 text-text-secondary',
                fullScreen ? 'min-h-screen' : 'py-20',
                className
            )}
            role="status"
            aria-live="polite"
        >
            <Spinner className="text-primary" />
            <span className="text-body">{label}</span>
        </div>
    )
}

export function ErrorState({
    message = 'Something went wrong.',
    onRetry,
    retryLabel = 'Retry',
    className = '',
}) {
    return (
        <Card className={cn('border-error/30 bg-error/5', className)}>
            <div className="space-y-3">
                <h2 className="text-h3 text-error">Unable to load data</h2>
                <p className="text-body text-text-secondary">{message}</p>
                {onRetry && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                        {retryLabel}
                    </Button>
                )}
            </div>
        </Card>
    )
}

export function EmptyState({
    title = 'No results found',
    description = 'Try changing your filters or check back later.',
    action = null,
    className = '',
}) {
    return (
        <Card className={cn('text-center', className)}>
            <div className="space-y-2 py-8">
                <h2 className="text-h3 text-text-primary">{title}</h2>
                <p className="mx-auto max-w-md text-body text-text-secondary">{description}</p>
                {action}
            </div>
        </Card>
    )
}

export function PermissionState({
    title = 'Access restricted',
    description = 'You do not have permission to view this page.',
    action = null,
    className = '',
}) {
    return (
        <Card className={cn('border-warning/30 bg-warning/5', className)}>
            <div className="space-y-2">
                <h2 className="text-h3 text-warning">{title}</h2>
                <p className="text-body text-text-secondary">{description}</p>
                {action}
            </div>
        </Card>
    )
}

