'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  EyeIcon,
  ViewOffIcon,
  AlertCircleIcon,
  UserCircleIcon,
  Loading01Icon,
  CheckmarkCircle01Icon,
  Building01Icon,
  SmartPhone01Icon,
} from 'hugeicons-react'
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
interface AcceptInvitePayload {
  name: string
  password: string
  passwordConfirmation: string
}

// ── Password input ─────────────────────────────────────────────────────────────
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
      <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
        {label} <span className="text-[#D51520]">*</span>
      </label>
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
          {show
            ? <ViewOffIcon size={16} strokeWidth={1.5} />
            : <EyeIcon size={16} strokeWidth={1.5} />}
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
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          met ? 'bg-[#16A34A]' : 'bg-[#E5E7EB]'
        }`}
      >
        {met && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3 5.5L6.5 2"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className={`text-[12px] font-body ${met ? 'text-[#16A34A]' : 'text-[#6B7280]'}`}>
        {label}
      </span>
    </div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────
function InviteAcceptContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  // ── Token validation ──────────────────────────────────────────────────────
  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [inviteData, setInviteData] = useState<ValidateInviteResponse | null>(null)

  // ── Step: 'card' (invite summary) | 'form' (fill details) ────────────────
  const [step, setStep] = useState<'card' | 'form'>('card')

  // ── Form fields ───────────────────────────────────────────────────────────
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)

  // Password rules
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
        const res  = await apiClient.get(`/teams/invites/${token}`)
        const data = unwrap<ValidateInviteResponse>(res.data)
        if (!data?.invite) throw new Error('Invalid response')
        setInviteData(data)
      } catch (err) {
        setTokenError(getApiError(err) || 'This invite link is invalid or has expired.')
      } finally {
        setValidating(false)
      }
    })()
  }, [token])

  // 2 — Validate form
  function validate(): boolean {
    const next: Record<string, string> = {}

    if (!name.trim())
      next.name = 'Full name is required.'
    else if (name.trim().split(/\s+/).length < 2)
      next.name = 'Please enter your first and last name.'

    // Phone is optional — validate only if provided
    if (phone.trim() && !/^\d{10}$/.test(phone.trim()))
      next.phone = 'Enter a valid 10-digit Nigerian number (e.g. 8012345678).'

    if (!password)
      next.password = 'Password is required.'
    else if (!rules.length)
      next.password = 'Password must be at least 8 characters.'
    else if (!rules.uppercase)
      next.password = 'Password must contain an uppercase letter.'
    else if (!rules.special)
      next.password = 'Password must contain a number or special character.'

    if (!confirmPw)
      next.confirm = 'Please confirm your password.'
    else if (password !== confirmPw)
      next.confirm = 'Passwords do not match.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  // 3 — Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setErrors({})
    try {
      // Step A — accept invite (name + password)
      const payload: AcceptInvitePayload = {
        name: name.trim(),
        password,
        passwordConfirmation: confirmPw,
      }
      await apiClient.post(`/teams/invites/${token}/accept`, payload)

      // Step B — update phone if provided
      if (phone.trim()) {
        try {
          await apiClient.put('/users/me', {
            fullPhoneNumber: `+234${phone.trim()}`,
          })
        } catch {
          // Non-fatal — account already created; phone can be set later in settings
        }
      }

      setSuccess(true)
      setTimeout(() => router.push('/login?invited=success'), 2500)
    } catch (err) {
      setErrors({ form: getApiError(err) })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──
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
            <Image
              src="/images/logo2.png"
              alt="Brixgate"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div className="w-14 h-14 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
            <AlertCircleIcon size={24} color="#D51520" strokeWidth={1.5} />
          </div>
          <h1 className="text-[24px] font-semibold text-[#111827] font-display mb-2">
            Invite link invalid
          </h1>
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
        <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2025</p>
      </div>
    )
  }

  // ── Success ──
  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10 py-10">
        <div className="w-16 h-16 rounded-full bg-[#f0fdf4] flex items-center justify-center">
          <CheckmarkCircle01Icon size={32} color="#16A34A" strokeWidth={1.5} />
        </div>
        <h1 className="text-[22px] font-semibold text-[#111827] font-display text-center">
          Account created!
        </h1>
        <p className="text-[13px] text-[#6b7280] font-body text-center">
          Welcome to the team. Redirecting you to log in…
        </p>
      </div>
    )
  }

  // ── Step 1: Invite card ──
  if (step === 'card') {
    return (
      <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
        <div />

        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/images/logo2.png"
              alt="Brixgate"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>

          {/* Invite card */}
          <div className="bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0px_4px_16px_rgba(16,24,40,0.06)] overflow-hidden">
            {/* Red top stripe */}
            <div className="h-1.5 bg-[#D51520]" />

            <div className="p-6">
              {/* Org badge */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-[6px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                  <Building01Icon size={15} color="#D51520" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-semibold text-[#D51520] font-display">
                  {inviteData?.organization.name ?? 'Your Organisation'}
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-[22px] font-bold text-[#111827] font-display leading-snug mb-1">
                You&apos;ve been invited to join{' '}
                <span className="text-[#D51520]">
                  {inviteData?.organization.name ?? 'a team'}
                </span>
              </h1>
              <p className="text-[13px] text-[#6b7280] font-body leading-[1.6] mb-5">
                Accept this invitation to access your programme and connect with your team on Brixgate.
              </p>

              {/* Programme detail rows */}
              <div className="bg-[#f9fafb] rounded-[8px] divide-y divide-[#f3f4f6] mb-6 overflow-hidden">
                <div className="px-4 py-3 flex items-start justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] font-body whitespace-nowrap">
                    Programme
                  </span>
                  <span className="text-[13px] font-medium text-[#111827] font-body text-right leading-snug">
                    {inviteData?.program.title ?? '—'}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-start justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] font-body whitespace-nowrap">
                    Cohort
                  </span>
                  <span className="text-[13px] font-medium text-[#111827] font-body text-right leading-snug">
                    {inviteData?.cohort.title ?? '—'}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-start justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] font-body whitespace-nowrap">
                    Invited as
                  </span>
                  <span className="text-[13px] font-medium text-[#111827] font-body text-right leading-snug truncate max-w-[200px]">
                    {inviteData?.invite.inviteeEmail ?? '—'}
                  </span>
                </div>
              </div>

              {/* Accept button */}
              <button
                onClick={() => setStep('form')}
                className="w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors"
              >
                Accept Invitation
              </button>
            </div>
          </div>

          <p className="text-[13px] text-center mt-5">
            <Link
              href="/login"
              className="text-[#374151] font-body hover:text-[#D51520] transition-colors"
            >
              ← Back to Log In
            </Link>
          </p>
        </div>

        <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2025</p>
      </div>
    )
  }

  // ── Step 2: Registration form ──
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
        <h1 className="text-[26px] font-semibold text-[#111827] font-display text-center mb-1">
          Create your account
        </h1>
        <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-6">
          You already have a seat reserved at{' '}
          <span className="font-medium text-[#374151]">
            {inviteData?.organization.name ?? 'your team'}
          </span>
          . Fill in your details to get started.
        </p>

        {/* Programme context pill */}
        <div className="flex items-center gap-2 bg-[#fef2f2] border border-[#fecdca] rounded-[8px] px-3 py-2.5 mb-5">
          <Building01Icon size={13} color="#D51520" strokeWidth={1.5} />
          <p className="text-[12px] text-[#D51520] font-body leading-snug flex-1 truncate">
            <span className="font-semibold">{inviteData?.program.title}</span>
            {inviteData?.cohort.title ? ` · ${inviteData.cohort.title}` : ''}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

          {/* Full Name */}
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
                onChange={(e) => {
                  setName(e.target.value)
                  setErrors((p) => ({ ...p, name: '' }))
                }}
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

          {/* Phone Number */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Phone Number{' '}
              <span className="text-[#9CA3AF] font-normal">(optional)</span>
            </label>
            <div className="flex">
              {/* +234 prefix */}
              <div className="flex items-center justify-center w-[58px] h-[42px] border border-r-0 border-[#E5E7EB] rounded-l-[6px] bg-[#f9fafb] flex-shrink-0">
                <SmartPhone01Icon size={13} color="#9CA3AF" strokeWidth={1.5} className="mr-0.5" />
                <span className="text-[12px] font-medium text-[#6B7280] font-body">+234</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  setErrors((p) => ({ ...p, phone: '' }))
                }}
                placeholder="8012345678"
                className={`flex-1 h-[42px] px-3.5 border rounded-r-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                  errors.phone
                    ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                    : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={inviteData?.invite.inviteeEmail ?? ''}
              readOnly
              className="w-full h-[42px] px-3.5 border border-[#E5E7EB] rounded-[6px] text-[13px] font-body text-[#6B7280] bg-[#f9fafb] outline-none cursor-not-allowed"
            />
            <p className="text-[11px] text-[#9CA3AF] font-body mt-1">
              This is the email tied to your invite and cannot be changed.
            </p>
          </div>

          {/* Password */}
          <PasswordInput
            label="Create a password"
            value={password}
            onChange={(v) => {
              setPassword(v)
              setErrors((p) => ({ ...p, password: '' }))
            }}
            error={errors.password}
          />

          {/* Confirm Password */}
          <PasswordInput
            label="Confirm password"
            value={confirmPw}
            onChange={(v) => {
              setConfirmPw(v)
              setErrors((p) => ({ ...p, confirm: '' }))
            }}
            error={errors.confirm}
            placeholder="Re-enter your password"
          />

          {/* Password rules */}
          <div className="flex flex-col gap-2 py-0.5">
            <RuleItem met={rules.length}    label="At least 8 characters" />
            <RuleItem met={rules.uppercase} label="One uppercase letter" />
            <RuleItem met={rules.special}   label="One number or special character" />
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
            disabled={submitting}
            className="w-full h-[48px] bg-[#D51520] hover:bg-[#B81119] disabled:opacity-70 disabled:cursor-not-allowed text-white text-[15px] font-semibold font-display rounded-[8px] transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="white"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="white"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating account…
              </>
            ) : (
              'Create Account & Join Team'
            )}
          </button>
        </form>

        <p className="text-[13px] text-center mt-5">
          <button
            type="button"
            onClick={() => setStep('card')}
            className="text-[#374151] font-body hover:text-[#D51520] transition-colors"
          >
            ← Back to invite
          </button>
        </p>
      </div>

      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2025</p>
    </div>
  )
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loading01Icon size={20} className="animate-spin text-[#D51520]" strokeWidth={1.5} />
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  )
}
