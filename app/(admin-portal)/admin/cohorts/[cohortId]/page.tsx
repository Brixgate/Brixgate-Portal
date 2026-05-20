'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, UserGroup02Icon,
  File01Icon, StarIcon, BookOpen01Icon, CheckmarkCircle01Icon,
  CircleIcon,
} from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cohort { id: number; title: string; status?: string; start_date?: string; end_date?: string; max_students?: number }
interface Member { id: number; user?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }; role?: string; status?: string; membershipStatus?: string; membership_status?: string }
interface Enrollment { id: number; user?: { name?: string; email: string }; enrollment_type?: string; enrollmentType?: string; seats_purchased?: number; seatsPurchased?: number; status?: string; completion_status?: string; completionStatus?: string }
interface Review { id: number; user?: { name?: string; email: string }; rating?: number; comment?: string; is_anonymous?: boolean; created_at?: string }
interface CohortModule { id: number; program_module_id?: number; programModuleId?: number; title?: string }

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
            const type = e.enrollmentType ?? e.enrollment_type ?? '—'
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
              <td className="px-4 py-3.5">
                <p className="text-[13px] font-medium text-[#111827] font-body">
                  {r.is_anonymous ? 'Anonymous' : userName(r.user)}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={13} color={i < (r.rating ?? 0) ? '#d97706' : '#e5e7eb'} strokeWidth={1.5} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3.5 max-w-[300px]">
                <p className="text-[12px] text-[#6b7280] font-body line-clamp-2">{r.comment ?? '—'}</p>
              </td>
              <td className="px-4 py-3.5"><p className="text-[12px] text-[#9ca3af] font-body">{formatDate(r.created_at)}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab: Curriculum ───────────────────────────────────────────────────────────
function CurriculumTab({ cohortId }: { cohortId: string }) {
  const [cohortModules, setCohortModules] = useState<CohortModule[]>([])
  const [loading, setLoading]             = useState(true)
  const [removing, setRemoving]           = useState<number | null>(null)

  const fetchCurriculum = useCallback(() => {
    apiClient.get(`/admin/cohorts/${cohortId}/modules`).then(res => {
      const data = unwrap<{ modules?: CohortModule[] } | CohortModule[]>(res.data)
      const list = Array.isArray(data) ? data : (data as { modules?: CohortModule[] })?.modules ?? []
      setCohortModules(list)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  useEffect(() => { fetchCurriculum() }, [fetchCurriculum])

  async function removeModule(cohortModuleId: number) {
    setRemoving(cohortModuleId)
    try {
      await apiClient.delete(`/admin/cohorts/${cohortId}/modules/${cohortModuleId}`)
      fetchCurriculum()
    } catch { /* silent */ } finally { setRemoving(null) }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} /></div>

  return (
    <div className="p-6">
      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] px-4 py-3 mb-5 flex items-start gap-2">
        <BookOpen01Icon size={14} color="#b45309" strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-[#b45309] font-body">
          To add modules to this cohort, go to <strong>Programmes → Select programme → Assign to cohort</strong>. Here you can only remove modules.
        </p>
      </div>

      {cohortModules.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen01Icon size={32} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#111827] font-display">No curriculum assigned yet</p>
          <p className="text-[13px] text-[#9ca3af] font-body mt-1">Assign modules from the Programme page</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cohortModules.map(m => (
            <div key={m.id} className="flex items-center gap-3 bg-white border border-[#e5e7eb] rounded-[8px] px-4 py-3 hover:border-[#d1d5db] transition-colors">
              <CheckmarkCircle01Icon size={16} color="#027a48" strokeWidth={1.5} className="flex-shrink-0" />
              <span className="flex-1 text-[13px] font-medium text-[#111827] font-body">
                {m.title ?? `Module #${m.program_module_id ?? m.programModuleId}`}
              </span>
              <button
                onClick={() => removeModule(m.id)}
                disabled={removing === m.id}
                className="text-[11px] text-[#9ca3af] font-body hover:text-[#d51520] transition-colors flex items-center gap-1 flex-shrink-0">
                {removing === m.id
                  ? <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />
                  : <CircleIcon size={12} strokeWidth={1.5} />
                }
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = ['Curriculum', 'Members', 'Enrollments', 'Reviews'] as const
type Tab = typeof TABS[number]

export default function CohortDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const cohortId = params.cohortId as string

  const [cohort, setCohort]   = useState<Cohort | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Curriculum')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(`/admin/cohorts/${cohortId}`).then(res => {
      setCohort(unwrap<Cohort>(res.data))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  const STATUS_STYLE: Record<string, string> = {
    OPEN: 'bg-[#ecfdf3] text-[#027a48]', UPCOMING: 'bg-[#eff6ff] text-[#1d4ed8]', CLOSED: 'bg-[#f3f4f6] text-[#6b7280]',
  }

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
            </div>
          )
        }
        {cohort && (
          <div className="flex items-center gap-4 text-[12px] text-[#9ca3af] font-body ml-auto">
            <span>Start: {formatDate(cohort.start_date)}</span>
            <span>End: {formatDate(cohort.end_date)}</span>
            <span>Max: {cohort.max_students ?? '—'}</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 py-0 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#d51520] text-[#d51520]'
                : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}>
            {tab === 'Members' ? <UserGroup02Icon size={14} strokeWidth={1.5} className="inline mr-1.5" /> : null}
            {tab === 'Enrollments' ? <File01Icon size={14} strokeWidth={1.5} className="inline mr-1.5" /> : null}
            {tab === 'Reviews' ? <StarIcon size={14} strokeWidth={1.5} className="inline mr-1.5" /> : null}
            {tab === 'Curriculum' ? <BookOpen01Icon size={14} strokeWidth={1.5} className="inline mr-1.5" /> : null}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeTab === 'Curriculum'  && <CurriculumTab  cohortId={cohortId} />}
        {activeTab === 'Members'     && <MembersTab     cohortId={cohortId} />}
        {activeTab === 'Enrollments' && <EnrollmentsTab cohortId={cohortId} />}
        {activeTab === 'Reviews'     && <ReviewsTab     cohortId={cohortId} />}
      </div>
    </div>
  )
}
