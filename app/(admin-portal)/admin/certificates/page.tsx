'use client'

import { useState, useEffect, useCallback } from 'react'
import { Award01Icon } from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'

interface Certificate {
  id: number
  status?: string
  issued_at?: string; issuedAt?: string
  created_at?: string; createdAt?: string
  user?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  program?: { id?: number; title?: string; slug?: string }
  cohort?: { id?: number; title?: string }
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const STATUSES = ['', 'PENDING', 'ISSUED', 'REVOKED']
const STATUS_STYLE: Record<string, string> = {
  ISSUED: 'bg-[#ecfdf3] text-[#027a48]', PENDING: 'bg-[#fffbeb] text-[#b45309]', REVOKED: 'bg-[#fef2f2] text-[#d51520]',
}

function userName(u?: Certificate['user']): string {
  if (!u) return '—'
  if (u.name) return u.name
  return `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim() || u.email
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminCertificatesPage() {
  const [certs, setCerts]           = useState<Certificate[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [status, setStatus]         = useState('')
  const [loading, setLoading]       = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (status) p.set('status', status)
      const res  = await apiClient.get(`/admin/user-certificates?${p}`)
      const data = unwrap<{ certificates?: Certificate[]; userCertificates?: Certificate[]; pagination?: Pagination }>(res.data)
      const list = data?.certificates ?? data?.userCertificates ?? []
      setCerts(Array.isArray(list) ? list : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setCerts([]) } finally { setLoading(false) }
  }, [page, status])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Certificates</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
            {pagination ? `${(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0).toLocaleString()} certificates` : 'All user certificates'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Student', 'Email', 'Programme', 'Cohort', 'Status', 'Issued'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[140, 180, 160, 140, 80, 100].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : certs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <Award01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No certificates found</p>
                </td></tr>
              ) : certs.map(c => (
                <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                  <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{userName(c.user)}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#6b7280] font-body">{c.user?.email ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[13px] text-[#374151] font-body">{c.program?.title ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#6b7280] font-body">{c.cohort?.title ?? '—'}</p></td>
                  <td className="px-4 py-3.5">
                    {c.status && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[c.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {c.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#9ca3af] font-body">{formatDate(c.issuedAt ?? c.issued_at ?? c.createdAt ?? c.created_at)}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">Page {page} of {pagination.totalPages ?? pagination.total_pages ?? 1}</p>
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
