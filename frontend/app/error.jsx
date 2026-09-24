'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function ErrorPage({ error, reset }) {
    useEffect(() => {
        console.error('[App Error]', error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-bg px-4">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-h1 text-error">
                !
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-h2 text-text-primary">Something went wrong</h1>
                <p className="text-body text-text-secondary max-w-sm">
                    {error?.message || 'An unexpected error occurred. Please try again.'}
                </p>
            </div>
            <Button onClick={reset}>Try again</Button>
        </div>
    )
}
