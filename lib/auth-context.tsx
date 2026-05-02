'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { apiClient, unwrap, getTokenFromCookie, setTokenCookie, clearTokenCookie } from './api-client'

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
  login: (token: string) => Promise<void>
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
    phone: u.phone ?? u.phone_number,
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

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/users/me')
      // eslint-disable-next-line no-console
      console.log('[auth] /users/me raw response:', JSON.stringify(res.data))
      const data = unwrap<ApiUser>(res.data)
      // eslint-disable-next-line no-console
      console.log('[auth] unwrapped user data:', JSON.stringify(data))
      setUser(mapUser(data))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[auth] /users/me failed:', err)
      // Only clear token on 401 — keep it for network errors
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        clearTokenCookie()
        setToken(null)
      }
      setUser(null)
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
    async (newToken: string) => {
      setTokenCookie(newToken)
      setToken(newToken)
      await fetchUser()
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
