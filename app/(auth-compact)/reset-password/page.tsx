'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { EyeIcon, ViewOffIcon } from 'hugeicons-react'

function ResetPasswordContent() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  // Token from URL — will be used when backend adds reset-password endpoint
  const token = searchParams.get('token') ?? ''
  void token // referenced when endpoint is available

  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirm]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [errors, setErrors]             = useState<{ password?: string; confirm?: string }>({})
  const [loading, setLoading]           = useState(false)

  // Live password rule checks
  const rules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    special:   /[0-9!@#$%^&*]/.test(password),
  }

  function validate(): boolean {
    const next: { password?: string; confirm?: string } = {}
    if (!password)                          next.password = 'Password is required.'
    else if (!rules.length)                 next.password = 'Password must be at least 8 characters.'
    else if (!rules.uppercase)              next.password = 'Password must contain an uppercase letter.'
    else if (!rules.special)                next.password = 'Password must contain a number or special character.'
    if (!confirmPassword)                   next.confirm  = 'Please confirm your password.'
    else if (password !== confirmPassword)  next.confirm  = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    // TODO: call POST /api/auth/reset-password with { token: _token, password }
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    router.push('/login')
  }

  const RuleItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-[#16A34A]' : 'bg-[#E5E7EB]'}`}>
        {met && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={`text-[12px] font-body ${met ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>{label}</span>
    </div>
  )

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
          Set your new password
        </h1>
        <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[360px] mx-auto">
          Choose a strong password for your Brixgate account. You&apos;ll use
          this each time you log in.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

          {/* New password */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full h-[42px] pl-3.5 pr-10 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                  errors.password
                    ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                    : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                {showPassword ? <ViewOffIcon size={16} strokeWidth={1.5} /> : <EyeIcon size={16} strokeWidth={1.5} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-[#D51520] font-body mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Enter password"
                className={`w-full h-[42px] pl-3.5 pr-10 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                  errors.confirm
                    ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                    : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                {showConfirm ? <ViewOffIcon size={16} strokeWidth={1.5} /> : <EyeIcon size={16} strokeWidth={1.5} />}
              </button>
            </div>
            {errors.confirm && (
              <p className="text-[11px] text-[#D51520] font-body mt-1">{errors.confirm}</p>
            )}
          </div>

          {/* Password rules */}
          <div className="flex flex-col gap-2 py-1">
            <RuleItem met={rules.length}    label="At least 8 characters" />
            <RuleItem met={rules.uppercase} label="One uppercase letter" />
            <RuleItem met={rules.special}   label="One number or special character" />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] disabled:opacity-70 disabled:cursor-not-allowed text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : (
              'Set New Password'
            )}
          </button>
        </form>

        {/* Back to login */}
        <p className="text-[13px] text-center mt-5">
          <Link href="/login" className="text-[#374151] font-body hover:text-[#D51520] transition-colors">
            ← Back to Log In
          </Link>
        </p>
      </div>

      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
