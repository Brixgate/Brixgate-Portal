'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AlertCircleIcon } from 'hugeicons-react'
import { apiClient, getApiError } from '@/lib/api-client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    if (!email.trim())               { setError('Email address is required.'); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return false }
    setError('')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await apiClient.post('/auth/forgot-password', { email })
      router.push(`/forgot-password/check-email?email=${encodeURIComponent(email)}`)
    } catch (err) {
      // If the API returns 404 / no account, still show check-email
      // so we don't leak whether an email exists (security best practice)
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404 || status === 422) {
        router.push(`/forgot-password/check-email?email=${encodeURIComponent(email)}`)
      } else {
        setError(getApiError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
      <div />

      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo2.png"
            alt="Brixgate"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-1">
          Forgot password?
        </h1>
        <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[340px] mx-auto">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Email Address <span className="text-[#D51520]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder=""
              className={`w-full h-[42px] px-3.5 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                error
                  ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                  : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
              }`}
            />
            {error && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] disabled:opacity-70 disabled:cursor-not-allowed text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending link…
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to login */}
        <p className="text-[13px] text-center mt-5">
          <Link
            href="/login"
            className="text-[#374151] font-body hover:text-[#D51520] transition-colors"
          >
            ← Back to Log In
          </Link>
        </p>
      </div>

      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
    </div>
  )
}
