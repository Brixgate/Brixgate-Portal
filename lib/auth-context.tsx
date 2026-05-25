'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { apiClient, unwrap, getTokenFromCookie, setTokenCookie, clearTokenCookie, setRoleCookie, clearRoleCookie } from './api-client'

// ── API shape coming from the backend ─────────────────────────────────────────
// Handles snake_case, camelCase, and combined name formats
export interface ApiUser {
  id: number
  // Name — all possible formats the backend might send
  name?: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  email: string
  role?: string
  phone?: string
  phone_number?: string
  fullPhoneNumber?: string
  title?: string
  biography?: string
  expertise?: string
  years_of_experience?: number
  profile_image_url?: string
  profile_photo_url?: string
  linkedin_url?: string
  twitter_url?: string
}

// ── Normalised shape used by the UI ──────────────────────────────────────────
export interface AuthUser {
  id: number
  name: string
  firstName: string
  lastName: string
  email: string
  role: string
  phone?: string
  title?: string
  biography?: string
  expertise?: string
  yearsOfExperience?: number
  profileImageUrl?: string
  linkedinUrl?: string
  twitterUrl?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  // rawUserFromLogin: user object embedded in the login response (skips GET /users/me)
  login: (token: string, rawUserFromLogin?: Record<string, unknown>) => Promise<AuthUser | null>
  logout: () => Promise<void>
  updateUser: (patch: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Mapper ────────────────────────────────────────────────────────────────────
function mapUser(u: ApiUser): AuthUser {
  // Handle every naming format the backend might use
  const firstName = (u.first_name ?? u.firstName ?? '').trim()
    || (u.name ?? '').trim().split(/\s+/)[0]
    || ''
  const lastName = (u.last_name ?? u.lastName ?? '').trim()
    || (u.name ?? '').trim().split(/\s+/).slice(1).join(' ')
    || ''
  const fullName = u.name?.trim() || [firstName, lastName].filter(Boolean).join(' ')
  return {
    id: u.id,
    name: fullName,
    firstName,
    lastName,
    email: u.email,
    role: u.role ?? 'student',
    phone: u.fullPhoneNumber ?? u.phone ?? u.phone_number,
    title: u.title,
    biography: u.biography,
    expertise: u.expertise,
    yearsOfExperience: u.years_of_experience,
    profileImageUrl: u.profile_image_url ?? u.profile_photo_url,
    linkedinUrl: u.linkedin_url,
    twitterUrl: u.twitter_url,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await apiClient.get('/users/me')
      const outer = unwrap<{ user?: ApiUser } | ApiUser>(res.data)
      // API returns { data: { user: {...} } } — unwrap strips data, leaving { user: {...} }
      const data: ApiUser = (outer as { user?: ApiUser }).user ?? (outer as ApiUser)
      const mapped = mapUser(data)
      setUser(mapped)
      setRoleCookie(mapped.role)
      return mapped
    } catch (err) {
      // Only clear token on 401 — keep it for network errors
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        clearTokenCookie()
        setToken(null)
      }
      setUser(null)
      return null
    }
  }, [])

  // Hydrate on mount from cookie
  useEffect(() => {
    const stored = getTokenFromCookie()
    if (stored) {
      setToken(stored)
      fetchUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [fetchUser])

  const login = useCallback(
    async (newToken: string, rawUserFromLogin?: Record<string, unknown>): Promise<AuthUser | null> => {
      setTokenCookie(newToken)
      setToken(newToken)
      // If the login response already contains the user, map it immediately —
      // saves a full round-trip GET /users/me and cuts login time in half.
      if (rawUserFromLogin) {
        try {
          const mapped = mapUser(rawUserFromLogin as unknown as ApiUser)
          setUser(mapped)
          setRoleCookie(mapped.role)
          return mapped
        } catch {
          // Mapping failed (unexpected shape) — fall through to fetchUser
        }
      }
      return await fetchUser()
    },
    [fetchUser]
  )

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Swallow — always clear locally
    }
    clearTokenCookie()
    clearRoleCookie()
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
