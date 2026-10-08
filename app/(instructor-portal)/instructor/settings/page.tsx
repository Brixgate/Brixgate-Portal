'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiClient, getApiError, unwrap } from '@/lib/api-client'
import { EyeIcon, ViewOffIcon, CheckmarkCircle01Icon, AlertCircleIcon, Camera02Icon, Upload01Icon, Delete01Icon } from 'hugeicons-react'

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#f3f4f6]">
        <p className="text-[16px] font-semibold text-[#111827] font-display">{title}</p>
        {description && <p className="text-[13px] text-[#4b5563] font-body mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function FormField({
  label, value, onChange, type = 'text', placeholder, readOnly, prefix,
}: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; readOnly?: boolean; prefix?: string
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">{label}</label>
      <div className={`flex items-center h-[44px] rounded-[6px] border ${readOnly ? 'bg-[#f9fafb] border-[#eaecf0]' : 'bg-white border-[#d1d5db] focus-within:ring-2 focus-within:ring-[#d51520]/20 focus-within:border-[#d51520]'} transition-all`}>
        {prefix && (
          <span className="px-3 text-[13px] text-[#6b7280] border-r border-[#e5e7eb] bg-[#f9fafb] h-full flex items-center rounded-l-[6px] font-body">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={e => onChange?.(e.target.value)}
          className="flex-1 px-3 h-full text-[14px] text-[#111827] bg-transparent outline-none font-body placeholder:text-[#9ca3af]"
        />
      </div>
    </div>
  )
}

function FormTextarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-[6px] border border-[#d1d5db] bg-white text-[14px] text-[#111827] font-body placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] resize-none transition-all"
      />
    </div>
  )
}

export default function InstructorSettingsPage() {
  const { user, updateUser } = useAuth()

  // Profile photo
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarMenu,  setShowAvatarMenu]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [firstName, setFirstName]   = useState('')
  const [lastName,  setLastName]    = useState('')
  const [phone,     setPhone]       = useState('')
  const [saving,    setSaving]      = useState(false)
  const [saveMsg,   setSaveMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  // Professional profile
  const [organization,    setOrganization]    = useState('')
  const [occupation,      setOccupation]      = useState('')
  const [currentRole,     setCurrentRole]     = useState('')
  const [primaryField,    setPrimaryField]    = useState('')
  const [location,        setLocation]        = useState('')
  const [expertise,       setExpertise]       = useState('')
  const [biography,       setBiography]       = useState('')
  const [linkedinUrl,     setLinkedinUrl]     = useState('')
  const [twitterUrl,      setTwitterUrl]      = useState('')
  const [savingProf,      setSavingProf]      = useState(false)
  const [profMsg,         setProfMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const [curPw,  setCurPw]    = useState('')
  const [newPw,  setNewPw]    = useState('')
  const [confPw, setConfPw]   = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  // Seed avatar from auth context on mount
  useEffect(() => {
    if (user?.profileImageUrl) setAvatarUrl(user.profileImageUrl)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    if (showAvatarMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAvatarMenu])

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarMsg({ ok: false, text: 'Please select a JPG, PNG, or WebP image.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ ok: false, text: 'Image must be under 5MB.' })
      return
    }
    setShowAvatarMenu(false)
    setUploadingAvatar(true)
    setAvatarMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = unwrap<any>(res.data)
      const url: string | null =
        data?.user?.profileImageUrl ??
        data?.user?.profile_image_url ??
        data?.user?.profile_photo_url ??
        data?.profileImageUrl ??
        data?.profile_image_url ??
        data?.profile_photo_url ??
        data?.url ??
        null
      if (url) {
        setAvatarUrl(url)
        updateUser({ profileImageUrl: url })
      }
      setAvatarMsg({ ok: true, text: 'Profile photo updated.' })
    } catch (err) {
      setAvatarMsg({ ok: false, text: getApiError(err) })
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      const raw = user.phone ?? ''
      setPhone(raw.startsWith('+234') ? raw.slice(4) : raw)
      setOrganization(user.organization ?? '')
      setOccupation(user.occupation ?? '')
      setCurrentRole(user.currentRole ?? '')
      setPrimaryField(user.primaryField ?? '')
      setLocation(user.location ?? '')
      setExpertise(user.expertise ?? '')
      setBiography(user.biography ?? '')
      setLinkedinUrl(user.linkedinUrl ?? '')
      setTwitterUrl(user.twitterUrl ?? '')
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      await apiClient.patch('/users/me', {
        first_name: firstName, firstName,
        last_name: lastName, lastName,
        phone_number: phone ? `+234${phone}` : undefined,
      })
      updateUser({ firstName, lastName, phone: phone ? `+234${phone}` : undefined })
      setSaveMsg({ ok: true, text: 'Profile updated successfully.' })
    } catch (err) {
      setSaveMsg({ ok: false, text: getApiError(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveProfessional() {
    setSavingProf(true)
    setProfMsg(null)
    try {
      await apiClient.put('/users/me', {
        organization:  organization.trim()  || undefined,
        occupation:    occupation.trim()    || undefined,
        current_role:  currentRole.trim()   || undefined,
        primary_field: primaryField.trim()  || undefined,
        location:      location.trim()      || undefined,
        expertise:     expertise.trim()     || undefined,
        biography:     biography.trim()     || undefined,
        linkedin_url:  linkedinUrl.trim()   || undefined,
        twitter_url:   twitterUrl.trim()    || undefined,
      })
      updateUser({ organization, occupation, currentRole, primaryField, location, expertise, biography, linkedinUrl, twitterUrl })
      setProfMsg({ ok: true, text: 'Professional profile saved.' })
    } catch (err) {
      setProfMsg({ ok: false, text: getApiError(err) })
    } finally {
      setSavingProf(false)
    }
  }

  async function handlePasswordChange() {
    if (newPw !== confPw) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      await apiClient.post('/users/me/change-password', {
        current_password: curPw, currentPassword: curPw,
        new_password: newPw, newPassword: newPw,
      })
      setPwMsg({ ok: true, text: 'Password changed successfully.' })
      setCurPw(''); setNewPw(''); setConfPw('')
    } catch (err) {
      setPwMsg({ ok: false, text: getApiError(err) })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-[760px]">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#111827] font-display leading-[36px]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#4b5563] font-body">Manage your profile and account security.</p>
      </div>

      <div className="space-y-6">
        {/* Profile photo */}
        <SectionCard title="Profile Photo">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <div className="flex items-center gap-5">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => !uploadingAvatar && setShowAvatarMenu(v => !v)}
                className="relative block focus:outline-none group"
                disabled={uploadingAvatar}
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#e5e7eb] group-hover:border-[#d51520] transition-colors"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; setAvatarUrl(null) }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#d51520] flex items-center justify-center text-white text-[22px] font-bold font-display">
                    {`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'}
                  </div>
                )}
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

              {showAvatarMenu && (
                <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white rounded-[10px] shadow-[0px_8px_24px_rgba(16,24,40,0.12)] border border-[#f3f4f6] py-1.5 w-[200px]">
                  <button
                    type="button"
                    onClick={() => { setShowAvatarMenu(false); setTimeout(() => fileInputRef.current?.click(), 50) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors text-left"
                  >
                    <Upload01Icon size={15} color="#374151" strokeWidth={1.5} />
                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => { setAvatarUrl(null); setShowAvatarMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#d51520] font-body hover:bg-[#fef2f2] transition-colors text-left"
                    >
                      <Delete01Icon size={15} color="#d51520" strokeWidth={1.5} />
                      Remove photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{firstName} {lastName}</p>
              <p className="text-[12px] text-[#4b5563] font-body mt-0.5">Instructor</p>
              <button
                type="button"
                onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-[12px] text-[#d51520] font-medium font-display mt-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              </button>
              <p className="text-[11px] text-[#4b5563] font-body mt-0.5">JPG, PNG or WebP · Max 5MB</p>
            </div>
          </div>

          {avatarMsg && (
            <div className={`mt-4 flex items-center gap-2 text-[13px] font-body ${avatarMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {avatarMsg.ok
                ? <CheckmarkCircle01Icon size={16} color="#16a34a" strokeWidth={1.5} />
                : <AlertCircleIcon size={16} color="#dc2626" strokeWidth={1.5} />}
              {avatarMsg.text}
            </div>
          )}
        </SectionCard>

        {/* Personal info */}
        <SectionCard title="Personal Information" description="Update your name and contact details.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" value={firstName} onChange={setFirstName} placeholder="Adunola" />
              <FormField label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="Okafor" />
            </div>
            <FormField label="Email Address" value={user?.email ?? ''} readOnly />
            <FormField label="Phone Number" value={phone} onChange={setPhone} placeholder="8012345678" prefix="+234" />
          </div>

          {saveMsg && (
            <div className={`mt-4 flex items-center gap-2 text-[13px] font-body ${saveMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {saveMsg.ok
                ? <CheckmarkCircle01Icon size={16} color="#16a34a" strokeWidth={1.5} />
                : <AlertCircleIcon size={16} color="#dc2626" strokeWidth={1.5} />}
              {saveMsg.text}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-5 bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </SectionCard>

        {/* Professional profile */}
        <SectionCard title="Professional Profile" description="Help students and admins know your background and expertise.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Current Role" value={currentRole} onChange={setCurrentRole} placeholder="e.g. Senior Data Scientist" />
              <FormField label="Organization" value={organization} onChange={setOrganization} placeholder="e.g. Brixgate" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Occupation" value={occupation} onChange={setOccupation} placeholder="e.g. Software Engineer" />
              <FormField label="Primary Field" value={primaryField} onChange={setPrimaryField} placeholder="e.g. Artificial Intelligence" />
            </div>
            <FormField label="Location" value={location} onChange={setLocation} placeholder="e.g. Lagos, Nigeria" />
            <FormField label="Expertise" value={expertise} onChange={setExpertise} placeholder="e.g. Machine Learning, Python, Data Analysis" />
            <FormTextarea label="Biography" value={biography} onChange={setBiography} placeholder="A short bio that will appear on your profile…" rows={4} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="LinkedIn URL" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/yourname" />
              <FormField label="Twitter / X URL" value={twitterUrl} onChange={setTwitterUrl} placeholder="https://twitter.com/yourhandle" />
            </div>
          </div>

          {profMsg && (
            <div className={`mt-4 flex items-center gap-2 text-[13px] font-body ${profMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {profMsg.ok
                ? <CheckmarkCircle01Icon size={16} color="#16a34a" strokeWidth={1.5} />
                : <AlertCircleIcon size={16} color="#dc2626" strokeWidth={1.5} />}
              {profMsg.text}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveProfessional}
              disabled={savingProf}
              className="h-10 px-5 bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display"
            >
              {savingProf ? 'Saving…' : 'Save Professional Profile'}
            </button>
          </div>
        </SectionCard>

        {/* Account details (read-only) */}
        <SectionCard title="Account Details" description="Your role and system information.">
          <div className="space-y-4">
            <FormField label="Role"   value="Instructor" readOnly />
            <FormField label="User ID" value={String(user?.id ?? '—')} readOnly />
          </div>
        </SectionCard>

        {/* Change password */}
        <SectionCard title="Change Password" description="Use a strong password you don't use elsewhere.">
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Current Password</label>
              <div className="flex items-center h-[44px] rounded-[6px] border border-[#d1d5db] bg-white focus-within:ring-2 focus-within:ring-[#d51520]/20 focus-within:border-[#d51520] transition-all">
                <input type={showCur ? 'text' : 'password'} value={curPw} onChange={e => setCurPw(e.target.value)}
                  className="flex-1 px-3 h-full text-[14px] text-[#111827] bg-transparent outline-none font-body" />
                <button onClick={() => setShowCur(v => !v)} className="px-3 text-[#9ca3af] hover:text-[#374151]">
                  {showCur ? <ViewOffIcon size={18} strokeWidth={1.5} /> : <EyeIcon size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">New Password</label>
              <div className="flex items-center h-[44px] rounded-[6px] border border-[#d1d5db] bg-white focus-within:ring-2 focus-within:ring-[#d51520]/20 focus-within:border-[#d51520] transition-all">
                <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="flex-1 px-3 h-full text-[14px] text-[#111827] bg-transparent outline-none font-body" />
                <button onClick={() => setShowNew(v => !v)} className="px-3 text-[#9ca3af] hover:text-[#374151]">
                  {showNew ? <ViewOffIcon size={18} strokeWidth={1.5} /> : <EyeIcon size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            <FormField label="Confirm New Password" value={confPw} onChange={setConfPw} type="password" placeholder="••••••••" />
          </div>

          {pwMsg && (
            <div className={`mt-4 flex items-center gap-2 text-[13px] font-body ${pwMsg.ok ? 'text-green-700' : 'text-red-600'}`}>
              {pwMsg.ok
                ? <CheckmarkCircle01Icon size={16} color="#16a34a" strokeWidth={1.5} />
                : <AlertCircleIcon size={16} color="#dc2626" strokeWidth={1.5} />}
              {pwMsg.text}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handlePasswordChange}
              disabled={pwSaving || !curPw || !newPw || !confPw}
              className="h-10 px-5 bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold rounded-[8px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display"
            >
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
