'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { normalizeApiError, unwrapApiData } from '@/lib/apiClient'
import { setAccessToken, clearAccessToken } from '@/lib/tokenStore'
import { ROLE_DASHBOARDS } from '@/lib/utils'

export const AuthContext = createContext(null)

// Cookie readable by Next middleware for route gating.
const setRoleCookie = (role) => {
    const maxAge = 7 * 24 * 60 * 60 // 7 days
    document.cookie = `qline_role=${role}; path=/; SameSite=Lax; Max-Age=${maxAge}`
}

const clearRoleCookie = () => {
    document.cookie = 'qline_role=; path=/; Max-Age=0'
}

const normalizeAuthData = (input) => unwrapApiData(input)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Restore session using secure httpOnly refresh cookie.
    useEffect(() => {
        ; (async () => {
            try {
                const res = await api.post('/api/auth/refresh', {})
                const { accessToken, user: userData } = normalizeAuthData(res.data)

                if (accessToken) {
                    setAccessToken(accessToken)
                }
                if (userData) {
                    setUser(userData)
                    if (userData.role) setRoleCookie(userData.role)
                }
            } catch {
                clearAccessToken()
                clearRoleCookie()
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        })()
    }, [])

    const login = useCallback(
        async (email, password) => {
            const res = await api.post('/api/auth/login', { email, password })
            const { accessToken, user: userData } = normalizeAuthData(res.data)

            setAccessToken(accessToken)
            setUser(userData)
            if (userData?.role) setRoleCookie(userData.role)

            router.push(ROLE_DASHBOARDS[userData.role] || '/')
            return userData
        },
        [router]
    )

    const logout = useCallback(async () => {
        try {
            await api.post('/api/auth/logout', {})
        } catch {
            // Ignore API/network failures and clear local auth state regardless.
        } finally {
            clearAccessToken()
            clearRoleCookie()
            setUser(null)
            router.push('/login')
        }
    }, [router])

    const updateUser = useCallback((nextUser) => {
        if (!nextUser) return
        setUser((prev) => ({ ...(prev || {}), ...nextUser }))
        if (nextUser.role) setRoleCookie(nextUser.role)
    }, [])

    const refreshUser = useCallback(async () => {
        try {
            const res = await api.get('/api/profile')
            const profilePayload = normalizeAuthData(res.data)
            const userData = profilePayload?.user ?? profilePayload

            if (userData) {
                setUser(userData)
                if (userData.role) setRoleCookie(userData.role)
            }

            return userData
        } catch (error) {
            throw new Error(normalizeApiError(error, 'Failed to refresh profile'))
        }
    }, [])

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
