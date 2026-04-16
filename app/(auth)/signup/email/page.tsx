'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EyeIcon, ViewOffIcon, AlertCircleIcon } from 'hugeicons-react'

const TRACKS = [
  'AI in Software Engineering',
  'AI in Cyber Security & Intelligence',
  'AI in Data Analytics',
  'AI in Cloud & DevOps',
  'AI in Product Management',
  'AI in Product Design',
  'General AI',
]

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
}

export default function SignUpEmailPage() {
  const router = useRouter()

  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [track, setTrack]           = useState('AI in Cybersecurity and Intelligence')
  const [password, setPassword]     = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors]         = useState<FormErrors>({})
  const [loading, setLoading]       = useState(false)

  function validate(): boolean {
    const next: FormErrors = {}
    if (!fullName.trim())           next.fullName = 'Full name is required.'
    if (!email.trim())              next.email    = 'Email address is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email address.'
    if (!password)                  next.password = 'Password is required.'
    else if (password.length < 8)   next.password = 'Password must be at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    // Simulate API call — wire to JWT endpoint later
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    router.push(`/verify-email?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-10 py-10">
      {/* Top spacer */}
      <div />

      {/* Form content */}
      <div className="w-full max-w-[360px]">
        {/* Logo mark */}
        <div className="flex justify-center mb-5">
          <Image
            src="/images/logo2.png"
            alt="Brixgate"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-2">
          Sign Up
        </h1>
        <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-7 max-w-[360px] mx-auto">
          Create an account to get your learning started and access the Brixgate program and
          learning resources.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

          {/* Fullname */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Fullname
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder=""
              className={`w-full h-[42px] px-3.5 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                errors.fullName
                  ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                  : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
              }`}
            />
            {errors.fullName && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Email Address <span className="text-[#D51520]">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              className={`w-full h-[42px] px-3.5 border rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white ${
                errors.email
                  ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                  : 'border-[#E5E7EB] focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
              }`}
            />
            {errors.email && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder=""
              className="w-full h-[42px] px-3.5 border border-[#E5E7EB] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9CA3AF] outline-none transition-all bg-white focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10"
            />
          </div>

          {/* Track */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Track
            </label>
            <div className="relative">
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="w-full h-[42px] pl-3.5 pr-10 border border-[#E5E7EB] rounded-[6px] text-[13px] font-body text-[#111827] outline-none transition-all bg-white focus:border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10 appearance-none cursor-pointer"
              >
                {TRACKS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {/* Custom chevron */}
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
              Password
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
                {showPassword
                  ? <ViewOffIcon size={16} strokeWidth={1.5} />
                  : <EyeIcon size={16} strokeWidth={1.5} />
                }
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-[#D51520] font-body">
                <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#D1D5DB] text-[#D51520] accent-[#D51520] cursor-pointer"
              />
              <span className="text-[13px] text-[#374151] font-body">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] text-[#D51520] font-medium font-body hover:underline"
            >
              Forgot password?
            </Link>
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="text-[12px] text-[#9CA3AF] font-body text-center mt-4 leading-[1.6]">
          By clicking Create account, I agree to{' '}
          <Link href="#" className="text-[#D51520] hover:underline">Terms of Use</Link>
          {' '}and{' '}
          <Link href="#" className="text-[#D51520] hover:underline">Privacy Policy</Link>.
        </p>

        {/* Log in link */}
        <p className="text-[13px] text-[#6B7280] font-body text-center mt-3">
          Have an account?{' '}
          <Link href="/login" className="text-[#D51520] font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
    </div>
  )
}
