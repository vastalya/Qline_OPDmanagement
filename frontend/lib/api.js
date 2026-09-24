/**
 * API Client — Real MongoDB backend only (mock API removed)
 * All requests go to the real backend at NEXT_PUBLIC_API_URL.
 */
import axios from 'axios'
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
}, (error) => Promise.reject(error))

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
    failedQueue = []
}

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config || {}
        const requestUrl = String(original.url || '')

        // Never refresh if the refresh request itself failed
        if (requestUrl.includes('/api/auth/refresh')) {
            return Promise.reject(error)
        }

        // Handle 401 — attempt token refresh
        if (error.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then((token) => {
                    original.headers = original.headers || {}
                    original.headers.Authorization = `Bearer ${token}`
                    return api(original)
                }).catch((err) => Promise.reject(err))
            }

            original._retry = true
            isRefreshing = true

            try {
                const res = await axios.post(
                    `${BASE_URL}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                )

                const { accessToken } = res.data?.data || res.data
                setAccessToken(accessToken)
                processQueue(null, accessToken)

                original.headers = original.headers || {}
                original.headers.Authorization = `Bearer ${accessToken}`
                return api(original)
            } catch (refreshError) {
                processQueue(refreshError, null)
                clearAccessToken()

                if (typeof document !== 'undefined') {
                    document.cookie = 'qline_role=; Max-Age=0; path=/'
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login'
                    }
                }

                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default api
