'use client'

import { createContext, useCallback, useRef, useState } from 'react'

export const ToastContext = createContext(null)

let _id = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timersRef = useRef({})

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        clearTimeout(timersRef.current[id])
        delete timersRef.current[id]
    }, [])

    const addToast = useCallback(
        ({ type = 'info', message, duration = 4000 }) => {
            const id = ++_id
            setToasts((prev) => [...prev, { id, type, message }])
            timersRef.current[id] = setTimeout(() => dismiss(id), duration)
        },
        [dismiss]
    )

    const toast = {
        success: (message) => addToast({ type: 'success', message }),
        error: (message) => addToast({ type: 'error', message }),
        info: (message) => addToast({ type: 'info', message }),
        warning: (message) => addToast({ type: 'warning', message }),
    }

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
        </ToastContext.Provider>
    )
}
