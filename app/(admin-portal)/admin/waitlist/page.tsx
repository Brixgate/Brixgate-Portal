'use client'

import { useState, useEffect, useCallback } from 'react'
import { Queue01Icon, Search01Icon, Download01Icon, RefreshIcon, Loading01Icon, AlertCircleIcon, UserGroup02Icon } from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ──────────────────────────────────────────────────────────────────────
interface WaitlistEntry {
  id: number
  name?: string
  firstName?: string; first_name?: string
  lastName?: string;  last_name?: string
  email: string
  phone?: string
  programme?: string; program?: string
  source?: string
  status?: string
  createdAt?: string; created_at?: string
  notes?: string
}

interface Pagination {
  totalElements?: number; total_elements?: number; total?: number
  totalPages?: number;    total_pages?: number
  hasNext?: boolean;      has_next?: boolean
  currentPage?: number;   current_page?: number; page?: number
}

function entryName(e: WaitlistEntry): string {
  if (e.name) return e.name
  const f = e.firstName ?? e.first_name ?? ''
  const l = e.lastName  ?? e.last_name  ?? ''
  return `${f} ${l}`.trim() || e.email
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string) {
  if (!name || name === '—') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// ── CSV export ─────────────────────────────────────────────────────────────────
function downloadCSV(rows: WaitlistEntry[]) {
  const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`
  const lines = [
    ['Name', 'Email', 'Phone', 'Programme', 'Source', 'Status', 'Date Joined'].join(','),
    ...rows.map(e => [
      esc(entryName(e)),
      esc(e.email),
      esc(e.phone ?? ''),
      esc(e.programme ?? e.program ?? ''),
      esc(e.source ?? ''),
      esc(e.status ?? ''),
      esc(formatDate(e.createdAt ?? e.created_at)),
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `brixgate-waitlist-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toUpperCase()
  const variants: Record<string, string> = {
    PENDING:   'bg-amber-50  text-amber-700  border border-amber-200',
    INVITED:   'bg-blue-50   text-blue-700   border border-blue-200',
    ENROLLED:  'bg-green-50  text-green-700  border border-green-200',
    DECLINED:  'bg-gray-100  text-gray-500   border border-gray-200',
  }
  const cls = variants[s] ?? 'bg-gray-100 text-gray-500 border border-gray-200'
  const label = s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Unknown'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminWaitlistPage() {
  const [entries, setEntries]       = useState<WaitlistEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [exporting, setExporting]   = useState(false)
  const [endpointReady, setEndpointReady] = useState(true)

  const load = useCallback(async (pg = 1, q = search) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(pg), size: '20' })
      if (q.trim()) params.set('search', q.trim())
      const res  = await apiClient.get(`/admin/waitlist?${params}`)
      const data = unwrap<{ entries?: WaitlistEntry[]; waitlist?: WaitlistEntry[]; content?: WaitlistEntry[]; pagination?: Pagination } | WaitlistEntry[]>(res.data)
      const list: WaitlistEntry[] = Array.isArray(data)
        ? data
        : ((data as { entries?: WaitlistEntry[]; waitlist?: WaitlistEntry[]; content?: WaitlistEntry[] })?.entries
           ?? (data as { entries?: WaitlistEntry[]; waitlist?: WaitlistEntry[]; content?: WaitlistEntry[] })?.waitlist
           ?? (data as { entries?: WaitlistEntry[]; waitlist?: WaitlistEntry[]; content?: WaitlistEntry[] })?.content
           ?? [])
      const pag: Pagination | null = Array.isArray(data) ? null : (data as { pagination?: Pagination })?.pagination ?? null
      setEntries(list)
      setPagination(pag)
      setPage(pg)
    } catch (err) {
      const msg = getApiError(err)
      // 404 / 405 = endpoint not yet implemented
      if (msg.includes('404') || msg.includes('405') || msg.includes('not found') || msg.toLowerCase().includes('method')) {
        setEndpointReady(false)
      } else {
        setError(msg)
      }
    } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load(1, search)
  }

  async function handleExport() {
    setExporting(true)
    try {
      // Fetch all pages for export
      const all: WaitlistEntry[] = []
      let pg = 1
      while (true) {
        const params = new URLSearchParams({ page: String(pg), size: '100' })
        const res  = await apiClient.get(`/admin/waitlist?${params}`)
        const data = unwrap<{ entries?: WaitlistEntry[]; waitlist?: WaitlistEntry[]; content?: WaitlistEntry[]; pagination?: Pagination } | WaitlistEntry[]>(res.data)
        const batch: WaitlistEntry[] = Array.isArray(data)
          ? data
          : ((data as { entries?: WaitlistEntry[] })?.entries
             ?? (data as { waitlist?: WaitlistEntry[] })?.waitlist
             ?? (data as { content?: WaitlistEntry[] })?.content
             ?? [])
        all.push(...batch)
        const pag = Array.isArray(data) ? null : (data as { pagination?: Pagination })?.pagination ?? null
        if (!pag?.hasNext && !pag?.has_next || batch.length === 0) break
        pg++
      }
      downloadCSV(all)
    } catch { /* silently fail */ } finally { setExporting(false) }
  }

  const total = pagination?.totalElements ?? pagination?.total_elements ?? pagination?.total ?? entries.length
  const totalPages = pagination?.totalPages ?? pagination?.total_pages ?? 1

  // ── Endpoint not yet live ──────────────────────────────────────────────────
  if (!endpointReady) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
          <Queue01Icon size={26} color="#9ca3af" strokeWidth={1.5} />
        </div>
        <h2 className="text-[18px] font-bold text-[#111827] font-display mb-2">Waitlist endpoint coming soon</h2>
        <p className="text-[14px] text-[#6b7280] font-body text-center max-w-[360px]">
          The backend GET&nbsp;/waitlist endpoint is not yet available. Once the dev team deploys it, this page will automatically show all waitlist entries.
        </p>
      </div>
    )
  }

  return (
    <div className="p-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Queue01Icon size={20} color="#d51520" strokeWidth={1.5} />
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-[32px]">Waitlist</h1>
          </div>
          <p className="text-[14px] text-[#6b7280] font-body">
            People who signed up on the Brixgate website before enrolling
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="h-9 px-3 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshIcon size={13} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || entries.length === 0}
            className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {exporting
              ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />
              : <Download01Icon size={13} strokeWidth={1.5} />
            }
            Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative w-[360px]">
          <Search01Icon size={15} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-9 pl-9 pr-4 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white"
          />
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 text-[13px] text-[#d51520] font-body bg-[#fef2f2] border border-[#fecdca] rounded-[8px] px-4 py-3">
          <AlertCircleIcon size={15} color="#d51520" strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#f3f4f6]">
          <h3 className="text-[15px] font-semibold text-[#111827] font-display">
            Waitlist entries
            {!loading && total > 0 && (
              <span className="ml-2 text-[12px] font-medium text-[#6b7280]">({total.toLocaleString()})</span>
            )}
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb]">
                {['Name', 'Email', 'Programme', 'Source', 'Status', 'Date Joined'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b7280] font-display whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#f3f4f6]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-[#f3f4f6] rounded animate-pulse" style={{ width: `${60 + (j * 7) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                        <UserGroup02Icon size={24} color="#9ca3af" strokeWidth={1.5} />
                      </div>
                      <p className="text-[15px] font-semibold text-[#111827] font-display mb-1">No waitlist entries</p>
                      <p className="text-[13px] text-[#6b7280] font-body max-w-[280px]">
                        {search ? 'No results match your search. Try a different name or email.' : 'No one has joined the waitlist yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map(e => {
                  const name = entryName(e)
                  return (
                    <tr key={e.id} className="border-t border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-[#d51520] font-display">{getInitials(name)}</span>
                          </div>
                          <span className="text-[13px] font-medium text-[#111827] font-body whitespace-nowrap">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#374151] font-body">{e.email}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#374151] font-body">{e.programme ?? e.program ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[12px] text-[#6b7280] font-body capitalize">{e.source ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#6b7280] font-body whitespace-nowrap">
                          {formatDate(e.createdAt ?? e.created_at)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#f3f4f6] flex items-center justify-between">
            <p className="text-[13px] text-[#6b7280] font-body">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total.toLocaleString()} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 text-[13px] text-[#374151] font-body">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages}
                className="h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
