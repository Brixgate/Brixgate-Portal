'use client'

import { useState, useEffect, useCallback } from 'react'
import { File01Icon } from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'

interface Enrollment {
  id: number
  user?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  enrollment_type?: string; enrollmentType?: string
  seats_purchased?: number; seatsPurchased?: number
  status?: string
  completion_status?: string; completionStatus?: string
  created_at?: string; createdAt?: string
  pricing_plan?: { title?: string }; pricingPlan?: { title?: string }
  cohort?: { title?: string }
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const STATUSES = ['', 'APPLIED', 'ENROLLED', 'CANCELLED', 'DROPPED', 'REFUNDED']
const COMP_STATUSES = ['', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']

function userName(u?: Enrollment['user']): string {
  if (!u) return '—'
  if (u.name) return u.name
  return `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim() || u.email
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLE: Record<string, string> = {
  ENROLLED:  'bg-[#ecfdf3] text-[#027a48]', APPLIED: 'bg-[#fffbeb] text-[#b45309]',
  CANCELLED: 'bg-[#fef2f2] text-[#d51520]', DROPPED: 'bg-[#f3f4f6] text-[#6b7280]',
  REFUNDED:  'bg-[#f5f3ff] text-[#7c3aed]',
}
const COMP_STYLE: Record<string, string> = {
  COMPLETED: 'bg-[#ecfdf3] text-[#027a48]', IN_PROGRESS: 'bg-[#eff6ff] text-[#1d4ed8]',
  NOT_STARTED: 'bg-[#f3f4f6] text-[#6b7280]',
}

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments]   = useState<Enrollment[]>([])
  const [pagination, setPagination]     = useState<Pagination | null>(null)
  const [page, setPage]                 = useState(1)
  const [status, setStatus]             = useState('')
  const [compStatus, setCompStatus]     = useState('')
  const [loading, setLoading]           = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (status) p.set('status', status)
      if (compStatus) p.set('completion_status', compStatus)
      const res  = await apiClient.get(`/admin/cohort-enrollments?${p}`)
      const data = unwrap<{ enrollments?: Enrollment[]; pagination?: Pagination }>(res.data)
      setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setEnrollments([]) } finally { setLoading(false) }
  }, [page, status, compStatus])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Enrollments</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
            {pagination ? `${(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0).toLocaleString()} total enrollments` : 'All cohort enrollments'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] outline-none focus:border-[#d51520] bg-white">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select value={compStatus} onChange={e => { setCompStatus(e.target.value); setPage(1) }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] outline-none focus:border-[#d51520] bg-white">
          {COMP_STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Completion'}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['User', 'Cohort', 'Type', 'Seats', 'Plan', 'Status', 'Completion', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: j === 0 ? 140 : 80 }} /></td>
                  ))}
                </tr>
              )) : enrollments.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <File01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No enrollments found</p>
                </td></tr>
              ) : enrollments.map(e => {
                const type = e.enrollmentType ?? e.enrollment_type ?? '—'
                const seats = e.seatsPurchased ?? e.seats_purchased ?? '—'
                const comp  = e.completionStatus ?? e.completion_status ?? 'NOT_STARTED'
                const plan  = e.pricingPlan?.title ?? e.pricing_plan?.title ?? '—'
                return (
                  <tr key={e.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                    <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{userName(e.user)}</p></td>
                    <td className="px-4 py-3.5"><p className="text-[12px] text-[#6b7280] font-body truncate max-w-[160px]">{e.cohort?.title ?? '—'}</p></td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-[#374151] font-body">{type}</span></td>
                    <td className="px-4 py-3.5 text-right"><span className="text-[12px] font-medium text-[#111827] font-body">{seats}</span></td>
                    <td className="px-4 py-3.5"><p className="text-[12px] text-[#6b7280] font-body truncate max-w-[120px]">{plan}</p></td>
                    <td className="px-4 py-3.5">
                      {e.status && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[e.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>{e.status}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${COMP_STYLE[comp] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {comp.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><p className="text-[12px] text-[#9ca3af] font-body">{formatDate(e.createdAt ?? e.created_at)}</p></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">
              {(() => { const t = pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0; return `Showing ${((page-1)*20)+1}–${Math.min(page*20, t)} of ${t.toLocaleString()}` })()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
