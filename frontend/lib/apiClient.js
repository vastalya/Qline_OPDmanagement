import { isAxiosError } from 'axios'

const DEFAULT_ARRAY_KEYS = [
    'data',
    'items',
    'results',
    'docs',
    'appointments',
    'notifications',
    'records',
    'users',
    'doctors',
    'logs',
    'sessions',
]

function getPayload(input) {
    if (input == null) return null
    if (typeof input !== 'object') return input

    // Axios response object
    if ('data' in input && 'status' in input && 'headers' in input) {
        return input.data
    }

    return input
}

function asObject(value) {
    return value && typeof value === 'object' ? value : {}
}

function pickFirstArray(source, keys) {
    if (Array.isArray(source)) return source
    if (!source || typeof source !== 'object') return null

    for (const key of keys) {
        if (Array.isArray(source[key])) return source[key]
    }

    return null
}

export function unwrapApiData(input) {
    const payload = getPayload(input)
    if (payload == null) return payload

    if (
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload) &&
        Object.prototype.hasOwnProperty.call(payload, 'data')
    ) {
        return payload.data
    }

    return payload
}

export function normalizePaginatedResponse(input, options = {}) {
    const arrayKeys = options.arrayKeys || DEFAULT_ARRAY_KEYS
    const payload = asObject(getPayload(input))
    const innerData =
        payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
            ? payload.data
            : null

    const primarySource = innerData || payload
    const fallbackSource = payload

    const items =
        pickFirstArray(primarySource, arrayKeys) ??
        pickFirstArray(fallbackSource, arrayKeys) ??
        []

    const total =
        primarySource.total ??
        primarySource.count ??
        primarySource.pagination?.total ??
        fallbackSource.total ??
        fallbackSource.count ??
        fallbackSource.pagination?.total ??
        items.length

    const page =
        primarySource.page ??
        primarySource.currentPage ??
        primarySource.pagination?.page ??
        fallbackSource.page ??
        fallbackSource.currentPage ??
        fallbackSource.pagination?.page ??
        1

    const pages =
        primarySource.pages ??
        primarySource.totalPages ??
        primarySource.pagination?.pages ??
        fallbackSource.pages ??
        fallbackSource.totalPages ??
        fallbackSource.pagination?.pages ??
        1

    return {
        items: Array.isArray(items) ? items : [],
        total: Number(total) || 0,
        page: Number(page) || 1,
        pages: Number(pages) || 1,
        payload,
    }
}

export function getApiMessage(input, fallback = '') {
    const payload = asObject(getPayload(input))
    return payload.message || payload.error || fallback
}

export function normalizeApiError(error, fallback = 'Request failed') {
    if (!error) return fallback
    if (typeof error === 'string') return error

    const maybeAxios = isAxiosError(error)
    const responseData = maybeAxios ? error.response?.data : error?.response?.data

    if (typeof responseData === 'string' && responseData.trim()) {
        return responseData
    }

    if (responseData && typeof responseData === 'object') {
        if (typeof responseData.message === 'string' && responseData.message.trim()) {
            return responseData.message
        }
        if (typeof responseData.error === 'string' && responseData.error.trim()) {
            return responseData.error
        }
        if (Array.isArray(responseData.errors) && responseData.errors.length) {
            return responseData.errors.join(', ')
        }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message
    }

    return fallback
}

export function createActionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `action-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

