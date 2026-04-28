'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import TopNav from '@/components/layout/TopNav'
import {
  MOCK_ENROLLMENTS,
  MOCK_NOTIFICATION_PREFERENCES,
} from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { apiClient, getApiError } from '@/lib/api-client'
import {
  Camera02Icon,
  EyeIcon,
  ViewOffIcon,
  CheckmarkCircle01Icon,
  Upload01Icon,
  Delete01Icon,
  AlertCircleIcon,
  FileAttachmentIcon,
} from 'hugeicons-react'
import { useAvatar } from '@/lib/use-avatar'

function SectionCard({
  title,
  description,
  children,
  overflowVisible,
}: {
  title: string
  description?: string
  children: React.ReactNode
  overflowVisible?: boolean
}) {
  return (
    <div className={`bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}>
      <div className="px-6 py-5 border-b border-[#f3f4f6] rounded-t-[10px]">
        <p className="text-[16px] font-semibold text-[#111827] font-display">{title}</p>
        {description && (
          <p className="text-[13px] text-[#9ca3af] font-body mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
  prefix,
  error,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  readOnly?: boolean
  prefix?: string
  error?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#374151] font-body">{label}</label>
      <div className="relative flex">
        {prefix && (
          <div className="h-11 px-3 flex items-center border border-r-0 border-[#e5e7eb] rounded-l-[6px] bg-[#f9fafb] text-[13px] text-[#6b7280] font-body flex-shrink-0">
            {prefix}
          </div>
        )}
        <input
          type={inputType}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`h-11 flex-1 px-3.5 border text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all ${
            prefix ? 'rounded-r-[6px]' : 'rounded-[6px]'
          } ${
            error
              ? 'border-[#d51520] bg-white focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
              : readOnly
              ? 'border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af] cursor-not-allowed'
              : 'border-[#e5e7eb] bg-white focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
          }`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            {showPassword ? (
              <ViewOffIcon size={16} strokeWidth={1.5} />
            ) : (
              <EyeIcon size={16} strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-[#d51520] font-body">
          <AlertCircleIcon size={11} color="#d51520" strokeWidth={1.5} />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Password strength ──────────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { level: 2, label: 'Fair', color: '#f59e0b' }
  if (score <= 3) return { level: 3, label: 'Good', color: '#3b82f6' }
  return { level: 4, label: 'Strong', color: '#16a34a' }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-[10px] shadow-lg text-[13px] font-medium font-body ${
        type === 'success'
          ? 'bg-[#ecfdf3] text-[#16a34a] border border-[#bbf7d0]'
          : 'bg-[#fef2f2] text-[#d51520] border border-[#fecdca]'
      }`}
    >
      {type === 'success' ? (
        <CheckmarkCircle01Icon size={16} color="#16a34a" strokeWidth={2} />
      ) : (
        <AlertCircleIcon size={16} color="#d51520" strokeWidth={2} />
      )}
      {message}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-[13px] font-medium text-[#374151] font-body">{label}</p>
        {description && (
          <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
          checked ? 'bg-[#d51520]' : 'bg-[#e5e7eb]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const enrollment = MOCK_ENROLLMENTS[0]
  const { avatar, setAvatar } = useAvatar()
  const { user, updateUser } = useAuth()

  // Personal info — initialised from auth context; updates once user loads
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName]   = useState(user?.lastName ?? '')
  const [email]                   = useState(user?.email ?? '')
  const [phone, setPhone]         = useState('')

  // Sync from context when it first loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Saving state
  const [savingProfile, setSavingProfile] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const strength = getPasswordStrength(newPassword)

  // Notifications
  const [prefs, setPrefs] = useState(MOCK_NOTIFICATION_PREFERENCES)

  // Resume
  const [resume, setResume] = useState<{ name: string; size: string } | null>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Avatar dropdown
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    if (showAvatarMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showAvatarMenu])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Avatar upload ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAvatar(result)
      setShowAvatarMenu(false)
      showToast('Profile photo updated.', 'success')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Resume upload ──
  function handleResumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a PDF or Word document.', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be under 10MB.', 'error')
      return
    }
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    setResume({ name: file.name, size: `${sizeMB} MB` })
    e.target.value = ''
    showToast('Resume uploaded successfully.', 'success')
  }

  function handleRemoveAvatar() {
    setAvatar(null)
    setShowAvatarMenu(false)
    showToast('Profile photo removed.', 'success')
  }

  // ── Personal info save ──
  async function handleSavePersonal() {
    if (!firstName.trim() || !lastName.trim()) {
      showToast('First and last name are required.', 'error')
      return
    }
    setSavingProfile(true)
    try {
      await apiClient.put('/users/me', {
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      })
      updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), name: `${firstName.trim()} ${lastName.trim()}` })
      showToast('Personal information saved.', 'success')
    } catch (err) {
      showToast(getApiError(err), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Password update ──
  async function handleUpdatePassword() {
    const errors: Record<string, string> = {}
    if (!currentPassword) errors.current = 'Enter your current password.'
    if (!newPassword) errors.new = 'Enter a new password.'
    else if (newPassword.length < 8) errors.new = 'Password must be at least 8 characters.'
    if (!confirmPassword) errors.confirm = 'Please confirm your new password.'
    else if (newPassword !== confirmPassword) errors.confirm = 'Passwords do not match.'

    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await apiClient.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors({})
      showToast('Password updated successfully.', 'success')
    } catch (err) {
      showToast(getApiError(err), 'error')
    }
  }

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()

  return (
    <>
      <TopNav title="Profile Settings" />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleResumeChange}
      />

      <div className="px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
            Profile Settings
          </h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-1">
            Manage your personal information, password, and notification preferences.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-6">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-6">

            {/* Profile Photo */}
            <SectionCard title="Profile Photo" overflowVisible>
              <div className="flex items-center gap-5 min-h-[80px]">
                {/* Avatar + dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowAvatarMenu((v) => !v)}
                    className="relative block focus:outline-none group"
                    aria-label="Change profile photo"
                  >
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt="Profile"
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover border-2 border-[#e5e7eb] group-hover:border-[#d51520] transition-colors"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#d51520] flex items-center justify-center text-white text-[22px] font-bold font-display group-hover:bg-[#b81119] transition-colors">
                        {initials}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#e5e7eb] shadow-sm flex items-center justify-center pointer-events-none">
                      <Camera02Icon size={12} color="#374151" strokeWidth={1.5} />
                    </div>
                  </button>

                  {/* Dropdown */}
                  {showAvatarMenu && (
                    <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white rounded-[10px] shadow-[0px_8px_24px_rgba(16,24,40,0.12)] border border-[#f3f4f6] py-1.5 w-[200px]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAvatarMenu(false)
                          setTimeout(() => fileInputRef.current?.click(), 50)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors text-left"
                      >
                        <Upload01Icon size={15} color="#374151" strokeWidth={1.5} />
                        {avatar ? 'Change photo' : 'Upload photo'}
                      </button>
                      {avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#d51520] font-body hover:bg-[#fef2f2] transition-colors text-left"
                        >
                          <Delete01Icon size={15} color="#d51520" strokeWidth={1.5} />
                          Remove photo
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Name + helper */}
                <div>
                  <p className="text-[14px] font-semibold text-[#111827] font-display">
                    {firstName} {lastName}
                  </p>
                  <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">Student</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[12px] text-[#d51520] font-medium font-display mt-2 hover:underline"
                  >
                    Change photo
                  </button>
                  <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                    JPG, PNG or GIF · Max 5MB
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Personal Information */}
            <SectionCard
              title="Personal Information"
              description="Update your name and contact details."
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormField
                  label="First Name"
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="First name"
                />
                <FormField
                  label="Last Name"
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Last name"
                />
              </div>
              <div className="flex flex-col gap-4">
                <FormField
                  label="Email Address"
                  value={email}
                  type="email"
                  readOnly
                  placeholder="email@example.com"
                />
                <FormField
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  prefix="+234"
                  placeholder="801 234 5678"
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleSavePersonal}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </SectionCard>

            {/* Change Password */}
            <SectionCard
              title="Change Password"
              description="Choose a strong password with at least 8 characters."
            >
              <div className="flex flex-col gap-4">
                <FormField
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  type="password"
                  placeholder="Enter current password"
                  error={passwordErrors.current}
                />
                <div>
                  <FormField
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    type="password"
                    placeholder="Enter new password"
                    error={passwordErrors.new}
                  />
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= strength.level ? strength.color : '#f3f4f6' }}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] font-body" style={{ color: strength.color }}>
                        {strength.label} password
                      </p>
                    </div>
                  )}
                </div>
                <FormField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type="password"
                  placeholder="Confirm new password"
                  error={passwordErrors.confirm}
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleUpdatePassword}
                  className="inline-flex items-center gap-2 border border-[#e5e7eb] text-[#374151] text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#f9fafb] transition-colors"
                >
                  Update Password
                </button>
              </div>
            </SectionCard>
            {/* Resume / CV Upload */}
            <SectionCard
              title="Resume & CV"
              description="Upload your resume for CV and portfolio optimisation support."
            >
              {resume ? (
                <div className="flex items-center justify-between gap-4 p-4 border border-[#e5e7eb] rounded-[8px] bg-[#f9fafb]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[8px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                      <FileAttachmentIcon size={18} color="#d51520" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#111827] font-body truncate max-w-[240px]">{resume.name}</p>
                      <p className="text-[11px] text-[#9ca3af] font-body">{resume.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                      className="text-[12px] font-medium text-[#374151] font-display hover:text-[#d51520] transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResume(null); showToast('Resume removed.', 'success') }}
                      className="text-[12px] font-medium text-[#d51520] font-display hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resumeInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-[#e5e7eb] rounded-[10px] hover:border-[#d51520]/40 hover:bg-[#fef2f2]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] group-hover:bg-[#fef2f2] flex items-center justify-center transition-colors">
                    <Upload01Icon size={20} color="#9ca3af" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-[#374151] font-display">
                      Click to upload your resume
                    </p>
                    <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                      PDF or Word document · Max 10MB
                    </p>
                  </div>
                </button>
              )}
            </SectionCard>

          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-6">

            {/* Account Details */}
            <SectionCard title="Account Details">
              <div className="flex flex-col gap-5">
                {/* Static fields */}
                {[
                  { label: 'Role',      value: 'Student' },
                  { label: 'Programme', value: enrollment?.cohort?.program?.title ?? '—' },
                  { label: 'Cohort',    value: enrollment?.cohort?.name?.split('—')[1]?.trim() ?? '—' },
                  {
                    label: 'Enrolled',
                    value: enrollment
                      ? new Date(enrollment.enrolledAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—',
                  },
                  {
                    label: 'Course End Date',
                    value: enrollment?.cohort?.endDate
                      ? new Date(enrollment.cohort.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
                    <p className="text-[13px] font-medium text-[#374151] font-body">{value}</p>
                  </div>
                ))}

                {/* Course Status — derived from cohort dates */}
                {(() => {
                  const endDate   = enrollment?.cohort?.endDate   ? new Date(enrollment.cohort.endDate)   : null
                  const startDate = enrollment?.cohort?.startDate ? new Date(enrollment.cohort.startDate) : null
                  const now = new Date()

                  let label = '—'
                  let color = '#9ca3af'
                  let bg    = '#f9fafb'
                  let border = '#e5e7eb'

                  if (endDate && now > endDate) {
                    label = 'Ended'; color = '#6b7280'; bg = '#f3f4f6'; border = '#e5e7eb'
                  } else if (startDate && endDate && now >= startDate && now <= endDate) {
                    label = 'In Progress'; color = '#d97706'; bg = '#fffbeb'; border = '#fde68a'
                  } else if (startDate && now < startDate) {
                    label = 'Upcoming'; color = '#2563eb'; bg = '#eff6ff'; border = '#bfdbfe'
                  }

                  return (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Course Status</p>
                      <span
                        className="inline-flex w-fit text-[11px] font-semibold px-2.5 py-0.5 rounded-full border font-display"
                        style={{ color, background: bg, borderColor: border }}
                      >
                        {label}
                      </span>
                    </div>
                  )
                })()}
              </div>
            </SectionCard>

            {/* Notifications */}
            <SectionCard title="Notifications">
              <div className="divide-y divide-[#f3f4f6]">
                <Toggle
                  checked={prefs.emailNewResource}
                  onChange={(v) => setPrefs((p) => ({ ...p, emailNewResource: v }))}
                  label="New Resources"
                  description="Email when new files are uploaded"
                />
                <Toggle
                  checked={prefs.emailSessionReminder}
                  onChange={(v) => setPrefs((p) => ({ ...p, emailSessionReminder: v }))}
                  label="Session Reminders"
                  description="Email before each live session"
                />
                <Toggle
                  checked={prefs.emailCertificate}
                  onChange={(v) => setPrefs((p) => ({ ...p, emailCertificate: v }))}
                  label="Certificate Ready"
                  description="Email when your certificate is issued"
                />
                <Toggle
                  checked={prefs.emailAnnouncements}
                  onChange={(v) => setPrefs((p) => ({ ...p, emailAnnouncements: v }))}
                  label="Announcements"
                  description="Email for cohort announcements"
                />
                <Toggle
                  checked={prefs.inAppAll}
                  onChange={(v) => setPrefs((p) => ({ ...p, inAppAll: v }))}
                  label="In-App Notifications"
                  description="Receive all portal notifications"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => showToast('Notification preferences saved.', 'success')}
                  className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
