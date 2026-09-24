'use client'

import { useContext, useEffect } from 'react'
import { SocketContext } from '@/contexts/SocketContext'
import { useAuth } from './useAuth'

export function useSocket() {
    const ctx = useContext(SocketContext)
    if (!ctx) throw new Error('useSocket must be inside <SocketProvider>')
    return ctx
}

/**
 * Auto-connects socket when user is authenticated and disconnects on logout.
 * Call this once in a layout that wraps authenticated pages.
 */
export function useSocketConnection() {
    const { user } = useAuth()
    const { connect, disconnect } = useSocket()

    useEffect(() => {
        if (user) {
            connect()
        } else {
            disconnect()
        }
        return () => disconnect()
    }, [user, connect, disconnect])
}

/**
 * Subscribe to a socket event. Automatically cleans up on unmount.
 * Requires socket to already be connected.
 */
export function useSocketEvent(event, handler) {
    const { on, socket } = useSocket()

    useEffect(() => {
        if (!socket) return
        const unsubscribe = on(event, handler)
        return unsubscribe
    }, [event, handler, on, socket])
}
