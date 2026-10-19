'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search01Icon, Download01Icon, RefreshIcon, Loading01Icon,
  AlertCircleIcon, UserGroup02Icon, Link01Icon, CheckmarkCircle01Icon,
  Payment01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Registration {
  id: number
  firstName?: string; first_name?: string
  lastName?: string;  last_name?: string
  name?: string
  email: string
  phone?: string
  programme?: string; program?: string
  accessFeeStatus?: string; access_fee_status?: string
  accessFeePageKey?: string; access_fee_page_key?: string
  paymentReference?: string; payment_reference?: string
  amountPaid?: number | string; amount_paid?: number | string
  currency?: string
  createdAt?: string; created_at?: string
}

interface Pagination {
  totalElements?: number; total_elements?: number; total?: number
  totalPages?: number;    total_pages?: number
  hasNext?: boolean;      has_next?: boolean
  currentPage?: number;   current_page?: number; page?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function regName(r: Registration): string {
  if (r.name) return r.name
  const f = r.firstName ?? r.first_name ?? ''
  const l = r.lastName  ?? r.last_name  ?? ''
  return `${f} ${l}`.trim() || r.email
}

function getInitials(name: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAmount(amount?: number | string, currency?: string) {
  if (amount === undefined || amount === null || amount === '') return '—'
  const sym: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£' }
  const sym2 = sym[currency?.toUpperCase() ?? ''] ?? ''
  return `${sym2}${Number(amount).toLocaleString('en-NG')}`
}

function accessFeeStatus(r: Registration) {
  return (r.accessFeeStatus ?? r.access_fee_status ?? '').toUpperCase()
}

function accessFeeKey(r: Registration) {
  return r.accessFeePageKey ?? r.access_fee_page_key ?? ''
}

function buildLink(key: string) {
  return key ? `https://brixgate.com/program-access?key=${key}` : ''
}

// ── Payment status badge ───────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  NOT_PAID:  { cls: 'bg-gray-100  text-gray-500  border border-gray-200',  label: 'Not paid'  },
  PENDING:   { cls: 'bg-amber-50  text-amber-700 border border-amber-200', label: 'Pending'   },
  SUCCESS:   { cls: 'bg-green-50  text-green-700 border border-green-200', label: 'Paid'      },
  FAILED:    { cls: 'bg-red-50    text-red-600   border border-red-200',   label: 'Failed'    },
  CANCELLED: { cls: 'bg-gray-100  text-gray-500  border border-gray-200',  label: 'Cancelled' },
  REFUNDED:  { cls: 'bg-blue-50   text-blue-600  border border-blue-200',  label: 'Refunded'  },
}

function PayStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { cls: 'bg-gray-100 text-gray-500 border border-gray-200', label: status || 'Unknown' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  )
}

// ── Copy-link cell button ─────────────────────────────────────────────────────
function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!link) return <span className="text-[12px] text-[#d0d5dd] font-body">—</span>

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 h-7 px-3 border border-[#e5e7eb] rounded-[6px] text-[11px] font-semibold font-display text-[#374151] hover:bg-[#f9fafb] hover:border-[#d51520] hover:text-[#d51520] transition-colors"
    >
      {copied
        ? <CheckmarkCircle01Icon size={12} strokeWidth={1.5} className="text-[#16a34a]" />
        : <Link01Icon size={12} strokeWidth={1.5} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────
function downloadCSV(rows: Registration[]) {
  const esc = (s: string) => `"${(s ?? '').toString().replace(/"/g, '""')}"`
  const lines = [
    ['Name', 'Email', 'Phone', 'Programme', 'Payment Status', 'Amount', 'Currency', 'Reference', 'Date'].join(','),
    ...rows.map(r => [
      esc(regName(r)),
      esc(r.email),
      esc(r.phone ?? ''),
      esc(r.programme ?? r.program ?? ''),
      esc(accessFeeStatus(r)),
      esc(String(r.amountPaid ?? r.amount_paid ?? '')),
      esc(r.currency ?? ''),
      esc(r.paymentReference ?? r.payment_reference ?? ''),
      esc(formatDate(r.createdAt ?? r.created_at)),
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `brixgate-registrations-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Filter chips ──────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { label: 'All',       value: '' },
  { label: 'Pending',   value: 'PENDING' },
  { label: 'Paid',      value: 'SUCCESS' },
  { label: 'Failed',    value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded',  value: 'REFUNDED' },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminRegistrationsPage() {
  const [entries, setEntries]             = useState<Registration[]>([])
  const [pagination, setPagination]       = useState<Pagination | null>(null)
  const [page, setPage]                   = useState(1)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [exporting, setExporting]         = useState(false)

  const load = useCallback(async (pg = 1, q = search, sf = statusFilter) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ source: 'ACCESS_FEE_PAGE', page: String(pg), size: '20' })
      if (q.trim())  params.set('search', q.trim())
      if (sf)        params.set('access_fee_status', sf)
      const res  = await apiClient.get(`/admin/waitlist?${params}`)
      const data = unwrap<{
        entries?: Registration[]; waitlist?: Registration[]; content?: Registration[]; data?: Registration[]
        pagination?: Pagination
      } | Registration[]>(res.data)
      const list: Registration[] = Array.isArray(data)
        ? data
        : ((data as { entries?: Registration[] })?.entries
           ?? (data as { waitlist?: Registration[] })?.waitlist
           ?? (data as { content?: Registration[] })?.content
           ?? (data as { data?: Registration[] })?.data
           ?? [])
      const pag: Pagination | null = Array.isArray(data) ? null
        : (data as { pagination?: Pagination })?.pagination ?? null
      setEntries(list)
      setPagination(pag)
      setPage(pg)
    } catch (err) {
      setError(getApiError(err))
    } finally { setLoading(false) }
  }, [search, statusFilter])

  useEffect(() => { load(1) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load(1, search, statusFilter)
  }

  function handleStatusFilter(val: string) {
    setStatusFilter(val)
    load(1, search, val)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all: Registration[] = []
      let pg = 1
      while (true) {
        const params = new URLSearchParams({ source: 'ACCESS_FEE_PAGE', page: String(pg), size: '100' })
        if (statusFilter) params.set('access_fee_status', statusFilter)
        const res  = await apiClient.get(`/admin/waitlist?${params}`)
        const data = unwrap<{ entries?: Registration[]; waitlist?: Registration[]; content?: Registration[]; data?: Registration[]; pagination?: Pagination } | Registration[]>(res.data)
        const batch: Registration[] = Array.isArray(data)
          ? data
          : ((data as { entries?: Registration[] })?.entries ?? (data as { waitlist?: Registration[] })?.waitlist ?? (data as { content?: Registration[] })?.content ?? (data as { data?: Registration[] })?.data ?? [])
        all.push(...batch)
        const pag = Array.isArray(data) ? null : (data as { pagination?: Pagination })?.pagination ?? null
        if ((!pag?.hasNext && !pag?.has_next) || batch.length === 0) break
        pg++
      }
      downloadCSV(all)
    } catch { /* silently fail */ } finally { setExporting(false) }
  }

  const total      = pagination?.totalElements ?? pagination?.total_elements ?? pagination?.total ?? entries.length
  const totalPages = pagination?.totalPages ?? pagination?.total_pages ?? 1

  // Rows that should show "Copy link" — payment not finalised
  function showCopyLink(r: Registration) {
    const s = accessFeeStatus(r)
    return s === 'PENDING' || s === 'FAILED' || s === 'CANCELLED' || s === 'NOT_PAID'
  }

  return (
    <div className="p-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] font-display">Registrations</h1>
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">
            Prospects who paid the access fee to join a programme
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
              : <Download01Icon size={13} strokeWidth={1.5} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <form onSubmit={handleSearch}>
          <div className="relative w-[300px]">
            <Search01Icon size={15} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full h-9 pl-9 pr-4 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white"
            />
          </div>
        </form>

        {/* Status filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleStatusFilter(f.value)}
              className={`h-8 px-4 rounded-full text-[12px] font-medium font-display transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#d51520] text-white'
                  : 'bg-white border border-[#e5e7eb] text-[#4b5563] hover:bg-[#f9fafb]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 text-[13px] text-[#d51520] font-body bg-[#fef2f2] border border-[#fecdca] rounded-[8px] px-4 py-3">
          <AlertCircleIcon size={15} color="#d51520" strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
        {/* Card header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2">
            <Payment01Icon size={16} strokeWidth={1.5} color="#9ca3af" />
            <h3 className="text-[15px] font-semibold text-[#111827] font-display">
              Access fee registrations
              {!loading && total > 0 && (
                <span className="ml-2 text-[12px] font-medium text-[#6b7280]">({total.toLocaleString()})</span>
              )}
            </h3>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb]">
                {['Name', 'Email', 'Programme', 'Payment Status', 'Amount', 'Date', 'Action'].map(h => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b7280] font-display whitespace-nowrap ${h === 'Amount' || h === 'Action' ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#f3f4f6]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-[#f3f4f6] rounded animate-pulse" style={{ width: `${55 + (j * 9) % 35}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 px-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                        <UserGroup02Icon size={24} color="#9ca3af" strokeWidth={1.5} />
                      </div>
                      <p className="text-[15px] font-semibold text-[#111827] font-display mb-1">No registrations yet</p>
                      <p className="text-[13px] text-[#6b7280] font-body max-w-[300px]">
                        {search
                          ? 'No results match your search. Try a different name or email.'
                          : statusFilter
                          ? 'No registrations with this payment status.'
                          : 'No access fee registrations yet. Enable access fee on a programme and share the link.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map(r => {
                  const name   = regName(r)
                  const status = accessFeeStatus(r)
                  const key    = accessFeeKey(r)
                  const link   = buildLink(key)
                  const isSucceeded = status === 'SUCCESS'

                  return (
                    <tr key={r.id} className={`border-t border-[#f3f4f6] transition-colors ${isSucceeded ? 'bg-[#f0fdf4] hover:bg-[#ecfdf3]' : 'hover:bg-[#f9fafb]'}`}>
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isSucceeded ? 'bg-[#dcfce7]' : 'bg-[#fef2f2]'}`}>
                            <span className={`text-[10px] font-bold font-display ${isSucceeded ? 'text-[#16a34a]' : 'text-[#d51520]'}`}>
                              {getInitials(name)}
                            </span>
                          </div>
                          <span className="text-[13px] font-medium text-[#111827] font-body whitespace-nowrap">{name}</span>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#374151] font-body">{r.email}</span>
                      </td>
                      {/* Programme */}
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#374151] font-body">{r.programme ?? r.program ?? '—'}</span>
                      </td>
                      {/* Payment status */}
                      <td className="px-4 py-3.5">
                        <PayStatusBadge status={status} />
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-[13px] text-[#374151] font-body font-medium tabular-nums">
                          {fmtAmount(r.amountPaid ?? r.amount_paid, r.currency)}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#6b7280] font-body whitespace-nowrap">
                          {formatDate(r.createdAt ?? r.created_at)}
                        </span>
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        {showCopyLink(r)
                          ? <CopyLinkButton link={link} />
                          : <span className="text-[12px] text-[#d0d5dd] font-body">—</span>}
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
