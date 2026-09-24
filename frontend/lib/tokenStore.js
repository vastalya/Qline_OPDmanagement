/**
 * In-memory access token store.
 * NEVER persisted to localStorage, sessionStorage, or cookies.
 * Cleared on page refresh — session is restored via /api/auth/refresh
 * with the httpOnly refresh token cookie.
 */
let _accessToken = null

export const setAccessToken = (token) => { _accessToken = token }
export const getAccessToken = () => _accessToken
export const clearAccessToken = () => { _accessToken = null }
