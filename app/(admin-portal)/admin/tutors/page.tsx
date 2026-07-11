'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Teacher01Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, Search01Icon, RefreshIcon, Mail01Icon,
  CallIcon, Globe01Icon,
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
  profile_image?: string; profileImage?: string; avatar?: string; photo?: string
  website?: string
  status?: string
  linkedin?: string; linkedin_url?: string; linkedinUrl?: string
  years_experience?: number; yearsExperience?: number
  created_at?: string; createdAt?: string
}

interface Pagination {
  totalElements?: number; total_elements?: number; total?: number
  totalPages?: number; total_pages?: number
  hasNext?: boolean; has_next?: boolean
}

function expertName(e: Expert): string {
  if (e.name) return e.name
  return `${e.firstName ?? e.first_name ?? ''} ${e.lastName ?? e.last_name ?? ''}`.trim() || e.email || '—'
}
function expertPhone(e: Expert): string {
  return e.phone ?? e.phone_number ?? e.phoneNumber ?? '—'
}
function expertBio(e: Expert): string {
  return e.bio ?? e.about ?? e.description ?? ''
}
function expertSpecialty(e: Expert): string {
  return e.specialty ?? e.expertise ?? e.specialization ?? '—'
}
function expertAvatar(e: Expert): string | null {
  return e.profile_image ?? e.profileImage ?? e.avatar ?? e.photo ?? null
}
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return (
    <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
      <span className="text-[13px] font-bold text-[#d51520] font-display uppercase">{letters || '?'}</span>
    </div>
  )
}

// ── Create Tutor Modal ────────────────────────────────────────────────────────
interface CreateForm {
  first_name: string; last_name: string; email: string
  phone: string; specialty: string; bio: string; website: string
}

const EMPTY_FORM: CreateForm = { first_name: '', last_name: '', email: '', phone: '', specialty: '', bio: '', website: '' }

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
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    try {
      await apiClient.post('/experts', {
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        email:      form.email.trim(),
        phone:      form.phone.trim() || undefined,
        specialty:  form.specialty.trim() || undefined,
        bio:        form.bio.trim() || undefined,
        website:    form.website.trim() || undefined,
      })
      onCreated()
    } catch (err) {
      setError(getApiError(err))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[500px] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Add Tutor</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">First Name <span className="text-[#d51520]">*</span></label>
              <input value={form.first_name} onChange={set('first_name')} placeholder="Adunola"
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Last Name</label>
              <input value={form.last_name} onChange={set('last_name')} placeholder="Okafor"
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Email Address <span className="text-[#d51520]">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="adunola@example.com"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Phone Number</label>
            <input value={form.phone} onChange={set('phone')} placeholder="+234 801 234 5678"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Specialty / Expertise</label>
            <input value={form.specialty} onChange={set('specialty')} placeholder="AI & Machine Learning, Prompt Engineering"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Website / LinkedIn</label>
            <input value={form.website} onChange={set('website')} placeholder="https://linkedin.com/in/adunola"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={set('bio')} rows={3}
              placeholder="Brief professional background and areas of expertise…"
              className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
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

// ── Tutor Card ────────────────────────────────────────────────────────────────
function TutorCard({ expert }: { expert: Expert }) {
  const name    = expertName(expert)
  const avatar  = expertAvatar(expert)
  const bio     = expertBio(expert)
  const phone   = expertPhone(expert)
  const spec    = expertSpecialty(expert)

  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-5 hover:shadow-[0px_1px_3px_rgba(16,24,40,.10)] transition-shadow duration-150">
      {/* Top row */}
      <div className="flex items-start gap-3 mb-4">
        {avatar
          ? <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          : <Initials name={name} />
        }
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#111827] font-display truncate">{name}</p>
          {spec !== '—' && (
            <p className="text-[12px] text-[#d51520] font-body truncate mt-0.5">{spec}</p>
          )}
        </div>
        {expert.status && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display flex-shrink-0 ${
            expert.status.toUpperCase() === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'
          }`}>
            {expert.status}
          </span>
        )}
      </div>

      {/* Bio */}
      {bio && (
        <p className="text-[12px] text-[#6b7280] font-body line-clamp-2 mb-4">{bio}</p>
      )}

      {/* Contact row */}
      <div className="flex flex-col gap-1.5 border-t border-[#f3f4f6] pt-4">
        {expert.email && (
          <div className="flex items-center gap-2">
            <Mail01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
            <span className="text-[12px] text-[#6b7280] font-body truncate">{expert.email}</span>
          </div>
        )}
        {phone !== '—' && (
          <div className="flex items-center gap-2">
            <CallIcon size={12} color="#9ca3af" strokeWidth={1.5} />
            <span className="text-[12px] text-[#6b7280] font-body">{phone}</span>
          </div>
        )}
        {(expert.website ?? expert.linkedin ?? expert.linkedin_url ?? expert.linkedinUrl) && (
          <div className="flex items-center gap-2">
            <Globe01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
            <a
              href={expert.website ?? expert.linkedin ?? expert.linkedin_url ?? expert.linkedinUrl ?? '#'}
              target="_blank" rel="noopener noreferrer"
              className="text-[12px] text-[#d51520] font-body truncate hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {(expert.website ?? expert.linkedin ?? expert.linkedin_url ?? expert.linkedinUrl ?? '').replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {expert.created_at || expert.createdAt ? (
        <p className="text-[11px] text-[#d1d5db] font-body mt-3">
          Added {formatDate(expert.createdAt ?? expert.created_at)}
        </p>
      ) : null}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function AdminTutorsPage() {
  const [experts, setExperts]       = useState<Expert[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView]             = useState<'grid' | 'list'>('grid')

  const fetchExperts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
      const res    = await apiClient.get(`/experts?${params}`)
      // The endpoint may return an array directly or wrapped in data/experts
      const raw    = res.data
      const unwrapped = unwrap<Expert[] | { experts?: Expert[]; data?: Expert[]; results?: Expert[]; pagination?: Pagination }>(raw)

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

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Tutors</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} tutor${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors"
        >
          <Add01Icon size={15} strokeWidth={2} /> Add Tutor
        </button>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[360px]">
          <Search01Icon size={14} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or specialty…"
            className="w-full h-9 pl-8 pr-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
          />
        </div>

        {/* Grid / List toggle */}
        <div className="flex items-center border border-[#e5e7eb] rounded-[8px] overflow-hidden">
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`h-9 px-3 text-[12px] font-medium font-body transition-colors ${
                view === v ? 'bg-[#fef2f2] text-[#d51520]' : 'text-[#6b7280] hover:bg-[#f9fafb]'
              }`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button onClick={fetchExperts}
          className="h-9 w-9 flex items-center justify-center border border-[#e5e7eb] rounded-[8px] hover:bg-[#f9fafb] transition-colors">
          <RefreshIcon size={14} color="#6b7280" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        view === 'grid' ? (
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
        ) : (
          <div className="bg-white rounded-[10px] border border-[#eaecf0] overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#f3f4f6]">
                <div className="w-9 h-9 rounded-full bg-[#f3f4f6] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-[#f3f4f6] rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-1/4" />
                </div>
                <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-40" />
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
            <Teacher01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-semibold text-[#111827] font-display mb-2">
            {search ? 'No tutors match your search' : 'No tutors yet'}
          </p>
          <p className="text-[13px] text-[#9ca3af] font-body max-w-[280px]">
            {search ? 'Try a different name, email, or specialty.' : 'Add your first tutor to get started.'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="mt-4 flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
              <Add01Icon size={15} strokeWidth={2} /> Add Tutor
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-6">
          {filtered.map(e => <TutorCard key={e.id} expert={e} />)}
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Tutor', 'Specialty', 'Email', 'Phone', 'Status', 'Added'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const name   = expertName(e)
                const avatar = expertAvatar(e)
                return (
                  <tr key={e.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {avatar
                          ? <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          : <Initials name={name} />
                        }
                        <p className="text-[13px] font-medium text-[#111827] font-body">{name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] text-[#6b7280] font-body">{expertSpecialty(e)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] text-[#6b7280] font-body">{e.email ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] text-[#6b7280] font-body">{expertPhone(e)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {e.status ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                          e.status.toUpperCase() === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'
                        }`}>{e.status}</span>
                      ) : <span className="text-[#d1d5db]">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[12px] text-[#9ca3af] font-body">{formatDate(e.createdAt ?? e.created_at)}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
              <p className="text-[12px] text-[#6b7280] font-body">
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
