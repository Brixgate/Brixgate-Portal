import axios from 'axios'

const DIRECT_API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.brixgate.com/api/v1'

// CORS is live on api.brixgate.com — calling the API directly from the browser.
// The /api/proxy route is kept in place but no longer used.
export const BASE_URL = DIRECT_API

// ── Cookie helpers (client-side only) ─────────────────────────────────────────
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)brixgate_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setTokenCookie(token: string) {
  document.cookie = `brixgate_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Strict`
}

export function clearTokenCookie() {
  document.cookie = 'brixgate_token=; path=/; max-age=0; SameSite=Strict'
}

// ── Axios instance ─────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Attach Bearer token on every request
apiClient.interceptors.request.use((config) => {
  const token = getTokenFromCookie()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401 — with two exceptions:
//
// 1. Auth endpoints (/auth/login etc.) — a 401 here means wrong credentials;
//    let the error propagate to the form's catch block for an inline message.
//
// 2. /auth/callback — the elevated applicant token is being validated here;
//    a 401 means the token is stale/invalid. Let the catch block show the
//    "couldn't sign you in" error screen instead of a silent redirect.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/applicants', '/auth/reset-password', '/auth/forgot-password']

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl  = (error.config?.url ?? '') as string
      const currentPath = window.location.pathname

      const isAuthEndpoint   = AUTH_ENDPOINTS.some((ep) => requestUrl.includes(ep))
      const isCallbackPage   = currentPath.startsWith('/auth/')
      // Only redirect if there was a token — means session expired.
      // No token = auth intentionally disabled (review mode), don't redirect.
      const hadToken         = !!getTokenFromCookie()

      if (!isAuthEndpoint && !isCallbackPage && hadToken) {
        clearTokenCookie()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Response unwrapper ─────────────────────────────────────────────────────────
// Handles both { data: ... } wrapper and bare responses
export function unwrap<T>(responseData: unknown): T {
  if (responseData !== null && typeof responseData === 'object') {
    const d = responseData as Record<string, unknown>
    if ('data' in d && d.data !== undefined) return d.data as T
  }
  return responseData as T
}

// ── Token extractor ────────────────────────────────────────────────────────────
// Handles { token }, { access_token }, { data: { token } }, etc.
export function extractToken(responseData: unknown): string | null {
  if (!responseData || typeof responseData !== 'object') return null
  const d = responseData as Record<string, unknown>
  if (typeof d.token === 'string') return d.token
  if (typeof d.access_token === 'string') return d.access_token
  if (d.data && typeof d.data === 'object') {
    const inner = d.data as Record<string, unknown>
    if (typeof inner.token === 'string') return inner.token
    if (typeof inner.access_token === 'string') return inner.access_token
  }
  return null
}

// ── Error message extractor ────────────────────────────────────────────────────
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Network error / CORS — no response received at all
    if (!error.response) {
      return 'Unable to reach the server. Please check your connection and try again.'
    }

    const data = error.response?.data as Record<string, unknown> | undefined
    if (data) {
      // Surface the API's own message directly — it knows best
      if (typeof data.message === 'string' && data.message) return data.message
      if (typeof data.error === 'string' && data.error)     return data.error
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return String(data.errors[0])
      }
    }

    // Status-based fallbacks when no message body
    if (error.response?.status === 401) return 'Incorrect password. Please try again.'
    if (error.response?.status === 404) return 'No account found with that email address.'
    if (error.response?.status === 422) return 'Please check your details and try again.'
    if (error.response?.status === 429) return 'Too many attempts. Please wait a moment and try again.'
    if (error.response?.status && error.response.status >= 500) return 'Server error. Please try again in a moment.'
  }
  return 'Something went wrong. Please try again.'
}
