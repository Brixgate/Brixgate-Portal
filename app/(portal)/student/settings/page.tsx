'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import TopNav from '@/components/layout/TopNav'
// FEATURE_OFF: notifications — import { MOCK_NOTIFICATION_PREFERENCES } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import { apiClient, getApiError, unwrap } from '@/lib/api-client'
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
          <p className="text-[13px] text-[#6b7280] font-body mt-0.5">{description}</p>
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

// ── Password strength (kept for future use) ───────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      className={`fixed top-[80px] right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-[10px] shadow-lg text-[13px] font-medium font-body max-w-[360px] ${
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

// FEATURE_OFF: notifications — Toggle component kept for re-enabling notification preferences
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          <p className="text-[12px] text-[#6b7280] font-body mt-0.5">{description}</p>
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

// ── Account details shape from /users/me/programs ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readMyCohorts(p: any): any[] { return p?.myCohorts ?? p?.my_cohorts ?? [] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortField(c: any, camel: string, snake: string): string {
  return c?.[camel] ?? c?.[snake] ?? ''
}

interface ApiSettingsProgramsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programs: any[]
}

export default function SettingsPage() {
  const { avatar, setAvatar } = useAvatar()
  const { user, updateUser } = useAuth()

  // Personal info — synced from auth context once user loads
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')

  // Account details — fetched from /users/me/programs
  const [programme, setProgramme]             = useState('—')
  const [programmeStatus, setProgrammeStatus] = useState('')
  const [cohortName, setCohortName]           = useState('—')
  const [membershipStatus, setMembershipStatus] = useState('—')
  // Phone country code
  const [countryCode, setCountryCode] = useState('+234')

  // Sync personal info from auth context when user loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setEmail(user.email)
      if (user.phone) setPhone(user.phone)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch programme / cohort details
  useEffect(() => {
    async function loadProgram() {
      try {
        const res = await apiClient.get('/users/me/programs')
        const data = unwrap<ApiSettingsProgramsResponse>(res.data)
        const first = Array.isArray(data?.programs) ? data.programs[0] : null
        if (!first) return

        const cohorts = readMyCohorts(first)
        const cohort  = cohorts[0] ?? null
        const title   = first.title ?? first.name ?? '—'
        setProgramme(title)
        if (first.status) setProgrammeStatus(first.status)

        const rawName = readCohortField(cohort, 'cohortTitle', 'cohort_title')
        setCohortName(
          rawName.includes('—') ? rawName.split('—')[1]?.trim() :
          rawName.includes(' - ') ? rawName.split(' - ').pop()?.trim() ?? rawName :
          rawName || '—'
        )

        const ms = readCohortField(cohort, 'membershipStatus', 'membership_status')
        if (ms) setMembershipStatus(ms)
      } catch {
        // Not enrolled or not authenticated — leave defaults as '—'
      }
    }
    loadProgram()
  }, [])

  // Saving state
  const [savingProfile, setSavingProfile] = useState(false)

  // FEATURE_OFF: notifications — const [prefs, setPrefs] = useState(MOCK_NOTIFICATION_PREFERENCES)

  // Resume
  const [resume, setResume] = useState<{ name: string; size: string } | null>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

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

  // ── Avatar upload — POST /users/me/profile-picture ──
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Validate type — endpoint only accepts jpeg, png, webp
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      showToast('Please select a JPG, PNG, or WebP image.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB.', 'error')
      return
    }

    setShowAvatarMenu(false)
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)   // field name: 'file' (standard convention)

      const res = await apiClient.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Response uses snake_case — handle both for safety
      const data = unwrap<{ user?: { profileImageUrl?: string; profile_image_url?: string } }>(res.data)
      const url = data?.user?.profileImageUrl ?? data?.user?.profile_image_url ?? null

      if (url) {
        setAvatar(url)
        updateUser({ profileImageUrl: url })
      }
      showToast('Profile photo updated.', 'success')
    } catch (err) {
      showToast(getApiError(err), 'error')
    } finally {
      setUploadingAvatar(false)
    }
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
      await apiClient.post('/users/me', {
        name:  `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim() ? `${countryCode}${phone.trim().replace(/^0/, '')}` : undefined,
      })
      updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), name: `${firstName.trim()} ${lastName.trim()}` })
      showToast('Personal information saved.', 'success')
    } catch (err) {
      showToast(getApiError(err), 'error')
    } finally {
      setSavingProfile(false)
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
        accept="image/jpeg,image/png,image/webp"
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

      <div className="px-4 lg:px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
            Profile Settings
          </h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-1">
            Manage your personal information, password, and notification preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-6">

            {/* Profile Photo */}
            <SectionCard title="Profile Photo" overflowVisible>
              <div className="flex items-center gap-5 min-h-[80px]">
                {/* Avatar + dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => !uploadingAvatar && setShowAvatarMenu((v) => !v)}
                    className="relative block focus:outline-none group"
                    aria-label="Change profile photo"
                    disabled={uploadingAvatar}
                  >
                    {/* Avatar image or initials */}
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

                    {/* Uploading overlay */}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                          <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}

                    {!uploadingAvatar && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#e5e7eb] shadow-sm flex items-center justify-center pointer-events-none">
                        <Camera02Icon size={12} color="#374151" strokeWidth={1.5} />
                      </div>
                    )}
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
                        disabled={uploadingAvatar}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload01Icon size={15} color="#374151" strokeWidth={1.5} />
                        {uploadingAvatar ? 'Uploading…' : avatar ? 'Change photo' : 'Upload photo'}
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
                    onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-[12px] text-[#d51520] font-medium font-display mt-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                  </button>
                  <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                    JPG, PNG or WebP · Max 5MB
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Personal Information */}
            <SectionCard
              title="Personal Information"
              description="Update your name and contact details."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                {/* Phone with country code selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[#374151] font-body">Phone Number</label>
                  <div className="flex">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="h-11 pl-2.5 pr-1 border border-r-0 border-[#e5e7eb] rounded-l-[6px] bg-[#f9fafb] text-[13px] text-[#374151] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 flex-shrink-0"
                    >
                      {[
                        { code: '+234', label: '🇳🇬 NG +234' },
                        { code: '+1',   label: '🇺🇸 US +1'   },
                        { code: '+44',  label: '🇬🇧 GB +44'  },
                        { code: '+93',  label: '🇦🇫 AF +93'  },
                        { code: '+213', label: '🇩🇿 DZ +213' },
                        { code: '+244', label: '🇦🇴 AO +244' },
                        { code: '+54',  label: '🇦🇷 AR +54'  },
                        { code: '+61',  label: '🇦🇺 AU +61'  },
                        { code: '+43',  label: '🇦🇹 AT +43'  },
                        { code: '+880', label: '🇧🇩 BD +880' },
                        { code: '+32',  label: '🇧🇪 BE +32'  },
                        { code: '+229', label: '🇧🇯 BJ +229' },
                        { code: '+55',  label: '🇧🇷 BR +55'  },
                        { code: '+1',   label: '🇨🇦 CA +1'   },
                        { code: '+237', label: '🇨🇲 CM +237' },
                        { code: '+86',  label: '🇨🇳 CN +86'  },
                        { code: '+242', label: '🇨🇬 CG +242' },
                        { code: '+243', label: '🇨🇩 CD +243' },
                        { code: '+225', label: '🇨🇮 CI +225' },
                        { code: '+45',  label: '🇩🇰 DK +45'  },
                        { code: '+20',  label: '🇪🇬 EG +20'  },
                        { code: '+251', label: '🇪🇹 ET +251' },
                        { code: '+33',  label: '🇫🇷 FR +33'  },
                        { code: '+241', label: '🇬🇦 GA +241' },
                        { code: '+49',  label: '🇩🇪 DE +49'  },
                        { code: '+233', label: '🇬🇭 GH +233' },
                        { code: '+30',  label: '🇬🇷 GR +30'  },
                        { code: '+91',  label: '🇮🇳 IN +91'  },
                        { code: '+62',  label: '🇮🇩 ID +62'  },
                        { code: '+353', label: '🇮🇪 IE +353' },
                        { code: '+972', label: '🇮🇱 IL +972' },
                        { code: '+39',  label: '🇮🇹 IT +39'  },
                        { code: '+81',  label: '🇯🇵 JP +81'  },
                        { code: '+254', label: '🇰🇪 KE +254' },
                        { code: '+231', label: '🇱🇷 LR +231' },
                        { code: '+218', label: '🇱🇾 LY +218' },
                        { code: '+60',  label: '🇲🇾 MY +60'  },
                        { code: '+223', label: '🇲🇱 ML +223' },
                        { code: '+222', label: '🇲🇷 MR +222' },
                        { code: '+212', label: '🇲🇦 MA +212' },
                        { code: '+258', label: '🇲🇿 MZ +258' },
                        { code: '+264', label: '🇳🇦 NA +264' },
                        { code: '+227', label: '🇳🇪 NE +227' },
                        { code: '+31',  label: '🇳🇱 NL +31'  },
                        { code: '+64',  label: '🇳🇿 NZ +64'  },
                        { code: '+47',  label: '🇳🇴 NO +47'  },
                        { code: '+92',  label: '🇵🇰 PK +92'  },
                        { code: '+507', label: '🇵🇦 PA +507' },
                        { code: '+63',  label: '🇵🇭 PH +63'  },
                        { code: '+48',  label: '🇵🇱 PL +48'  },
                        { code: '+351', label: '🇵🇹 PT +351' },
                        { code: '+7',   label: '🇷🇺 RU +7'   },
                        { code: '+250', label: '🇷🇼 RW +250' },
                        { code: '+221', label: '🇸🇳 SN +221' },
                        { code: '+232', label: '🇸🇱 SL +232' },
                        { code: '+252', label: '🇸🇴 SO +252' },
                        { code: '+27',  label: '🇿🇦 ZA +27'  },
                        { code: '+34',  label: '🇪🇸 ES +34'  },
                        { code: '+249', label: '🇸🇩 SD +249' },
                        { code: '+46',  label: '🇸🇪 SE +46'  },
                        { code: '+41',  label: '🇨🇭 CH +41'  },
                        { code: '+255', label: '🇹🇿 TZ +255' },
                        { code: '+228', label: '🇹🇬 TG +228' },
                        { code: '+216', label: '🇹🇳 TN +216' },
                        { code: '+90',  label: '🇹🇷 TR +90'  },
                        { code: '+256', label: '🇺🇬 UG +256' },
                        { code: '+380', label: '🇺🇦 UA +380' },
                        { code: '+971', label: '🇦🇪 AE +971' },
                        { code: '+260', label: '🇿🇲 ZM +260' },
                        { code: '+263', label: '🇿🇼 ZW +263' },
                      ].map(c => (
                        <option key={c.code + c.label} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="801 234 5678"
                      className="h-11 flex-1 px-3.5 border border-[#e5e7eb] rounded-r-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white"
                    />
                  </div>
                </div>
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
                {[
                  { label: 'Role',      value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Student' },
                  { label: 'Programme', value: programme },
                  { label: 'Cohort',    value: cohortName },
                  ...(programmeStatus ? [{ label: 'Programme Status', value: programmeStatus.charAt(0) + programmeStatus.slice(1).toLowerCase() }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
                    <p className="text-[13px] font-medium text-[#374151] font-body">{value}</p>
                  </div>
                ))}

                {/* Cohort Status — from API membershipStatus */}
                {(() => {
                  const status = membershipStatus.toUpperCase()
                  let label  = membershipStatus || '—'
                  let color  = '#9ca3af'
                  let bg     = '#f9fafb'
                  let border = '#e5e7eb'

                  if (status === 'ACTIVE') {
                    label = 'Active'; color = '#16a34a'; bg = '#ecfdf3'; border = '#bbf7d0'
                  } else if (status === 'INACTIVE') {
                    label = 'Inactive'; color = '#6b7280'; bg = '#f3f4f6'; border = '#e5e7eb'
                  } else if (status === 'REMOVED') {
                    label = 'Removed'; color = '#d51520'; bg = '#fef2f2'; border = '#fecdca'
                  }

                  return (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Cohort Status</p>
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
            {/* Security */}
            <SectionCard title="Security" description="Manage your login credentials">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[13px] font-medium text-[#374151] font-body">Password</p>
                  <p className="text-[12px] text-[#6b7280] font-body mt-0.5">Change your account password at any time</p>
                </div>
                <Link
                  href="/update-password"
                  className="h-9 px-4 inline-flex items-center justify-center border border-[#e5e7eb] text-[#374151] text-[13px] font-medium font-body rounded-[7px] hover:bg-[#f9fafb] transition-colors flex-shrink-0"
                >
                  Change Password
                </Link>
              </div>
            </SectionCard>

            {/* FEATURE_OFF: notifications — notification preferences panel hidden; re-enable by uncommenting below */}
            {/* <SectionCard title="Notifications">
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
            </SectionCard> */}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}
