'use client'

import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '@/lib/tokenStore'

export const SocketContext = createContext(null)

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export function SocketProvider({ children }) {
    const socketRef = useRef(null)
    const currentRoom = useRef(null) // { doctorId, date: 'YYYY-MM-DD' }
    const [connected, setConnected] = useState(false)

    const connect = useCallback(() => {
        const token = getAccessToken()
        if (!token || socketRef.current?.connected) return

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        })

        socket.on('connect', () => {
            setConnected(true)
            if (currentRoom.current) {
                socket.emit('join:doctor-room', currentRoom.current)
            }
        })

        socket.on('disconnect', () => setConnected(false))
        socket.on('connect_error', (err) => {
            // Keep this as a warning so transient network failures are visible in dev.
            console.warn('[Socket] connect error:', err.message)
        })

        socketRef.current = socket
    }, [])

    const disconnect = useCallback(() => {
        socketRef.current?.disconnect()
        socketRef.current = null
        currentRoom.current = null
        setConnected(false)
    }, [])

    const joinRoom = useCallback((doctorId, date) => {
        if (!doctorId || !date) return

        const dateStr =
            date instanceof Date
                ? date.toISOString().split('T')[0]
                : String(date).split('T')[0]

        const payload = { doctorId, date: dateStr }
        currentRoom.current = payload
        socketRef.current?.emit('join:doctor-room', payload)
    }, [])

    const leaveRoom = useCallback(() => {
        if (!currentRoom.current) return
        socketRef.current?.emit('leave:doctor-room', currentRoom.current)
        currentRoom.current = null
    }, [])

    const emit = useCallback((event, data) => {
        socketRef.current?.emit(event, data)
    }, [])

    const on = useCallback((event, handler) => {
        socketRef.current?.on(event, handler)
        return () => socketRef.current?.off(event, handler)
    }, [])

    useEffect(() => () => disconnect(), [disconnect])

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                connected,
                connect,
                disconnect,
                joinRoom,
                leaveRoom,
                emit,
                on,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}

