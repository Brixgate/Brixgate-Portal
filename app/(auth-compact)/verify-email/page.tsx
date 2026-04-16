'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail01Icon } from 'hugeicons-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? 'your inbox'
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleResend() {
    setResending(true)
    await new Promise((r) => setTimeout(r, 1000))
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
      {/* Top spacer */}
      <div />

      {/* Content */}
      <div className="w-full max-w-[360px] flex flex-col items-center">
        {/* Envelope icon in pink circle */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
          style={{ background: '#FEF2F2' }}
        >
          <Mail01Icon size={26} color="#D51520" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-bold text-[#111827] font-display text-center mb-3">
          Check your inbox
        </h1>

        {/* Description */}
        <p className="text-[13px] text-[#6B7280] font-body text-center leading-[1.7] mb-7 max-w-[300px]">
          We&apos;ve sent a verification link to{' '}
          <span className="font-medium text-[#374151]">{email}</span> — the link expires in
          30 minutes. Check your spam folder if you don&apos;t see it.
        </p>

        {/* Return to log in */}
        <Link
          href="/login"
          className="w-full h-[48px] border border-[#E5E7EB] rounded-[8px] flex items-center justify-center gap-2 text-[14px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.667 7H2.333M2.333 7l4.334-4.333M2.333 7l4.334 4.333" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Return to Log In
        </Link>

        {/* Resend link */}
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

      {/* Footer */}
      <p className="text-[12px] text-[#D1D5DB] font-body">Brixgate 2024</p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
