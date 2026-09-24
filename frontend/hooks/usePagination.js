'use client'

import { useState, useCallback } from 'react'
import { normalizeApiError, normalizePaginatedResponse } from '@/lib/apiClient'

/**
 * Generic pagination hook.
 * @param {Function} fetchFn - async (page, limit) => { data, total, page, pages }
 * @param {number} limit - page size (default 10)
 */
export function usePagination(fetchFn, limit = 10) {
    const [data, setData] = useState([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pages, setPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const fetch = useCallback(
        async (p = 1) => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetchFn(p, limit)
                const parsed = normalizePaginatedResponse(res)
                const computedPages =
                    parsed.pages > 1
                        ? parsed.pages
                        : Math.max(1, Math.ceil((parsed.total || 0) / limit))

                setData(parsed.items)
                setTotal(parsed.total)
                setPages(computedPages)
                setPage(p)
            } catch (err) {
                setError(normalizeApiError(err, 'Failed to load data'))
            } finally {
                setLoading(false)
            }
        },
        [fetchFn, limit]
    )

    const goToPage = useCallback((p) => fetch(p), [fetch])

    return { data, page, pages, total, loading, error, fetch, goToPage }
}
