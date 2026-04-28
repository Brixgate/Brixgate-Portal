import axios from 'axios'

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.brixgate.com/api/v1'

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

// Redirect to login on 401 — but NOT for auth endpoints themselves.
// If /auth/login returns 401 it means wrong credentials: let the error
// propagate to the form's catch block so it can show an inline message.
// Only redirect when a protected endpoint rejects an expired/missing token.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/applicants']

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = (error.config?.url ?? '') as string
      const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => requestUrl.includes(ep))
      if (!isAuthEndpoint) {
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
    const data = error.response?.data as Record<string, unknown> | undefined
    if (data) {
      if (typeof data.message === 'string') return data.message
      if (typeof data.error === 'string') return data.error
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return String(data.errors[0])
      }
    }
    if (error.response?.status === 401) return 'Invalid email or password.'
    if (error.response?.status === 422) return 'Please check your details and try again.'
    if (error.response?.status === 429) return 'Too many attempts. Please try again later.'
    if (error.response?.status && error.response.status >= 500) return 'Server error. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}
