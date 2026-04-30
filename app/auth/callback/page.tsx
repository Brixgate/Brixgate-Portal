'use client'

/**
 * /auth/callback?token=<jwt>
 *
 * Post-payment auto-login.
 * The landing page redirects here with the elevated student-level JWT
 * after payment is confirmed.
 *
 * Flow:
 *  1. Read token from URL
 *  2. Call GET /users/me with Authorization: Bearer {token} to validate
 *  3. Valid   → store session, clear token from URL, go to dashboard
 *  4. Invalid → redirect to /login
 */

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { setTokenCookie } from '@/lib/api-client'

function CallbackContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function run() {
      const token = searchParams.get('token')

      // No token in URL — nothing to do
      if (!token) {
        router.replace('/login')
        return
      }

      try {
        // Validate the token directly — don't store it until we know it's good
        // Always use the proxy path — BASE_URL may resolve to the direct API
        // URL on the server, but this runs in the browser where CORS applies.
        const res = await fetch(`/api/proxy/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (!res.ok) {
          // Token rejected by the API
          router.replace('/login')
          return
        }

        // Valid — persist session and enter the portal
        // router.replace clears the token from the URL naturally
        setTokenCookie(token)
        router.replace('/student/dashboard')
      } catch {
        // Network error / CORS not yet configured — send to login
        router.replace('/login')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stays on screen for ~200ms before the redirect fires
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: '#0D1724' }}
    >
      <Image
        src="/images/logo3.png"
        alt="Brixgate"
        width={40}
        height={40}
        className="brightness-0 invert"
      />
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
          <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-white/70 text-[14px] font-body">Setting up your portal access…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  )
}
