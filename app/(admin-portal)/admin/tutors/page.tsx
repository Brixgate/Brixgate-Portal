'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  TeacherIcon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, Search01Icon, Refresh01Icon, Mail01Icon,
  CallIcon, Globe02Icon, Location01Icon, Linkedin01Icon,
  TwitterIcon, Building01Icon, Briefcase01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import AdminPageLoader from '@/components/admin/AdminPageLoader'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Expert {
  id: number
  name?: string; first_name?: string; last_name?: string; firstName?: string; lastName?: string
  email?: string
  phone?: string; phone_number?: string; phoneNumber?: string
  bio?: string; about?: string; description?: string
  specialty?: string; expertise?: string; specialization?: string
  occupation?: string; job_title?: string; jobTitle?: string
  location?: string; city?: string; country?: string
  organization?: string; company?: string
  profile_image?: string; profileImage?: string; avatar?: string; photo?: string
  website?: string
  status?: string
  linkedin?: string; linkedin_url?: string; linkedinUrl?: string
  twitter?: string; twitter_url?: string; twitterUrl?: string; twitter_handle?: string
  years_experience?: number; yearsExperience?: number; years_of_experience?: number
  created_at?: string; createdAt?: string
}

interface Pagination {
  totalElements?: number; total_elements?: number; total?: number
  totalPages?: number; total_pages?: number
  hasNext?: boolean; has_next?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function expertName(e: Expert): string {
  if (e.name) return e.name
  return `${e.firstName ?? e.first_name ?? ''} ${e.lastName ?? e.last_name ?? ''}`.trim() || e.email || '—'
}
function expertPhone(e: Expert): string     { return e.phone ?? e.phone_number ?? e.phoneNumber ?? '' }
function expertBio(e: Expert): string       { return e.bio ?? e.about ?? e.description ?? '' }
function expertSpecialty(e: Expert): string { return e.expertise ?? e.specialty ?? e.specialization ?? '' }
function expertOccupation(e: Expert): string { return e.occupation ?? e.job_title ?? e.jobTitle ?? '' }
function expertLocation(e: Expert): string  {
  if (e.location) return e.location
  return [e.city, e.country].filter(Boolean).join(', ')
}
function expertOrg(e: Expert): string       { return e.organization ?? e.company ?? '' }
function expertLinkedin(e: Expert): string  { return e.linkedin ?? e.linkedin_url ?? e.linkedinUrl ?? '' }
function expertTwitter(e: Expert): string   { return e.twitter ?? e.twitter_url ?? e.twitterUrl ?? e.twitter_handle ?? '' }
function expertAvatar(e: Expert): string | null {
  return e.profile_image ?? e.profileImage ?? e.avatar ?? e.photo ?? null
}
function expertYoe(e: Expert): number | null {
  return e.years_experience ?? e.yearsExperience ?? e.years_of_experience ?? null
}
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Initials({ name, size = 10 }: { name: string; size?: number }) {
  const parts = name.trim().split(' ')
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  const dim = size === 10 ? 'w-10 h-10 text-[13px]' : 'w-8 h-8 text-[11px]'
  return (
    <div className={`${dim} rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-[#d51520] font-display uppercase">{letters || '?'}</span>
    </div>
  )
}

// ── Detail side panel ─────────────────────────────────────────────────────────
function TutorDetailPanel({ expert, onClose }: { expert: Expert; onClose: () => void }) {
  const name       = expertName(expert)
  const avatar     = expertAvatar(expert)
  const bio        = expertBio(expert)
  const spec       = expertSpecialty(expert)
  const occupation = expertOccupation(expert)
  const location   = expertLocation(expert)
  const org        = expertOrg(expert)
  const phone      = expertPhone(expert)
  const linkedin   = expertLinkedin(expert)
  const twitter    = expertTwitter(expert)
  const yoe        = expertYoe(expert)

  const initials = name.split(' ').map(p => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[440px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Tutor Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile hero */}
          <div className="px-6 pt-6 pb-5 border-b border-[#f3f4f6]">
            <div className="flex items-start gap-4">
              {avatar
                ? <Image src={avatar} alt={name} width={64} height={64} className="w-16 h-16 rounded-full object-cover flex-shrink-0" unoptimized />
                : (
                  <div className="w-16 h-16 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                    <span className="text-[20px] font-bold text-[#d51520] font-display">{initials}</span>
                  </div>
                )
              }
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-[17px] font-bold text-[#111827] font-display leading-tight">{name}</p>
                {occupation && <p className="text-[13px] text-[#4b5563] font-body mt-0.5">{occupation}</p>}
                {spec && <p className="text-[12px] text-[#d51520] font-body mt-1">{spec}</p>}
                {expert.status && (
                  <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                    expert.status.toUpperCase() === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#4b5563]'
                  }`}>{expert.status}</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* Contact */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4b5563] font-display mb-3">Contact</p>
              <div className="space-y-2.5">
                {expert.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                      <Mail01Icon size={14} color="#1d4ed8" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] text-[#374151] font-body">{expert.email}</p>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: '#ECFDF3' }}>
                      <CallIcon size={14} color="#027a48" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] text-[#374151] font-body">{phone}</p>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: '#FFF7ED' }}>
                      <Location01Icon size={14} color="#ea580c" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] text-[#374151] font-body">{location}</p>
                  </div>
                )}
                {linkedin && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                      <Linkedin01Icon size={14} color="#0a66c2" strokeWidth={1.5} />
                    </div>
                    <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-[#0a66c2] font-body hover:underline truncate">
                      {linkedin.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </div>
                )}
                {twitter && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: '#F0F9FF' }}>
                      <TwitterIcon size={14} color="#0ea5e9" strokeWidth={1.5} />
                    </div>
                    <a href={twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-[#0ea5e9] font-body hover:underline truncate">
                      {twitter.startsWith('@') ? twitter : `@${twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '')}`}
                    </a>
                  </div>
                )}
                {expert.website && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
                      <Globe02Icon size={14} color="#7c3aed" strokeWidth={1.5} />
                    </div>
                    <a href={expert.website} target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-[#7c3aed] font-body hover:underline truncate">
                      {expert.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Professional */}
            <div className="h-px bg-[#f3f4f6]" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4b5563] font-display mb-3">Professional</p>
              <div className="space-y-2.5">
                {spec && (
                  <div className="flex justify-between gap-4">
                    <p className="text-[12px] text-[#4b5563] font-body flex-shrink-0">Expertise</p>
                    <p className="text-[13px] font-medium text-[#111827] font-body text-right">{spec}</p>
                  </div>
                )}
                {occupation && (
                  <div className="flex justify-between gap-4">
                    <p className="text-[12px] text-[#4b5563] font-body flex-shrink-0">Occupation</p>
                    <p className="text-[13px] font-medium text-[#111827] font-body text-right">{occupation}</p>
                  </div>
                )}
                {org && (
                  <div className="flex justify-between gap-4">
                    <p className="text-[12px] text-[#4b5563] font-body flex-shrink-0">Organisation</p>
                    <p className="text-[13px] font-medium text-[#111827] font-body text-right">{org}</p>
                  </div>
                )}
                {yoe != null && (
                  <div className="flex justify-between gap-4">
                    <p className="text-[12px] text-[#4b5563] font-body flex-shrink-0">Experience</p>
                    <p className="text-[13px] font-medium text-[#111827] font-body text-right">{yoe} year{yoe !== 1 ? 's' : ''}</p>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <p className="text-[12px] text-[#4b5563] font-body flex-shrink-0">Date Added</p>
                  <p className="text-[13px] font-medium text-[#111827] font-body text-right">{formatDate(expert.createdAt ?? expert.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Biography */}
            {bio && (
              <>
                <div className="h-px bg-[#f3f4f6]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4b5563] font-display mb-2">Biography</p>
                  <p className="text-[13px] text-[#374151] font-body leading-[1.8]">{bio}</p>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

// ── Create Tutor Modal ────────────────────────────────────────────────────────
interface CreateForm {
  name: string; email: string
  phone: string; expertise: string; bio: string; website: string
}
const EMPTY_FORM: CreateForm = { name: '', email: '', phone: '', expertise: '', bio: '', website: '' }

function CreateTutorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]     = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(field: keyof CreateForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.name.trim())   { setError('Full name is required.'); return }
    if (!form.email.trim())  { setError('Email is required.'); return }
    setSaving(true)
    try {
      await apiClient.post('/admin/users', {
        name:      form.name.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim()     || undefined,
        expertise: form.expertise.trim() || undefined,
        bio:       form.bio.trim()       || undefined,
        website:   form.website.trim()   || undefined,
        role:      'INSTRUCTOR',
      })
      onCreated()
    } catch (err) {
      setError(getApiError(err))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[500px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Add Tutor</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Full Name <span className="text-[#d51520]">*</span></label>
            <input value={form.name} onChange={set('name')} placeholder="Adunola Okafor"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Email Address <span className="text-[#d51520]">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="adunola@example.com"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Phone Number</label>
            <input value={form.phone} onChange={set('phone')} placeholder="+234 801 234 5678"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Expertise</label>
            <input value={form.expertise} onChange={set('expertise')} placeholder="AI & Machine Learning, Prompt Engineering"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Website / LinkedIn</label>
            <input value={form.website} onChange={set('website')} placeholder="https://linkedin.com/in/adunola"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={set('bio')} rows={3}
              placeholder="Brief professional background and areas of expertise…"
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              Add Tutor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function AdminTutorsPage() {
  const [experts, setExperts]           = useState<Expert[]>([])
  const [pagination, setPagination]     = useState<Pagination | null>(null)
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [view, setView]                 = useState<'list' | 'grid'>('list')
  const [selectedTutor, setSelected]    = useState<Expert | null>(null)

  const fetchExperts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
      const res    = await apiClient.get(`/experts?${params}`)
      const unwrapped = unwrap<Expert[] | { experts?: Expert[]; data?: Expert[]; results?: Expert[]; pagination?: Pagination }>(res.data)

      let list: Expert[] = []
      let pag: Pagination | null = null

      if (Array.isArray(unwrapped)) {
        list = unwrapped
      } else if (unwrapped && typeof unwrapped === 'object') {
        const u = unwrapped as { experts?: Expert[]; data?: Expert[]; results?: Expert[]; pagination?: Pagination }
        list = u.experts ?? u.data ?? u.results ?? []
        if (u.pagination) pag = u.pagination
      }

      setExperts(list)
      if (pag) setPagination(pag)
    } catch {
      setExperts([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchExperts() }, [fetchExperts])

  const filtered = search.trim()
    ? experts.filter(e => {
        const q = search.toLowerCase()
        return expertName(e).toLowerCase().includes(q)
          || (e.email ?? '').toLowerCase().includes(q)
          || expertSpecialty(e).toLowerCase().includes(q)
      })
    : experts

  const totalPages = pagination?.totalPages ?? pagination?.total_pages ?? 1
  const total      = pagination?.totalElements ?? pagination?.total_elements ?? pagination?.total ?? experts.length

  return (
    <div className="p-8">
      {loading && experts.length === 0 && <AdminPageLoader />}

      {selectedTutor && (
        <TutorDetailPanel expert={selectedTutor} onClose={() => setSelected(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Tutors</h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} tutor${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={15} strokeWidth={2} /> Add Tutor
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[360px]">
          <Search01Icon size={14} color="#4b5563" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or expertise…"
            className="w-full h-9 pl-8 pr-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
        </div>

        <div className="flex items-center border border-[#e5e7eb] rounded-[8px] overflow-hidden">
          {(['list', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`h-9 px-3 text-[12px] font-medium font-body transition-colors ${
                view === v ? 'bg-[#fef2f2] text-[#d51520]' : 'text-[#4b5563] hover:bg-[#f9fafb]'
              }`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button onClick={fetchExperts}
          className="h-9 w-9 flex items-center justify-center border border-[#e5e7eb] rounded-[8px] hover:bg-[#f9fafb] transition-colors">
          <Refresh01Icon size={14} color="#4b5563" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        view === 'list' ? (
          <div className="bg-white rounded-[10px] border border-[#eaecf0] overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#f3f4f6]">
                <div className="w-8 h-8 rounded-full bg-[#f3f4f6] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-[#f3f4f6] rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-1/4" />
                </div>
                <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[10px] border border-[#eaecf0] p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f3f4f6] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-[#f3f4f6] rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-[#f3f4f6] rounded animate-pulse" />
                <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-5/6" />
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
            <TeacherIcon size={28} color="#d1d5db" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] font-display mb-2">
            {search ? 'No tutors match your search' : 'No tutors yet'}
          </p>
          <p className="text-[13px] text-[#4b5563] font-body max-w-[280px]">
            {search ? 'Try a different name, email, or expertise.' : 'Add your first tutor to get started.'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
              <Add01Icon size={15} strokeWidth={2} /> Add Tutor
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        /* ── List (default) ── */
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Tutor', 'Occupation', 'Email', 'Location', 'Status', 'Added'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const name   = expertName(e)
                const avatar = expertAvatar(e)
                return (
                  <tr key={e.id} onClick={() => setSelected(e)}
                    className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {avatar
                          ? <Image src={avatar} alt={name} width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" unoptimized />
                          : <Initials name={name} size={8} />
                        }
                        <p className="text-[13px] font-medium text-[#111827] font-body">{name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><p className="text-[13px] text-[#4b5563] font-body">{expertOccupation(e) || '—'}</p></td>
                    <td className="px-5 py-3.5"><p className="text-[13px] text-[#4b5563] font-body">{e.email ?? '—'}</p></td>
                    <td className="px-5 py-3.5"><p className="text-[13px] text-[#4b5563] font-body">{expertLocation(e) || '—'}</p></td>
                    <td className="px-5 py-3.5">
                      {e.status
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${e.status.toUpperCase() === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#4b5563]'}`}>{e.status}</span>
                        : <span className="text-[#d1d5db]">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(e.createdAt ?? e.created_at)}</p></td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-5 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
              <p className="text-[12px] text-[#4b5563] font-body">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
                <span className="h-7 px-3 flex items-center text-[12px] font-body text-[#374151]">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={!(pagination?.hasNext ?? pagination?.has_next ?? false)}
                  className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Grid ── */
        <div className="grid grid-cols-3 gap-6">
          {filtered.map(e => {
            const name   = expertName(e)
            const avatar = expertAvatar(e)
            const bio    = expertBio(e)
            const spec   = expertSpecialty(e)
            const phone  = expertPhone(e)
            return (
              <div key={e.id} onClick={() => setSelected(e)}
                className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-5 hover:shadow-[0px_1px_3px_rgba(16,24,40,.10)] transition-shadow duration-150 cursor-pointer">
                <div className="flex items-start gap-3 mb-4">
                  {avatar
                    ? <Image src={avatar} alt={name} width={40} height={40} className="w-10 h-10 rounded-full object-cover flex-shrink-0" unoptimized />
                    : <Initials name={name} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#111827] font-display truncate">{name}</p>
                    {spec !== '—' && <p className="text-[12px] text-[#d51520] font-body truncate mt-0.5">{spec}</p>}
                  </div>
                  {e.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display flex-shrink-0 ${e.status.toUpperCase() === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#4b5563]'}`}>
                      {e.status}
                    </span>
                  )}
                </div>
                {bio && <p className="text-[12px] text-[#4b5563] font-body line-clamp-2 mb-4">{bio}</p>}
                <div className="flex flex-col gap-1.5 border-t border-[#f3f4f6] pt-4">
                  {e.email && (
                    <div className="flex items-center gap-2">
                      <Mail01Icon size={12} color="#4b5563" strokeWidth={1.5} />
                      <span className="text-[12px] text-[#4b5563] font-body truncate">{e.email}</span>
                    </div>
                  )}
                  {phone !== '—' && (
                    <div className="flex items-center gap-2">
                      <CallIcon size={12} color="#4b5563" strokeWidth={1.5} />
                      <span className="text-[12px] text-[#4b5563] font-body">{phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateTutorModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchExperts() }}
        />
      )}
    </div>
  )
}
