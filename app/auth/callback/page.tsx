'use client'

/**
 * /auth/callback?token=<jwt>
 *
 * One-time post-payment auto-login route.
 * The landing page (brixgate.com) redirects here after payment is verified.
 * The backend creates the student account and passes the JWT as a URL param.
 * This page stores the token cookie and redirects into the dashboard — no
 * password needed for this first session. After that, the student uses
 * /login normally.
 */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { setTokenCookie, apiClient, unwrap, getApiError } from '@/lib/api-client'

function CallbackContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus]   = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handleCallback() {
      const token = searchParams.get('token')

      if (!token) {
        router.replace('/login')
        return
      }

      try {
        // Store the token cookie first so the axios interceptor picks it up
        setTokenCookie(token)

        // Validate by fetching the user profile
        await apiClient.get('/users/me').then((res) => unwrap(res.data))

        // All good — enter the portal
        router.replace('/student/dashboard')
      } catch (err) {
        // Token was bad — clear it and show a helpful message
        document.cookie = 'brixgate_token=; path=/; max-age=0; SameSite=Strict'
        setErrorMsg(getApiError(err))
        setStatus('error')
      }
    }

    handleCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'error') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: '#0D1724' }}
      >
        <Image
          src="/images/logo3.png"
          alt="Brixgate"
          width={40}
          height={40}
          className="brightness-0 invert"
        />
        <div className="bg-white rounded-[12px] p-8 max-w-[400px] w-full text-center shadow-xl">
          <p className="text-[16px] font-semibold text-[#111827] font-display mb-2">
            Couldn&apos;t sign you in automatically
          </p>
          <p className="text-[13px] text-[#6b7280] font-body mb-1">{errorMsg}</p>
          <p className="text-[13px] text-[#6b7280] font-body mb-6">
            Check your email for your login credentials and sign in manually.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center w-full h-11 bg-[#d51520] text-white text-[14px] font-semibold font-display rounded-[8px] hover:bg-[#b81119] transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

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
