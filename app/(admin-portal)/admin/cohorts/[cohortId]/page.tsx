'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, UserGroup02Icon,
  File01Icon, StarIcon, BookOpen01Icon, CheckmarkCircle01Icon,
  CircleIcon, AlertCircleIcon, DatabaseIcon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cohort {
  id: number; title: string; status?: string
  start_date?: string; end_date?: string; max_students?: number
  program_id?: number; programId?: number
  program?: { id: number; title: string }
}
interface ProgramModule { id: number; title: string; description?: string; order_index?: number; status?: string }
interface CohortModule  { id: number; program_module_id?: number; programModuleId?: number; title?: string }

interface Member {
  id: number
  user?: { id?: number; name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  role?: string
  membershipStatus?: string; membership_status?: string
}
interface Enrollment {
  id: number
  user?: { id?: number; name?: string; email: string }
  enrollment_type?: string; enrollmentType?: string
  seats_purchased?: number; seatsPurchased?: number
  seats_used?: number; seatsUsed?: number
  status?: string
  completion_status?: string; completionStatus?: string
  created_at?: string; createdAt?: string
}
interface Review {
  id: number; user?: { name?: string; email: string }; rating?: number
  comment?: string; is_anonymous?: boolean; created_at?: string
}

// Merged row for the People tab
interface PersonRow {
  key: string
  name: string
  email: string
  role: string
  enrollmentType: string
  seats: number | string
  enrollmentStatus: string
  completionStatus: string
  joinedAt: string
}

function userName(u?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }) {
  if (!u) return '—'
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Tab: Curriculum — two-panel ───────────────────────────────────────────────
function CurriculumTab({ cohortId, programId }: { cohortId: string; programId: number | null }) {
  const [allModules, setAllModules]       = useState<ProgramModule[]>([])
  const [cohortModules, setCohortModules] = useState<CohortModule[]>([])
  const [selected, setSelected]           = useState<Set<number>>(new Set())
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(false)

  const load = useCallback(async () => {
    if (!programId) { setLoading(false); return }
    setLoading(true)
    try {
      const [progModRes, cohortModRes] = await Promise.allSettled([
        apiClient.get(`/admin/programs/${programId}/modules`),
        apiClient.get(`/admin/cohorts/${cohortId}/modules`),
      ])
      if (progModRes.status === 'fulfilled') {
        const d = unwrap<{ modules?: ProgramModule[] } | ProgramModule[]>(progModRes.value.data)
        setAllModules(Array.isArray(d) ? d : (d as { modules?: ProgramModule[] })?.modules ?? [])
      }
      if (cohortModRes.status === 'fulfilled') {
        const d = unwrap<{ modules?: CohortModule[] } | CohortModule[]>(cohortModRes.value.data)
        const mods: CohortModule[] = Array.isArray(d) ? d : (d as { modules?: CohortModule[] })?.modules ?? []
        setCohortModules(mods)
        setSelected(new Set(mods.map(m => m.program_module_id ?? m.programModuleId ?? 0)))
      }
    } finally { setLoading(false) }
  }, [cohortId, programId])

  useEffect(() => { load() }, [load])

  function toggle(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function saveCurriculum() {
    setSaving(true); setError(''); setSuccess(false)
    try {
      await apiClient.post(`/admin/cohorts/${cohortId}/modules`, {
        module_ids: allModules.filter(m => selected.has(m.id)).map(m => m.id),
      })
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
      load()
    } catch {
      try {
        const currentIds = new Set(cohortModules.map(m => m.program_module_id ?? m.programModuleId ?? 0))
        const toAdd    = Array.from(selected).filter(id => !currentIds.has(id))
        const toRemove = cohortModules.filter(m => !selected.has(m.program_module_id ?? m.programModuleId ?? 0))
        await Promise.all([
          ...toAdd.map(id => apiClient.post(`/admin/cohorts/${cohortId}/modules`, { program_module_id: id })),
          ...toRemove.map(m => apiClient.delete(`/admin/cohorts/${cohortId}/modules/${m.id}`)),
        ])
        setSuccess(true); setTimeout(() => setSuccess(false), 3000)
        load()
      } catch (err) { setError(getApiError(err)) }
    } finally { setSaving(false) }
  }

  if (!programId) return (
    <div className="flex items-center justify-center py-16 text-center px-6">
      <div>
        <BookOpen01Icon size={32} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-[#111827] font-display">No programme linked</p>
        <p className="text-[13px] text-[#6b7280] font-body mt-1">This cohort has no programme associated</p>
      </div>
    </div>
  )

  const hasChanges = (() => {
    const cur = new Set(cohortModules.map(m => m.program_module_id ?? m.programModuleId ?? 0))
    if (cur.size !== selected.size) return true
    return allModules.some(m => selected.has(m.id) !== cur.has(m.id))
  })()

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: Master Bank ────────────────────────────── */}
      <div className="w-[320px] flex-shrink-0 border-r border-[#f3f4f6] flex flex-col bg-[#f9fafb]">
        <div className="px-5 py-4 border-b border-[#f3f4f6] bg-white">
          <div className="flex items-center gap-2">
            <DatabaseIcon size={14} color="#6b7280" strokeWidth={1.5} />
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6b7280] font-display">
              Master Bank
            </p>
          </div>
          <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
            All modules in this programme ({allModules.length})
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-[#f3f4f6]">
                <div className="w-5 h-5 rounded bg-[#e5e7eb] animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="h-3.5 bg-[#e5e7eb] rounded animate-pulse w-3/4 mb-1.5" />
                  <div className="h-3 bg-[#e5e7eb] rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))
          ) : allModules.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-[#9ca3af] font-body">No modules in programme</p>
            </div>
          ) : (
            allModules.map((m, idx) => (
              <div key={m.id}
                className={`flex items-start gap-3 px-5 py-3.5 border-b border-[#f3f4f6] ${
                  selected.has(m.id) ? 'bg-[#fef2f2]' : 'bg-white hover:bg-[#f9fafb]'
                } transition-colors`}
              >
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold font-display mt-0.5 ${
                  selected.has(m.id) ? 'bg-[#d51520] text-white' : 'bg-[#e5e7eb] text-[#6b7280]'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold font-display leading-tight ${selected.has(m.id) ? 'text-[#d51520]' : 'text-[#111827]'}`}>
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="text-[11px] text-[#9ca3af] font-body mt-0.5 leading-snug line-clamp-2">{m.description}</p>
                  )}
                  {m.status && (
                    <span className={`inline-block mt-1 text-[9px] font-bold font-display px-1.5 py-0.5 rounded-[3px] uppercase tracking-wide ${
                      m.status === 'PUBLISHED' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fffbeb] text-[#b45309]'
                    }`}>{m.status}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: Cohort Curriculum ────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen01Icon size={14} color="#d51520" strokeWidth={1.5} />
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#d51520] font-display">
                Cohort Curriculum
              </p>
            </div>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
              {selected.size} of {allModules.length} modules selected for this cohort
            </p>
          </div>
          <div className="flex items-center gap-3">
            {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={12} color="#d51520" strokeWidth={1.5} /> {error}</p>}
            {success && <p className="flex items-center gap-1.5 text-[12px] text-[#027a48] font-body"><CheckmarkCircle01Icon size={12} color="#027a48" strokeWidth={1.5} /> Saved</p>}
            <button onClick={saveCurriculum} disabled={saving || !hasChanges}
              className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[12px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center gap-2">
              {saving && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
              Save Curriculum
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-[#f9fafb] rounded-[10px] animate-pulse" />
              ))}
            </div>
          ) : allModules.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen01Icon size={32} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-[#111827] font-display">No modules in programme</p>
              <p className="text-[13px] text-[#6b7280] font-body mt-1">Add modules to the programme first, then assign them here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {allModules.map(m => {
                const checked = selected.has(m.id)
                return (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className={`flex items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left transition-all ${
                      checked ? 'border-[#d51520] bg-[#fef2f2]' : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                    }`}>
                    <div className={`w-5 h-5 rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      checked ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'
                    }`}>
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold font-display ${checked ? 'text-[#d51520]' : 'text-[#111827]'}`}>
                        {m.order_index !== undefined ? `${m.order_index + 1}. ` : ''}{m.title}
                      </p>
                      {m.description && (
                        <p className="text-[12px] text-[#6b7280] font-body mt-0.5 truncate">{m.description}</p>
                      )}
                    </div>
                    {checked
                      ? <CheckmarkCircle01Icon size={16} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                      : <CircleIcon            size={16} color="#d1d5db" strokeWidth={1.5} className="flex-shrink-0" />
                    }
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: People (merged Members + Enrollments) ────────────────────────────────
function PeopleTab({ cohortId }: { cohortId: string }) {
  const [rows, setRows]       = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [membRes, enrollRes] = await Promise.allSettled([
          apiClient.get(`/admin/cohorts/${cohortId}/members?size=100`),
          apiClient.get(`/admin/cohort-enrollments?cohort_id=${cohortId}&size=100`),
        ])

        const members: Member[] = membRes.status === 'fulfilled'
          ? (() => { const d = unwrap<{ members?: Member[] }>(membRes.value.data); return Array.isArray(d?.members) ? d.members : [] })()
          : []

        const enrollments: Enrollment[] = enrollRes.status === 'fulfilled'
          ? (() => { const d = unwrap<{ enrollments?: Enrollment[] }>(enrollRes.value.data); return Array.isArray(d?.enrollments) ? d.enrollments : [] })()
          : []

        // Build a lookup: email → member role
        const roleByEmail: Record<string, string> = {}
        members.forEach(m => {
          if (m.user?.email) roleByEmail[m.user.email] = m.role ?? ''
        })

        // Enrollments are the primary source (have type, seats, dates)
        const enrollmentRows: PersonRow[] = enrollments.map(e => ({
          key:              `e-${e.id}`,
          name:             userName(e.user),
          email:            e.user?.email ?? '—',
          role:             roleByEmail[e.user?.email ?? ''] ?? '',
          enrollmentType:   (e.enrollmentType ?? e.enrollment_type ?? 'INDIVIDUAL').toUpperCase(),
          seats:            e.seatsPurchased ?? e.seats_purchased ?? '—',
          enrollmentStatus: e.status ?? '—',
          completionStatus: (e.completionStatus ?? e.completion_status ?? 'NOT_STARTED').replace(/_/g, ' '),
          joinedAt:         formatDateTime(e.created_at ?? e.createdAt),
        }))

        // Members who don't appear in enrollments (team members added by lead)
        const enrollmentEmails = new Set(enrollments.map(e => e.user?.email ?? ''))
        const memberOnlyRows: PersonRow[] = members
          .filter(m => m.user?.email && !enrollmentEmails.has(m.user.email))
          .map(m => ({
            key:              `m-${m.id}`,
            name:             userName(m.user),
            email:            m.user?.email ?? '—',
            role:             m.role ?? '',
            enrollmentType:   'TEAM MEMBER',
            seats:            '—',
            enrollmentStatus: m.membershipStatus ?? m.membership_status ?? '—',
            completionStatus: '—',
            joinedAt:         '—',
          }))

        setRows([...enrollmentRows, ...memberOnlyRows])
      } catch { setRows([]) } finally { setLoading(false) }
    }
    load()
  }, [cohortId])

  const COMP_STYLE: Record<string, string> = {
    'COMPLETED':    'bg-[#ecfdf3] text-[#027a48]',
    'IN PROGRESS':  'bg-[#eff6ff] text-[#1d4ed8]',
    'NOT STARTED':  'bg-[#f3f4f6] text-[#6b7280]',
  }
  const STATUS_STYLE: Record<string, string> = {
    ENROLLED:   'bg-[#ecfdf3] text-[#027a48]',
    ACTIVE:     'bg-[#ecfdf3] text-[#027a48]',
    PENDING:    'bg-[#fffbeb] text-[#b45309]',
    CANCELLED:  'bg-[#fef2f2] text-[#d51520]',
  }
  const ROLE_STYLE: Record<string, string> = {
    STUDENT:     'bg-[#ecfdf3] text-[#027a48]',
    INSTRUCTOR:  'bg-[#eff6ff] text-[#1d4ed8]',
    ADMIN:       'bg-[#fef2f2] text-[#d51520]',
    TEAM_LEAD:   'bg-[#fffbeb] text-[#b45309]',
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
            {['Name', 'Email', 'Role', 'Plan', 'Seats', 'Status', 'Progress', 'Joined'].map(h => (
              <th key={h}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display ${
                  h === 'Seats' ? 'text-center' : 'text-left'
                }`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#9ca3af] font-body">
                No people in this cohort yet
              </td>
            </tr>
          ) : rows.map(r => (
            <tr key={r.key} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
              <td className="px-4 py-3.5">
                <p className="text-[13px] font-semibold text-[#111827] font-display">{r.name}</p>
              </td>
              <td className="px-4 py-3.5">
                <p className="text-[12px] text-[#6b7280] font-body">{r.email}</p>
              </td>
              <td className="px-4 py-3.5">
                {r.role
                  ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${ROLE_STYLE[r.role.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                      {r.role}
                    </span>
                  : <span className="text-[12px] text-[#d1d5db] font-body">—</span>
                }
              </td>
              <td className="px-4 py-3.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${
                  r.enrollmentType === 'TEAM' || r.enrollmentType === 'TEAM MEMBER'
                    ? 'bg-[#fffbeb] text-[#b45309]'
                    : 'bg-[#f3f4f6] text-[#6b7280]'
                }`}>
                  {r.enrollmentType}
                </span>
              </td>
              <td className="px-4 py-3.5 text-center">
                <span className="text-[13px] font-semibold text-[#111827] font-display">{r.seats}</span>
              </td>
              <td className="px-4 py-3.5">
                {r.enrollmentStatus !== '—'
                  ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${STATUS_STYLE[r.enrollmentStatus.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      {r.enrollmentStatus}
                    </span>
                  : <span className="text-[12px] text-[#d1d5db] font-body">—</span>
                }
              </td>
              <td className="px-4 py-3.5">
                {r.completionStatus !== '—'
                  ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${COMP_STYLE[r.completionStatus.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      {r.completionStatus}
                    </span>
                  : <span className="text-[12px] text-[#d1d5db] font-body">—</span>
                }
              </td>
              <td className="px-4 py-3.5">
                <p className="text-[12px] text-[#9ca3af] font-body whitespace-nowrap">{r.joinedAt}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab: Reviews ──────────────────────────────────────────────────────────────
function ReviewsTab({ cohortId }: { cohortId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(`/admin/cohorts/${cohortId}/reviews?size=50`).then(res => {
      const data = unwrap<{ reviews?: Review[] }>(res.data)
      setReviews(Array.isArray(data?.reviews) ? data.reviews : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
            {['Reviewer', 'Rating', 'Comment', 'Date'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-12 text-center text-[13px] text-[#9ca3af] font-body">No reviews yet</td></tr>
          ) : reviews.map(r => (
            <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
              <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{r.is_anonymous ? 'Anonymous' : userName(r.user)}</p></td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={13} color={i < (r.rating ?? 0) ? '#d97706' : '#e5e7eb'} strokeWidth={1.5} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3.5 max-w-[300px]"><p className="text-[12px] text-[#6b7280] font-body line-clamp-2">{r.comment ?? '—'}</p></td>
              <td className="px-4 py-3.5"><p className="text-[12px] text-[#9ca3af] font-body">{formatDate(r.created_at)}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = ['Curriculum', 'People', 'Reviews'] as const
type Tab = typeof TABS[number]

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-[#ecfdf3] text-[#027a48]', UPCOMING: 'bg-[#eff6ff] text-[#1d4ed8]', CLOSED: 'bg-[#f3f4f6] text-[#6b7280]',
}

export default function CohortDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const cohortId = params.cohortId as string

  const [cohort, setCohort]       = useState<Cohort | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Curriculum')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    apiClient.get(`/admin/cohorts/${cohortId}`).then(res => {
      setCohort(unwrap<Cohort>(res.data))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  const programId = cohort?.programId ?? cohort?.program_id ?? cohort?.program?.id ?? null
  const backHref  = programId ? `/admin/programs/${programId}` : '/admin/programs'

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        <button onClick={() => router.push(backHref)}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        {loading
          ? <div className="h-5 w-56 bg-[#f3f4f6] rounded animate-pulse" />
          : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                {cohort?.program && (
                  <p className="text-[11px] text-[#9ca3af] font-body truncate">{cohort.program.title}</p>
                )}
                <h1 className="text-[16px] font-bold text-[#111827] font-display truncate">{cohort?.title ?? 'Cohort'}</h1>
              </div>
              {cohort?.status && (
                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${STATUS_STYLE[cohort.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                  {cohort.status}
                </span>
              )}
            </div>
          )
        }
        {cohort && (
          <div className="flex items-center gap-4 text-[12px] text-[#9ca3af] font-body ml-auto flex-shrink-0">
            <span>Start: {formatDate(cohort.start_date)}</span>
            <span>End: {formatDate(cohort.end_date)}</span>
            <span>Max: {cohort.max_students ?? '—'}</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}>
            {tab === 'Curriculum' && <BookOpen01Icon  size={14} strokeWidth={1.5} />}
            {tab === 'People'     && <UserGroup02Icon size={14} strokeWidth={1.5} />}
            {tab === 'Reviews'    && <StarIcon        size={14} strokeWidth={1.5} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={`flex-1 overflow-y-auto bg-white ${activeTab === 'Curriculum' ? 'overflow-hidden' : ''}`}
        style={activeTab === 'Curriculum' ? { display: 'flex', flexDirection: 'column' } : {}}>
        {activeTab === 'Curriculum' && <CurriculumTab cohortId={cohortId} programId={programId} />}
        {activeTab === 'People'     && <PeopleTab     cohortId={cohortId} />}
        {activeTab === 'Reviews'    && <ReviewsTab    cohortId={cohortId} />}
      </div>
    </div>
  )
}
