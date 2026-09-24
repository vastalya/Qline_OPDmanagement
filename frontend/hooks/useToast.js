'use client'

import { useContext } from 'react'
import { ToastContext } from '@/contexts/ToastContext'

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be inside <ToastProvider>')
    return ctx.toast
}

export function useToastDismiss() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToastDismiss must be inside <ToastProvider>')
    return ctx.dismiss
}

export function useToasts() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToasts must be inside <ToastProvider>')
    return ctx.toasts
}
