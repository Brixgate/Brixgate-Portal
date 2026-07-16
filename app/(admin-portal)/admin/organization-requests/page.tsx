'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building01Icon, ArrowRight01Icon } from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'

interface OrgRequest {
  id: number; status?: string
  organization_name?: string; organizationName?: string
  contact_name?: string; contactName?: string
  contact_email?: string; contactEmail?: string
  program_interest?: string; programInterest?: string
  team_size?: number; teamSize?: number
  created_at?: string; createdAt?: string
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const STATUSES = ['', 'SUBMITTED', 'CONTACTED', 'IN_DISCUSSION', 'PROPOSAL_SENT', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'ONBOARDED', 'CLOSED']
const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:     'bg-[#fffbeb] text-[#b45309]', CONTACTED:     'bg-[#eff6ff] text-[#1d4ed8]',
  IN_DISCUSSION: 'bg-[#f0f9ff] text-[#0369a1]', PROPOSAL_SENT: 'bg-[#f5f3ff] text-[#7c3aed]',
  NEGOTIATING:   'bg-[#fff7ed] text-[#c2410c]', APPROVED:      'bg-[#ecfdf3] text-[#027a48]',
  REJECTED:      'bg-[#fef2f2] text-[#d51520]', ONBOARDED:     'bg-[#f0fdf4] text-[#15803d]',
  CLOSED:        'bg-[#f3f4f6] text-[#4b5563]',
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminOrgRequestsPage() {
  const router = useRouter()
  const [requests, setRequests]       = useState<OrgRequest[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  const [page, setPage]               = useState(1)
  const [status, setStatus]           = useState('')
  const [loading, setLoading]         = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (status) p.set('status', status)
      const res  = await apiClient.get(`/admin/organization-requests?${p}`)
      const data = unwrap<{ requests?: OrgRequest[]; organizationRequests?: OrgRequest[]; pagination?: Pagination }>(res.data)
      const list = data?.requests ?? data?.organizationRequests ?? []
      setRequests(Array.isArray(list) ? list : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setRequests([]) } finally { setLoading(false) }
  }, [page, status])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Organisation Requests</h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-0.5">
            {pagination ? `${(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0).toLocaleString()} requests` : 'Enterprise enquiries'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[{ v: '', l: 'All' }, ...STATUSES.filter(Boolean).map(s => ({ v: s, l: s.replace('_', ' ') }))].map(({ v, l }) => (
          <button key={v} onClick={() => { setStatus(v); setPage(1) }}
            className={`px-3 h-7 rounded-full text-[11px] font-semibold font-display transition-all ${
              status === v ? 'bg-[#d51520] text-white' : 'bg-white border border-[#e5e7eb] text-[#4b5563] hover:text-[#374151]'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Organisation', 'Contact', 'Email', 'Programme Interest', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[160, 120, 160, 140, 100, 100, 30].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Building01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No requests found</p>
                </td></tr>
              ) : requests.map(r => (
                <tr key={r.id} onClick={() => router.push(`/admin/organization-requests/${r.id}`)}
                  className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer">
                  <td className="px-4 py-3.5"><p className="text-[13px] font-semibold text-[#111827] font-display">{r.organizationName ?? r.organization_name ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[13px] text-[#374151] font-body">{r.contactName ?? r.contact_name ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{r.contactEmail ?? r.contact_email ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body truncate max-w-[140px]">{r.programInterest ?? r.program_interest ?? '—'}</p></td>
                  <td className="px-4 py-3.5">
                    {r.status && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${STATUS_STYLE[r.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(r.createdAt ?? r.created_at)}</p></td>
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
