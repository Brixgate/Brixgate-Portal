'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EyeIcon, ViewOffIcon, AlertCircleIcon } from 'hugeicons-react'
import { apiClient, getApiError } from '@/lib/api-client'

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  form?: string
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
  error?: string
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
        {label} <span className="text-[#D51520]">*</span>
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-[42px] pl-3.5 pr-10 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
            error
              ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
              : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          {show ? <ViewOffIcon size={16} strokeWidth={1.5} /> : <EyeIcon size={16} strokeWidth={1.5} />}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
          <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
          {error}
        </p>
      )}
    </div>
  )
}

function UpdatePasswordContent() {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [errors, setErrors]                   = useState<FormErrors>({})
  const [loading, setLoading]                 = useState(false)
  const [success, setSuccess]                 = useState(false)

  // Live password rules
  const rules = {
    length:    newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    special:   /[0-9!@#$%^&*]/.test(newPassword),
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!currentPassword)                          next.currentPassword = 'Current password is required.'
    if (!newPassword)                              next.newPassword     = 'New password is required.'
    else if (!rules.length)                        next.newPassword     = 'Password must be at least 8 characters.'
    else if (!rules.uppercase)                     next.newPassword     = 'Password must contain an uppercase letter.'
    else if (!rules.special)                       next.newPassword     = 'Password must contain a number or special character.'
    if (!confirmPassword)                          next.confirmPassword = 'Please confirm your new password.'
    else if (newPassword !== confirmPassword)      next.confirmPassword = 'Passwords do not match.'
    if (currentPassword && currentPassword === newPassword) next.newPassword = 'New password must be different from your current password.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      await apiClient.post('/auth/change-password', {
        current_password:      currentPassword,
        password:              newPassword,
        password_confirmation: confirmPassword,
      })
      setSuccess(true)
    } catch (err) {
      setErrors({ form: getApiError(err) })
    } finally {
      setLoading(false)
    }
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
          <Image src="/images/logo2.png" alt="Brixgate" width={48} height={48} className="object-contain" />
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF3] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-2">
              Password updated
            </h1>
            <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[340px] mx-auto">
              Your password has been changed successfully. Log in with your new password next time.
            </p>
            <button
              onClick={() => router.push('/student/dashboard')}
              className="inline-flex items-center justify-center w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-1">
              Change password
            </h1>
            <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[340px] mx-auto">
              Enter your current password then choose a new one.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent((p) => !p)}
                placeholder="Enter current password"
                error={errors.currentPassword}
              />

              <PasswordInput
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((p) => !p)}
                placeholder="Enter new password"
                error={errors.newPassword}
              />

              <PasswordInput
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggle={() => setShowConfirm((p) => !p)}
                placeholder="Re-enter new password"
                error={errors.confirmPassword}
              />

              {/* Password rules */}
              {newPassword && (
                <div className="flex flex-col gap-2 py-1">
                  <RuleItem met={rules.length}    label="At least 8 characters" />
                  <RuleItem met={rules.uppercase} label="One uppercase letter" />
                  <RuleItem met={rules.special}   label="One number or special character" />
                </div>
              )}

              {/* Form-level error */}
              {errors.form && (
                <div className="flex items-center gap-2 bg-[#fef2f2] border border-[#fecdca] rounded-[6px] px-3 py-2.5">
                  <AlertCircleIcon size={14} color="#D51520" strokeWidth={1.5} />
                  <p className="text-[12px] text-[#D51520] font-body">{errors.form}</p>
                </div>
              )}

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
                  'Update Password'
                )}
              </button>
            </form>

            <p className="text-[13px] text-center mt-5">
              <a href="/student/dashboard" className="text-[#374151] font-body hover:text-[#D51520] transition-colors">
                ← Back to Dashboard
              </a>
            </p>
          </>
        )}
      </div>

      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
      <UpdatePasswordContent />
    </Suspense>
  )
}
