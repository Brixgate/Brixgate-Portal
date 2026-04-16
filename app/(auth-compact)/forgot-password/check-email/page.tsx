'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail01Icon } from 'hugeicons-react'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? 'your inbox'
  const [resending, setResending] = useState(false)
  const [resent, setResent]       = useState(false)

  async function handleResend() {
    setResending(true)
    // TODO: call POST /api/auth/forgot-password with { email }
    await new Promise((r) => setTimeout(r, 1000))
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
      <div />

      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Mail icon */}
        <div
          className="w-16 h-16 rounded-[32px] flex items-center justify-center mb-6"
          style={{ background: '#F7D0D2' }}
        >
          <Mail01Icon size={28} color="#D51520" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h1 className="text-[32px] font-bold text-[#111827] font-display text-center mb-3 leading-[1.2]">
          Check your inbox
        </h1>

        {/* Description */}
        <p className="text-[15px] text-[#6B7280] font-body text-center leading-[1.65] mb-8 max-w-[380px]">
          We&apos;ve sent a password reset link to{' '}
          <span className="font-medium text-[#374151]">{email}</span> — the link
          expires in 30 minutes. Check your spam folder if you don&apos;t see it.
        </p>

        {/* Return to log in — outlined red button */}
        <Link
          href="/login"
          className="w-full h-[44px] border border-[#D51520] rounded-[8px] flex items-center justify-center text-[14px] font-semibold text-[#D51520] font-display hover:bg-[#FEF2F2] transition-colors"
        >
          ← Return to Log In
        </Link>

        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-4 text-[13px] font-body text-center"
        >
          {resent ? (
            <span className="text-[#16A34A]">Link resent — check your inbox!</span>
          ) : (
            <span className="text-[#D51520] hover:underline cursor-pointer">
              {resending ? 'Sending…' : "Didn't receive it? Resend the link"}
            </span>
          )}
        </button>
      </div>

      <p className="text-[12px] text-[#D1D5DB] font-body">Brixgate 2024</p>
    </div>
  )
}

export default function ForgotPasswordCheckEmailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
      <CheckEmailContent />
    </Suspense>
  )
}
