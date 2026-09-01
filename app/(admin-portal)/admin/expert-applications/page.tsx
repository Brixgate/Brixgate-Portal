'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserSearch01Icon, ArrowRight01Icon } from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'

interface Application {
  id: number
  status?: string
  created_at?: string; createdAt?: string
  user?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  full_name?: string; fullName?: string
  email?: string
  expertise?: string
  years_of_experience?: number; yearsOfExperience?: number
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const STATUSES = ['', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ONBOARDED', 'ACTIVE', 'SUSPENDED']
const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:    'bg-[#fffbeb] text-[#b45309]',
  UNDER_REVIEW: 'bg-[#eff6ff] text-[#1d4ed8]',
  APPROVED:     'bg-[#ecfdf3] text-[#027a48]',
  REJECTED:     'bg-[#fef2f2] text-[#d51520]',
  ONBOARDED:    'bg-[#f0fdf4] text-[#15803d]',
  ACTIVE:       'bg-[#ecfdf3] text-[#027a48]',
  SUSPENDED:    'bg-[#f3f4f6] text-[#4b5563]',
}

function applicantName(a: Application): string {
  if (a.fullName ?? a.full_name) return (a.fullName ?? a.full_name)!
  if (a.user?.name) return a.user.name
  const f = a.user?.firstName ?? a.user?.first_name ?? ''
  const l = a.user?.lastName  ?? a.user?.last_name  ?? ''
  return `${f} ${l}`.trim() || (a.email ?? a.user?.email ?? '—')
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminExpertApplicationsPage() {
  const router = useRouter()
  const [apps, setApps]             = useState<Application[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [status, setStatus]         = useState('')
  const [loading, setLoading]       = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (status) p.set('status', status)
      const res  = await apiClient.get(`/admin/expert-applications?${p}`)
      const data = unwrap<{ applications?: Application[]; expertApplications?: Application[]; pagination?: Pagination }>(res.data)
      const list = data?.applications ?? data?.expertApplications ?? []
      setApps(Array.isArray(list) ? list : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setApps([]) } finally { setLoading(false) }
  }, [page, status])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="p-8">
      {/* Status filter dropdown */}
      <div className="flex items-center gap-2 mb-6">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-9 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 min-w-[180px]">
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Applicant', 'Email', 'Expertise', 'Status', 'Applied', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[160, 180, 120, 90, 100, 30].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : apps.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <UserSearch01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No applications found</p>
                </td></tr>
              ) : apps.map(a => (
                <tr key={a.id} onClick={() => router.push(`/admin/expert-applications/${a.id}`)}
                  className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer">
                  <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{applicantName(a)}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{a.email ?? a.user?.email ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body truncate max-w-[140px]">{a.expertise ?? '—'}</p></td>
                  <td className="px-4 py-3.5">
                    {a.status && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${STATUS_STYLE[a.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(a.createdAt ?? a.created_at)}</p></td>
                  <td className="px-4 py-3.5 text-right"><ArrowRight01Icon size={15} color="#4b5563" strokeWidth={1.5} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">Page {page} of {pagination.totalPages ?? pagination.total_pages ?? 1}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
