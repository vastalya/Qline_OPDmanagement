'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useToasts, useToastDismiss } from '@/hooks/useToast'

const TYPE_STYLES = {
    success: 'border-l-success bg-success/5 text-success',
    error: 'border-l-error bg-error/5 text-error',
    warning: 'border-l-warning bg-warning/5 text-warning',
    info: 'border-l-info bg-info/5 text-info',
}

const TYPE_ICONS = {
    success: 'OK',
    error: 'ERR',
    warning: 'WARN',
    info: 'INFO',
}

function ToastItem({ id, type, message }) {
    const [visible, setVisible] = useState(false)
    const dismiss = useToastDismiss()

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 10)
        return () => clearTimeout(timeout)
    }, [])

    const handleDismiss = () => {
        setVisible(false)
        setTimeout(() => dismiss(id), 200)
    }

    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                'flex w-80 items-start gap-3 rounded-lg border border-border border-l-4 p-4 shadow-2',
                'transition-all duration-200',
                visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
                TYPE_STYLES[type] || TYPE_STYLES.info
            )}
        >
            <span className="mt-0.5 text-caption font-semibold">{TYPE_ICONS[type]}</span>
            <p className="flex-1 text-body text-text-primary">{message}</p>
            <button
                onClick={handleDismiss}
                className="text-caption text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Dismiss"
            >
                x
            </button>
        </div>
    )
}

export default function ToastContainer() {
    const toasts = useToasts()

    return (
        <div aria-live="assertive" className="fixed right-4 top-4 z-[100] flex items-end gap-2">
            <div className="flex flex-col gap-2">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} {...toast} />
                ))}
            </div>
        </div>
    )
}

