'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { EyeIcon, ViewOffIcon, AlertCircleIcon, UserCircleIcon, Loading01Icon, CheckmarkCircle01Icon, Building01Icon } from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── API shapes (camelCase per Swagger) ────────────────────────────────────────
interface InviteData {
  id: number
  enrollmentId: number
  inviteeEmail: string
  role: string
  status: string
  expiresAt: string
}

interface ValidateInviteResponse {
  invite: InviteData
  program: {
    id: number
    title: string
    subtitle?: string
    images?: string
  }
  cohort: {
    id: number
    title: string
    learningFormat?: string
    startDate?: string
    endDate?: string
  }
  organization: {
    name: string
  }
  userExists: boolean
  nextAction: 'CREATE_ACCOUNT' | 'LOGIN'
}

// ── Accept payload — camelCase per Swagger ────────────────────────────────────
interface AcceptNewUserPayload {
  name: string
  password: string
  passwordConfirmation: string
}

interface AcceptExistingUserPayload {
  email: string
  password: string
}

// ── Small components ──────────────────────────────────────────────────────────
function PasswordInput({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Enter password'}
          className={`w-full h-[42px] pl-3.5 pr-10 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
            error
              ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
              : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
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

function RuleItem({ met, label }: { met: boolean; label: string }) {
  return (
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
}

// ── Context card (shows programme + org info) ─────────────────────────────────
function InviteContextCard({ data }: { data: ValidateInviteResponse }) {
  return (
    <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Building01Icon size={13} color="#D51520" strokeWidth={1.5} />
        <span className="text-[11px] font-semibold text-[#D51520] font-display uppercase tracking-wide">
          {data.organization.name}
        </span>
      </div>
      <p className="text-[14px] font-semibold text-[#111827] font-display leading-snug">
        {data.program.title}
      </p>
      <p className="text-[12px] text-[#6b7280] font-body mt-0.5">{data.cohort.title}</p>
      <p className="text-[11px] text-[#9ca3af] font-body mt-1">Invited as: {data.invite.inviteeEmail}</p>
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────
function InviteAcceptContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  // Validation state
  const [validating, setValidating]     = useState(true)
  const [tokenError, setTokenError]     = useState('')
  const [inviteData, setInviteData]     = useState<ValidateInviteResponse | null>(null)

  // Form state — new user (CREATE_ACCOUNT)
  const [name, setName]                 = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirm]   = useState('')

  // Form state — existing user (LOGIN)
  const [email, setEmail]               = useState('')
  const [existingPassword, setExistingPassword] = useState('')

  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Password rules (for CREATE_ACCOUNT)
  const rules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    special:   /[0-9!@#$%^&*]/.test(password),
  }

  // 1 — Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No invite token found. Please check your invite link.')
      setValidating(false)
      return
    }
    ;(async () => {
      try {
        const res = await apiClient.get(`/teams/invites/${token}`)
        const data = unwrap<ValidateInviteResponse>(res.data)
        if (!data?.invite) throw new Error('Invalid response')
        setInviteData(data)
        // Pre-fill email for existing user flow
        if (data.nextAction === 'LOGIN') setEmail(data.invite.inviteeEmail)
      } catch (err) {
        setTokenError(getApiError(err) || 'This invite link is invalid or has expired.')
      } finally {
        setValidating(false)
      }
    })()
  }, [token])

  // 2 — Validate form fields
  function validate(): boolean {
    const next: Record<string, string> = {}

    if (inviteData?.nextAction === 'CREATE_ACCOUNT') {
      if (!name.trim())
        next.name = 'Full name is required.'
      else if (name.trim().split(/\s+/).length < 2)
        next.name = 'Please enter your first and last name.'

      if (!password)
        next.password = 'Password is required.'
      else if (!rules.length)
        next.password = 'Password must be at least 8 characters.'
      else if (!rules.uppercase)
        next.password = 'Password must contain an uppercase letter.'
      else if (!rules.special)
        next.password = 'Password must contain a number or special character.'

      if (!confirmPassword)
        next.confirm = 'Please confirm your password.'
      else if (password !== confirmPassword)
        next.confirm = 'Passwords do not match.'
    }

    if (inviteData?.nextAction === 'LOGIN') {
      if (!email.trim()) next.email = 'Email is required.'
      if (!existingPassword) next.password = 'Password is required.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  // 3 — Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !inviteData) return

    setSubmitting(true)
    setErrors({})
    try {
      if (inviteData.nextAction === 'CREATE_ACCOUNT') {
        const payload: AcceptNewUserPayload = {
          name: name.trim(),
          password,
          passwordConfirmation: confirmPassword,  // camelCase per Swagger
        }
        await apiClient.post(`/teams/invites/${token}/accept`, payload)
      } else {
        const payload: AcceptExistingUserPayload = {
          email: email.trim(),
          password: existingPassword,
        }
        await apiClient.post(`/teams/invites/${token}/accept`, payload)
      }
      setSuccess(true)
      setTimeout(() => router.push('/login?invited=success'), 2500)
    } catch (err) {
      setErrors({ form: getApiError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading (validating token) ──
  if (validating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-10 py-10">
        <Loading01Icon size={22} className="animate-spin text-[#D51520]" strokeWidth={1.5} />
        <p className="text-[13px] text-[#6b7280] font-body">Validating your invite…</p>
      </div>
    )
  }

  // ── Token error ──
  if (tokenError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
        <div />
        <div className="w-full max-w-[400px] text-center">
          <div className="flex justify-center mb-6">
            <Image src="/images/logo2.png" alt="Brixgate" width={48} height={48} className="object-contain" />
          </div>
          <div className="w-14 h-14 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
            <AlertCircleIcon size={24} color="#D51520" strokeWidth={1.5} />
          </div>
          <h1 className="text-[24px] font-semibold text-[#111827] font-display mb-2">Invite link invalid</h1>
          <p className="text-[14px] text-[#6b7280] font-body leading-[1.6] mb-6 max-w-[320px] mx-auto">
            {tokenError}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors"
          >
            Back to Log In
          </Link>
        </div>
        <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
      </div>
    )
  }

  // ── Success ──
  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10 py-10">
        <div className="w-14 h-14 rounded-full bg-[#f0fdf4] flex items-center justify-center">
          <CheckmarkCircle01Icon size={28} color="#16A34A" strokeWidth={1.5} />
        </div>
        <h1 className="text-[22px] font-semibold text-[#111827] font-display">
          {inviteData?.nextAction === 'CREATE_ACCOUNT' ? 'Account created!' : 'Welcome back!'}
        </h1>
        <p className="text-[13px] text-[#6b7280] font-body">Redirecting you to log in…</p>
      </div>
    )
  }

  const isNewUser = inviteData?.nextAction === 'CREATE_ACCOUNT'

  // ── Form ──
  return (
    <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
      <div />

      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src="/images/logo2.png" alt="Brixgate" width={48} height={48} className="object-contain" />
        </div>

        {/* Heading */}
        <h1 className="text-[26px] font-semibold text-[#111827] font-display text-center mb-1">
          {isNewUser ? 'Accept your invitation' : 'Join your team'}
        </h1>
        <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-6 max-w-[360px] mx-auto">
          {isNewUser
            ? "You've been invited to a team on Brixgate. Create your account to get started."
            : 'Log in with your existing Brixgate account to accept this invite.'}
        </p>

        {/* Programme context */}
        {inviteData && <InviteContextCard data={inviteData} />}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

          {/* CREATE_ACCOUNT: name + password + confirm */}
          {isNewUser && (
            <>
              {/* Full name */}
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
                  Full Name <span className="text-[#D51520]">*</span>
                </label>
                <div className="relative">
                  <UserCircleIcon
                    size={16}
                    color="#9CA3AF"
                    strokeWidth={1.5}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
                    placeholder="e.g. Adunola Okafor"
                    className={`w-full h-[42px] pl-9 pr-3.5 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                      errors.name
                        ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                        : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                    <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                    {errors.name}
                  </p>
                )}
              </div>

              <PasswordInput
                label="Create a password"
                value={password}
                onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })) }}
                error={errors.password}
              />

              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={(v) => { setConfirm(v); setErrors((p) => ({ ...p, confirm: '' })) }}
                error={errors.confirm}
              />

              {/* Password rules */}
              <div className="flex flex-col gap-2 py-0.5">
                <RuleItem met={rules.length}    label="At least 8 characters" />
                <RuleItem met={rules.uppercase} label="One uppercase letter" />
                <RuleItem met={rules.special}   label="One number or special character" />
              </div>
            </>
          )}

          {/* LOGIN: email (pre-filled, readonly) + password */}
          {!isNewUser && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full h-[42px] px-3.5 border border-[#E5E7EB] rounded-[6px] text-[13px] font-body text-[#6B7280] bg-[#f9fafb] outline-none cursor-not-allowed"
                />
                {errors.email && (
                  <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                    <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                    {errors.email}
                  </p>
                )}
              </div>

              <PasswordInput
                label="Your Brixgate password"
                value={existingPassword}
                onChange={(v) => { setExistingPassword(v); setErrors((p) => ({ ...p, password: '' })) }}
                error={errors.password}
                placeholder="Enter your password"
              />
            </>
          )}

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
            disabled={submitting}
            className="w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] disabled:opacity-70 disabled:cursor-not-allowed text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isNewUser ? 'Creating account…' : 'Joining team…'}
              </>
            ) : (
              isNewUser ? 'Create Account & Join' : 'Log In & Join Team'
            )}
          </button>
        </form>

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

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loading01Icon size={20} className="animate-spin text-[#D51520]" strokeWidth={1.5} /></div>}>
      <InviteAcceptContent />
    </Suspense>
  )
}
