'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { EyeIcon, ViewOffIcon, AlertCircleIcon } from 'hugeicons-react'

interface FormErrors {
  newPassword?: string
  confirmPassword?: string
  form?: string
}

function UpdatePasswordContent() {
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [errors, setErrors]                   = useState<FormErrors>({})
  const [loading, setLoading]                 = useState(false)
  const [success, setSuccess]                 = useState(false)

  function validate(): boolean {
    const next: FormErrors = {}
    if (!newPassword)                    next.newPassword     = 'New password is required.'
    else if (newPassword.length < 8)     next.newPassword     = 'Password must be at least 8 characters.'
    if (!confirmPassword)                next.confirmPassword = 'Please confirm your new password.'
    else if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      // Backend not wired yet — placeholder
      await new Promise((r) => setTimeout(r, 800))
      setSuccess(true)
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
      {/* Top spacer */}
      <div />

      {/* Form content */}
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

        {success ? (
          /* Success state */
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-2">
              Password updated
            </h1>
            <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[340px] mx-auto">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors"
            >
              Back to Login
            </a>
          </div>
        ) : (
          <>
            {/* Heading */}
            <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-1">
              Update password
            </h1>
            <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[340px] mx-auto">
              Choose a strong password for your Brixgate account.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

              {/* New password */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
                  New Password <span className="text-[#D51520]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={`w-full h-[42px] pl-3.5 pr-10 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                      errors.newPassword
                        ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                        : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    {showNew
                      ? <ViewOffIcon size={16} strokeWidth={1.5} />
                      : <EyeIcon size={16} strokeWidth={1.5} />
                    }
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                    <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
                  Confirm Password <span className="text-[#D51520]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full h-[42px] pl-3.5 pr-10 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                      errors.confirmPassword
                        ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                        : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    {showConfirm
                      ? <ViewOffIcon size={16} strokeWidth={1.5} />
                      : <EyeIcon size={16} strokeWidth={1.5} />
                    }
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                    <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Form-level error */}
              {errors.form && (
                <div className="flex items-center gap-2 bg-[#fef2f2] border border-[#fecdca] rounded-[6px] px-3 py-2.5">
                  <AlertCircleIcon size={14} color="#D51520" strokeWidth={1.5} />
                  <p className="text-[12px] text-[#D51520] font-body">{errors.form}</p>
                </div>
              )}

              {/* Submit */}
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
                    Saving…
                  </>
                ) : (
                  'Save Password'
                )}
              </button>
            </form>

            {/* Back to login */}
            <p className="text-[13px] text-[#6B7280] font-body text-center mt-5">
              <a href="/login" className="text-[#D51520] font-medium hover:underline">
                Back to Login
              </a>
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdatePasswordContent />
    </Suspense>
  )
}
