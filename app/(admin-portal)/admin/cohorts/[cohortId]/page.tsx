'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, UserGroup02Icon,
  File01Icon, StarIcon, BookOpen01Icon, CheckmarkCircle01Icon,
  CircleIcon, AlertCircleIcon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cohort {
  id: number; title: string; status?: string
  start_date?: string; end_date?: string; max_students?: number
  program_id?: number; programId?: number
  program?: { id: number; title: string }
}
interface ProgramModule { id: number; title: string; description?: string; order_index?: number }
interface CohortModule  { id: number; program_module_id?: number; programModuleId?: number; title?: string }
interface Member { id: number; user?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }; role?: string; membershipStatus?: string; membership_status?: string }
interface Enrollment { id: number; user?: { name?: string; email: string }; enrollment_type?: string; enrollmentType?: string; seats_purchased?: number; seatsPurchased?: number; status?: string; completion_status?: string; completionStatus?: string }
interface Review { id: number; user?: { name?: string; email: string }; rating?: number; comment?: string; is_anonymous?: boolean; created_at?: string }

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

// ── Tab: Curriculum (checkbox module selection) ───────────────────────────────
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

      let progMods: ProgramModule[] = []
      if (progModRes.status === 'fulfilled') {
        const d = unwrap<{ modules?: ProgramModule[] } | ProgramModule[]>(progModRes.value.data)
        progMods = Array.isArray(d) ? d : (d as { modules?: ProgramModule[] })?.modules ?? []
        setAllModules(progMods)
      }

      if (cohortModRes.status === 'fulfilled') {
        const d = unwrap<{ modules?: CohortModule[] } | CohortModule[]>(cohortModRes.value.data)
        const cohortMods: CohortModule[] = Array.isArray(d) ? d : (d as { modules?: CohortModule[] })?.modules ?? []
        setCohortModules(cohortMods)
        // Pre-tick modules already assigned
        const assignedIds = new Set(cohortMods.map(m => m.program_module_id ?? m.programModuleId ?? 0))
        setSelected(assignedIds)
      }
    } finally { setLoading(false) }
  }, [cohortId, programId])

  useEffect(() => { load() }, [load])

  function toggle(moduleId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  async function saveCurriculum() {
    setSaving(true); setError(''); setSuccess(false)
    try {
      // Try bulk replace-set endpoint first
      await apiClient.post(`/admin/cohorts/${cohortId}/modules`, {
        module_ids: allModules.filter(m => selected.has(m.id)).map(m => m.id),
      })
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
      load()
    } catch (err) {
      // Fallback: diff and make individual calls
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
      } catch (fallbackErr) { setError(getApiError(fallbackErr)) }
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f3f4f6]">
          <div className="w-5 h-5 rounded bg-[#f3f4f6] animate-pulse flex-shrink-0" />
          <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: 180 + i * 20 }} />
        </div>
      ))}
    </div>
  )

  if (!programId) return (
    <div className="p-6 text-center py-16">
      <BookOpen01Icon size={32} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-3" />
      <p className="text-[14px] font-semibold text-[#111827] font-display">No programme linked</p>
      <p className="text-[13px] text-[#9ca3af] font-body mt-1">This cohort has no programme associated</p>
    </div>
  )

  if (allModules.length === 0) return (
    <div className="p-6 text-center py-16">
      <BookOpen01Icon size={32} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-3" />
      <p className="text-[14px] font-semibold text-[#111827] font-display">No modules in programme</p>
      <p className="text-[13px] text-[#9ca3af] font-body mt-1">Add modules to the programme first, then assign them here</p>
    </div>
  )

  const hasChanges = (() => {
    const currentIds = new Set(cohortModules.map(m => m.program_module_id ?? m.programModuleId ?? 0))
    if (currentIds.size !== selected.size) return true
    return allModules.some(m => selected.has(m.id) !== currentIds.has(m.id))
  })()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] font-semibold text-[#111827] font-display">
            {selected.size} of {allModules.length} modules selected
          </p>
          <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
            Tick the modules students in this cohort will see
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={12} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#027a48] font-body">
              <CheckmarkCircle01Icon size={12} color="#027a48" strokeWidth={1.5} /> Saved
            </p>
          )}
          <button
            onClick={saveCurriculum}
            disabled={saving || !hasChanges}
            className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center gap-2 transition-colors">
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Save Curriculum
          </button>
        </div>
      </div>

      {/* Module checklist */}
      <div className="flex flex-col gap-2">
        {allModules.map(m => {
          const checked = selected.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`flex items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left transition-all ${
                checked
                  ? 'border-[#d51520] bg-[#fef2f2]'
                  : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
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
                  <p className="text-[12px] text-[#9ca3af] font-body mt-0.5 truncate">{m.description}</p>
                )}
              </div>
              {checked
                ? <CheckmarkCircle01Icon size={16} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                : <CircleIcon size={16} color="#d1d5db" strokeWidth={1.5} className="flex-shrink-0" />
              }
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab: Members ──────────────────────────────────────────────────────────────
function MembersTab({ cohortId }: { cohortId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(`/admin/cohorts/${cohortId}/members?size=50`).then(res => {
      const data = unwrap<{ members?: Member[] }>(res.data)
      setMembers(Array.isArray(data?.members) ? data.members : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  const ROLE_STYLE: Record<string, string> = {
    STUDENT: 'bg-[#ecfdf3] text-[#027a48]', INSTRUCTOR: 'bg-[#eff6ff] text-[#1d4ed8]', ADMIN: 'bg-[#fef2f2] text-[#d51520]',
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} /></div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
            {['Member', 'Email', 'Role', 'Status'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-12 text-center text-[13px] text-[#9ca3af] font-body">No members yet</td></tr>
          ) : members.map(m => (
            <tr key={m.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
              <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{userName(m.user)}</p></td>
              <td className="px-4 py-3.5"><p className="text-[12px] text-[#6b7280] font-body">{m.user?.email ?? '—'}</p></td>
              <td className="px-4 py-3.5">
                {m.role ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${ROLE_STYLE[m.role] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>{m.role}</span> : '—'}
              </td>
              <td className="px-4 py-3.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${(m.membershipStatus ?? m.membership_status) === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                  {m.membershipStatus ?? m.membership_status ?? 'Active'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab: Enrollments ──────────────────────────────────────────────────────────
function EnrollmentsTab({ cohortId }: { cohortId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    apiClient.get(`/admin/cohort-enrollments?cohort_id=${cohortId}&size=50`).then(res => {
      const data = unwrap<{ enrollments?: Enrollment[] }>(res.data)
      setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  if (loading) return <div className="flex items-center justify-center py-16"><Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} /></div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
            {['User', 'Type', 'Seats', 'Status', 'Completion'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {enrollments.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-12 text-center text-[13px] text-[#9ca3af] font-body">No enrollments yet</td></tr>
          ) : enrollments.map(e => {
            const type  = e.enrollmentType ?? e.enrollment_type ?? '—'
            const seats = e.seatsPurchased ?? e.seats_purchased ?? '—'
            const comp  = e.completionStatus ?? e.completion_status ?? 'NOT_STARTED'
            return (
              <tr key={e.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{userName(e.user)}</p></td>
                <td className="px-4 py-3.5"><span className="text-[12px] text-[#6b7280] font-body">{type}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-[13px] font-medium text-[#111827] font-body">{seats}</span></td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${e.status === 'ENROLLED' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                    {e.status ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${comp === 'COMPLETED' ? 'bg-[#ecfdf3] text-[#027a48]' : comp === 'IN_PROGRESS' ? 'bg-[#eff6ff] text-[#1d4ed8]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                    {comp.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            )
          })}
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

  if (loading) return <div className="flex items-center justify-center py-16"><Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} /></div>

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
const TABS = ['Curriculum', 'Members', 'Enrollments', 'Reviews'] as const
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        <button onClick={() => router.push('/admin/cohorts')}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        {loading
          ? <div className="h-5 w-56 bg-[#f3f4f6] rounded animate-pulse" />
          : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="text-[16px] font-bold text-[#111827] font-display truncate">{cohort?.title ?? 'Cohort'}</h1>
              {cohort?.status && (
                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${STATUS_STYLE[cohort.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                  {cohort.status}
                </span>
              )}
              {cohort?.program && (
                <span className="text-[12px] text-[#9ca3af] font-body flex-shrink-0">
                  {cohort.program.title}
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
            {tab === 'Curriculum'  && <BookOpen01Icon   size={14} strokeWidth={1.5} />}
            {tab === 'Members'     && <UserGroup02Icon   size={14} strokeWidth={1.5} />}
            {tab === 'Enrollments' && <File01Icon        size={14} strokeWidth={1.5} />}
            {tab === 'Reviews'     && <StarIcon          size={14} strokeWidth={1.5} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeTab === 'Curriculum'  && <CurriculumTab  cohortId={cohortId} programId={programId} />}
        {activeTab === 'Members'     && <MembersTab     cohortId={cohortId} />}
        {activeTab === 'Enrollments' && <EnrollmentsTab cohortId={cohortId} />}
        {activeTab === 'Reviews'     && <ReviewsTab     cohortId={cohortId} />}
      </div>
    </div>
  )
}
