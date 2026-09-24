'use client';

/**
 * API Interceptor — Real MongoDB backend only (mock API removed)
 * Re-exports the main api client with real-API-only behavior.
 */
import api from './api';

export default api;
export { api };
