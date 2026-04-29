'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { EyeIcon, ViewOffIcon, AlertCircleIcon } from 'hugeicons-react'
import { useAuth } from '@/lib/auth-context'
import { apiClient, extractToken, getApiError } from '@/lib/api-client'

interface FormErrors {
  email?: string
  password?: string
  form?: string
}

function LoginPageContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { login, user, isLoading } = useAuth()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [rememberMe, setRememberMe]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors]             = useState<FormErrors>({})
  const [loading, setLoading]           = useState(false)

  // Already authenticated — go straight to the portal
  useEffect(() => {
    if (!isLoading && user) {
      const redirect = searchParams.get('redirect') ?? '/student/dashboard'
      router.replace(redirect)
    }
  }, [isLoading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  function validate(): boolean {
    const next: FormErrors = {}
    if (!email.trim())                    next.email    = 'Email address is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) next.email    = 'Enter a valid email address.'
    if (!password)                        next.password = 'Password is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      const res = await apiClient.post('/auth/login', { email, password })
      const token = extractToken(res.data)
      if (!token) throw new Error('No token returned from server.')

      await login(token)

      const redirect = searchParams.get('redirect') ?? '/student/dashboard'
      router.push(redirect)
    } catch (err) {
      setErrors({ form: getApiError(err) })
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

        {/* Heading */}
        <h1 className="text-[28px] font-semibold text-[#111827] font-display text-center mb-1">
          Welcome back
        </h1>
        <p className="text-[14px] text-[#6B7280] font-body text-center leading-[1.6] mb-8 max-w-[340px] mx-auto">
          Log in to access your Brixgate program and learning resources.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>

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
          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#D1D5DB] accent-[#D51520] cursor-pointer"
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
                Logging in…
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

      </div>

      {/* Footer */}
      <p className="text-[12px] text-[#D1D5DB] font-body mt-6">Brixgate 2024</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
