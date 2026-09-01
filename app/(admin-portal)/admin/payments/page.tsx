'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Invoice01Icon, Cancel01Icon, Copy01Icon, RefreshIcon, ArrowDown01Icon, Loading01Icon, LinkSquare01Icon } from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import AdminPageLoader from '@/components/admin/AdminPageLoader'

// ── Shared types ──────────────────────────────────────────────────────────────
interface Payment {
  id: number
  user?: AnyUser & { id?: number }
  amount_paid?: number
  payable_amount?: number; payableAmount?: number; amount?: number
  currency_paid?: string; currency?: string; payable_currency?: string; payableCurrency?: string
  payment_status?: string; paymentStatus?: string; status?: string
  payment_reference?: string; paymentReference?: string
  brixgate_reference?: string; brixgateReference?: string
  payment_type?: string; paymentType?: string
  coupon?: { code?: string; discount?: number }
  created_at?: string; createdAt?: string
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

interface PaymentIntent {
  id: number
  user?: AnyUser & { id?: number }
  total_amount?: number
  original_amount?: number
  discount_amount?: number
  currency?: string
  status?: string
  payment_type?: string; paymentType?: string
  payment_mode?: string
  installment_role?: string
  provider?: string
  brixgate_reference?: string
  provider_reference?: string
  authorization_url?: string
  coupon_value?: number
  coupon?: { code?: string; discount?: number; discount_type?: string }
  program?: { id?: number; title?: string; slug?: string }
  cohort?: { id?: number; name?: string; title?: string }
  created_at?: string
  updated_at?: string
  expires_at?: string
}

interface Program { id: number; title: string }
interface CohortOption { id: number; name?: string; title?: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAYMENT_TYPES = ['', 'ENROLLMENT', 'CERTIFICATE', 'MEMBERSHIP']
const PAY_STATUSES  = ['', 'PENDING', 'SUCCESS', 'FAILED']
const INTENT_STATUSES = ['', 'CREATED', 'INITIALIZED', 'PAID', 'CONSUMED', 'FAILED', 'EXPIRED', 'CANCELLED']

type AnyUser = { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email?: string }

function userName(u?: AnyUser): string {
  if (!u) return '—'
  if (u.name) return u.name
  return `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim() || u.email || '—'
}
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
function resolveAmount(p: Payment): string {
  const amt = p.amount_paid ?? p.payable_amount ?? p.payableAmount ?? p.amount
  if (amt == null) return '—'
  const cur = p.currency_paid ?? p.payable_currency ?? p.payableCurrency ?? p.currency ?? 'NGN'
  return `${cur === 'USD' ? '$' : '₦'}${amt.toLocaleString('en-NG')}`
}
function intentAmount(i: PaymentIntent): string {
  const amt = i.total_amount ?? i.original_amount
  if (amt == null) return '—'
  const cur = i.currency ?? 'NGN'
  return `${cur === 'USD' ? '$' : '₦'}${amt.toLocaleString('en-NG')}`
}
function resolveStatus(p: Payment): string {
  return p.payment_status ?? p.paymentStatus ?? p.status ?? ''
}
function resolvePayRef(p: Payment): string {
  return p.payment_reference ?? p.paymentReference ?? '—'
}
function resolveBrixRef(p: Payment): string {
  return p.brixgate_reference ?? p.brixgateReference ?? '—'
}

// ── Status configs ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  SUCCESS: 'bg-[#ecfdf3] text-[#027a48]',
  PENDING: 'bg-[#fffbeb] text-[#b45309]',
  FAILED:  'bg-[#fef2f2] text-[#d51520]',
}
const STATUS_DOT: Record<string, string> = {
  SUCCESS: '#027a48', PENDING: '#b45309', FAILED: '#d51520',
}

const INTENT_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  CREATED:     { bg: 'bg-[#eff6ff]',  text: 'text-[#1d4ed8]', dot: '#1d4ed8', label: 'Created' },
  INITIALIZED: { bg: 'bg-[#f5f3ff]',  text: 'text-[#6d28d9]', dot: '#6d28d9', label: 'Initialized' },
  PAID:        { bg: 'bg-[#ecfdf3]',  text: 'text-[#027a48]', dot: '#027a48', label: 'Paid' },
  CONSUMED:    { bg: 'bg-[#f0fdfa]',  text: 'text-[#0d9488]', dot: '#0d9488', label: 'Consumed' },
  FAILED:      { bg: 'bg-[#fef2f2]',  text: 'text-[#d51520]', dot: '#d51520', label: 'Failed' },
  EXPIRED:     { bg: 'bg-[#f3f4f6]',  text: 'text-[#6b7280]', dot: '#6b7280', label: 'Expired' },
  CANCELLED:   { bg: 'bg-[#f3f4f6]',  text: 'text-[#6b7280]', dot: '#6b7280', label: 'Cancelled' },
}

function IntentStatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toUpperCase()
  const cfg = INTENT_STATUS_CONFIG[s] ?? { bg: 'bg-[#f3f4f6]', text: 'text-[#6b7280]', dot: '#6b7280', label: s || '—' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-[12px] text-[#4b5563] font-body">{label}</p>
      <p className="text-[13px] font-medium text-[#111827] font-body text-right max-w-[240px] break-all">{value}</p>
    </div>
  )
}
function CopyRow({ label, value, id, copied, onCopy }: {
  label: string; value: string; id: string; copied: string | null; onCopy: (val: string, key: string) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-[12px] text-[#4b5563] font-body">{label}</p>
      <div className="flex items-center gap-2 max-w-[240px]">
        <p className="text-[12px] font-mono text-[#374151] font-body truncate">{value}</p>
        {value !== '—' && (
          <button onClick={() => onCopy(value, id)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f6] transition-colors"
            title="Copy">
            <Copy01Icon size={12} color={copied === id ? '#027a48' : '#9ca3af'} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Requery status pill ───────────────────────────────────────────────────────
function StatusPill({ payment, size = 'sm', onUpdated }: {
  payment: Payment; size?: 'sm' | 'md'; onUpdated: (updated: Payment) => void
}) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const status = resolveStatus(payment)
  const payRef = resolvePayRef(payment)
  const isPending = status === 'PENDING'

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function requery(e: React.MouseEvent) {
    e.stopPropagation()
    if (payRef === '—' || loading) return
    setOpen(false); setLoading(true)
    try {
      const res = await apiClient.get(`/payments/requery/${payRef}`)
      const body = res.data as Record<string, unknown>
      const inner = (body?.data ?? body) as Record<string, unknown>
      const nested = (inner?.payment ?? inner?.transaction ?? {}) as Record<string, unknown>
      const newStatus = (
        (inner?.payment_status ?? inner?.paymentStatus ?? inner?.status ??
         nested?.payment_status ?? nested?.paymentStatus ?? nested?.status ?? status) as string
      ).toUpperCase()
      const changed = newStatus !== status
      onUpdated({ ...payment, payment_status: newStatus, paymentStatus: newStatus, status: newStatus })
      setToast({ msg: changed ? `Payment is now ${newStatus}` : 'Payment is still pending — try again shortly', ok: changed })
    } catch (err) {
      setToast({ msg: getApiError(err), ok: false })
    } finally { setLoading(false) }
  }

  const pillCls = size === 'md' ? 'px-3 py-1 text-[12px]' : 'px-2 py-0.5 text-[11px]'
  const base = `inline-flex items-center gap-1.5 rounded-full font-semibold font-display ${pillCls}`

  return (
    <div className="relative inline-block" ref={ref}>
      {toast && (
        <div className={`absolute bottom-full mb-2 right-0 whitespace-nowrap px-3 py-1.5 rounded-[8px] text-[12px] font-body shadow-md z-20 ${
          toast.ok ? 'bg-[#ecfdf3] text-[#15803d] border border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]'
        }`}>{toast.msg}</div>
      )}
      {!isPending ? (
        <span className={`${base} ${STATUS_STYLE[status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT[status] ?? '#6b7280' }} />
          {status}
        </span>
      ) : (
        <>
          <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }} disabled={loading}
            className={`${base} ${STATUS_STYLE.PENDING} hover:opacity-80 transition-opacity disabled:opacity-60 cursor-pointer`}>
            {loading ? <Loading01Icon size={11} className="animate-spin flex-shrink-0" strokeWidth={2} />
              : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#b45309]" />}
            {loading ? 'Checking…' : 'PENDING'}
            {!loading && <ArrowDown01Icon size={10} strokeWidth={2} />}
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-[#e5e7eb] rounded-[8px] shadow-lg z-10 min-w-[150px] overflow-hidden">
              <button onClick={requery}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors font-body">
                <RefreshIcon size={13} color="#374151" strokeWidth={1.5} />
                Refresh Status
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Transaction detail panel ──────────────────────────────────────────────────
function PaymentDetailPanel({ payment, onClose, onUpdated }: { payment: Payment; onClose: () => void; onUpdated: (p: Payment) => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500) })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[420px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] font-display">Transaction Details</h2>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">#{payment.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="bg-[#f9fafb] rounded-[10px] p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-1">Amount Paid</p>
              <p className="text-[28px] font-bold text-[#111827] font-display leading-none">{resolveAmount(payment)}</p>
            </div>
            <StatusPill payment={payment} size="md" onUpdated={onUpdated} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Customer</p>
            <div className="space-y-2.5">
              <Row label="Name"  value={userName(payment.user)} />
              <Row label="Email" value={payment.user?.email ?? '—'} />
            </div>
          </div>
          <div className="h-px bg-[#f3f4f6]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">References</p>
            <div className="space-y-2.5">
              <CopyRow label="Payment Reference"  value={resolvePayRef(payment)}  id="payref"  copied={copied} onCopy={copy} />
              <CopyRow label="Brixgate Reference" value={resolveBrixRef(payment)} id="brixref" copied={copied} onCopy={copy} />
              <Row     label="Transaction ID"     value={String(payment.id)} />
            </div>
          </div>
          <div className="h-px bg-[#f3f4f6]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Payment Info</p>
            <div className="space-y-2.5">
              <Row label="Payment Type" value={payment.paymentType ?? payment.payment_type ?? '—'} />
              <Row label="Currency"     value={payment.payable_currency ?? payment.payableCurrency ?? payment.currency ?? 'NGN'} />
              <Row label="Date & Time"  value={formatDateTime(payment.createdAt ?? payment.created_at)} />
              {payment.coupon?.code && (
                <div className="flex items-center justify-between py-2">
                  <p className="text-[12px] text-[#4b5563] font-body">Coupon Applied</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f5f3ff] text-[#7c3aed] text-[11px] font-bold font-display">{payment.coupon.code}</span>
                    {payment.coupon.discount != null && <span className="text-[12px] text-[#4b5563] font-body">−{payment.coupon.discount}%</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Intent detail panel ───────────────────────────────────────────────────────
function IntentDetailPanel({ intent, onClose }: { intent: PaymentIntent; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500) })
  }

  const status      = (intent.status ?? '').toUpperCase()
  const checkoutUrl = intent.authorization_url
  const cohortName  = intent.cohort?.title ?? intent.cohort?.name ?? '—'
  const progTitle   = intent.program?.title ?? '—'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[420px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] font-display">Payment Intent</h2>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">#{intent.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Amount + status */}
          <div className="bg-[#f9fafb] rounded-[10px] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-1">Amount</p>
                <p className="text-[28px] font-bold text-[#111827] font-display leading-none">{intentAmount(intent)}</p>
              </div>
              <IntentStatusBadge status={status} />
            </div>
            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#d51520] hover:underline font-body"
              >
                <LinkSquare01Icon size={13} strokeWidth={1.5} />
                View Checkout Link
              </a>
            )}
          </div>

          {/* Student */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Student</p>
            <div className="space-y-2.5">
              <Row label="Name"  value={userName(intent.user)} />
              <Row label="Email" value={intent.user?.email ?? '—'} />
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          {/* Programme / Cohort */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Enrolment</p>
            <div className="space-y-2.5">
              <Row label="Programme" value={progTitle} />
              <Row label="Cohort"    value={cohortName} />
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          {/* References */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">References</p>
            <div className="space-y-2.5">
              <CopyRow label="Brixgate Reference" value={intent.brixgate_reference ?? '—'} id="brixref" copied={copied} onCopy={copy} />
              <CopyRow label="Provider Reference" value={intent.provider_reference ?? '—'} id="provref" copied={copied} onCopy={copy} />
              <Row     label="Intent ID"          value={String(intent.id)} />
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          {/* Payment info */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Payment Info</p>
            <div className="space-y-2.5">
              <Row label="Mode"             value={intent.payment_mode ?? '—'} />
              <Row label="Installment Role" value={intent.installment_role ?? '—'} />
              <Row label="Provider"         value={intent.provider ?? '—'} />
              <Row label="Currency"         value={intent.currency ?? 'NGN'} />
              {intent.discount_amount != null && intent.discount_amount > 0 && (
                <Row label="Discount" value={`₦${intent.discount_amount.toLocaleString('en-NG')}`} />
              )}
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          {/* Timeline */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Timeline</p>
            <div className="space-y-2.5">
              <Row label="Created"      value={formatDateTime(intent.created_at)} />
              {intent.expires_at  && <Row label="Expires"      value={formatDateTime(intent.expires_at)} />}
              {intent.updated_at  && <Row label="Last Updated" value={formatDateTime(intent.updated_at)} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Payment Intents tab ───────────────────────────────────────────────────────
function PaymentIntentsTab() {
  const [intents, setIntents]         = useState<PaymentIntent[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  const [page, setPage]               = useState(1)
  const [programs, setPrograms]       = useState<Program[]>([])
  const [cohorts, setCohorts]         = useState<CohortOption[]>([])
  const [selectedProg, setSelectedProg] = useState('')
  const [selectedCohort, setSelectedCohort] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading]         = useState(true)
  const [cohortsLoading, setCohortsLoading] = useState(false)
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntent | null>(null)

  // Fetch programmes once
  useEffect(() => {
    apiClient.get('/admin/programs?size=100')
      .then(res => {
        const data = unwrap<{ programs?: Program[]; data?: Program[] }>(res.data)
        const list = data?.programs ?? (Array.isArray(data) ? data as Program[] : [])
        setPrograms(list)
      })
      .catch(() => setPrograms([]))
  }, [])

  // Fetch cohorts when programme changes
  useEffect(() => {
    if (!selectedProg) { setCohorts([]); setSelectedCohort(''); return }
    setCohortsLoading(true)
    apiClient.get(`/admin/programs/${selectedProg}/cohorts?size=100`)
      .then(res => {
        const data = unwrap<{ cohorts?: CohortOption[]; data?: CohortOption[] }>(res.data)
        const list = data?.cohorts ?? (Array.isArray(data) ? data as CohortOption[] : [])
        setCohorts(list)
      })
      .catch(() => setCohorts([]))
      .finally(() => setCohortsLoading(false))
    setSelectedCohort('')
    setPage(1)
  }, [selectedProg])

  const fetchIntents = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (selectedCohort) p.set('cohort_id', selectedCohort)
      if (selectedStatus) p.set('status', selectedStatus)
      const res  = await apiClient.get(`/admin/payment-intents?${p}`)
      const data = unwrap<{ payment_intents?: PaymentIntent[]; paymentIntents?: PaymentIntent[]; pagination?: Pagination }>(res.data)
      const list = data?.payment_intents ?? data?.paymentIntents ?? (Array.isArray(data) ? data as PaymentIntent[] : [])
      setIntents(list)
      if (data?.pagination) setPagination(data.pagination)
    } catch { setIntents([]) } finally { setLoading(false) }
  }, [page, selectedCohort, selectedStatus])

  useEffect(() => { fetchIntents() }, [fetchIntents])

  const totalPages = pagination?.totalPages ?? pagination?.total_pages ?? 1
  const totalItems = pagination?.totalElements ?? pagination?.total_elements ?? pagination?.total ?? 0
  const hasNext    = pagination?.hasNext ?? pagination?.has_next ?? false

  return (
    <>
      {selectedIntent && (
        <IntentDetailPanel intent={selectedIntent} onClose={() => setSelectedIntent(null)} />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={selectedProg}
          onChange={e => { setSelectedProg(e.target.value); setPage(1) }}
          className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white"
        >
          <option value="">All Programmes</option>
          {programs.map(p => <option key={p.id} value={String(p.id)}>{p.title}</option>)}
        </select>

        <select
          value={selectedCohort}
          onChange={e => { setSelectedCohort(e.target.value); setPage(1) }}
          disabled={!selectedProg || cohortsLoading}
          className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{cohortsLoading ? 'Loading…' : 'All Cohorts'}</option>
          {cohorts.map(c => <option key={c.id} value={String(c.id)}>{c.title ?? c.name}</option>)}
        </select>

        <select
          value={selectedStatus}
          onChange={e => { setSelectedStatus(e.target.value); setPage(1) }}
          className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white"
        >
          {INTENT_STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['User', 'Amount', 'Reference', 'Type', 'Coupon', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[140, 80, 160, 100, 80, 90, 100].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : intents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Invoice01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No payment intents found</p>
                  <p className="text-[13px] text-[#4b5563] font-body mt-1">Try adjusting your filters</p>
                </td></tr>
              ) : intents.map(intent => (
                <tr
                  key={intent.id}
                  onClick={() => setSelectedIntent(intent)}
                  className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-medium text-[#111827] font-body">{userName(intent.user)}</p>
                    {intent.user?.email && <p className="text-[11px] text-[#4b5563] font-body">{intent.user.email}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] font-semibold text-[#111827] font-display">{intentAmount(intent)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] font-mono text-[#4b5563] font-body tracking-wide">{intent.brixgate_reference ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[12px] text-[#4b5563] font-body">{intent.payment_mode ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {(intent.discount_amount ?? 0) > 0
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f5f3ff] text-[#7c3aed] text-[11px] font-bold font-display">₦{intent.discount_amount?.toLocaleString('en-NG')}</span>
                      : <span className="text-[#d1d5db] text-[12px] font-body">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <IntentStatusBadge status={intent.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[12px] text-[#4b5563] font-body">{formatDate(intent.created_at)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalItems)} of {totalItems.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!hasNext} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab]       = useState<'transactions' | 'intents'>('transactions')
  const [payments, setPayments]         = useState<Payment[]>([])
  const [pagination, setPagination]     = useState<Pagination | null>(null)
  const [page, setPage]                 = useState(1)
  const [payType, setPayType]           = useState('')
  const [payStatus, setPayStatus]       = useState('')
  const [loading, setLoading]           = useState(true)
  const [selectedPayment, setSelected]  = useState<Payment | null>(null)

  function handleUpdated(updated: Payment) {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelected(prev => prev?.id === updated.id ? updated : prev)
  }

  const fetchPayments = useCallback(async () => {
    if (activeTab !== 'transactions') return
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (payType)   p.set('payment_type', payType)
      if (payStatus) p.set('status', payStatus)
      const res  = await apiClient.get(`/admin/payments?${p}`)
      const data = unwrap<{ payments?: Payment[]; pagination?: Pagination }>(res.data)
      setPayments(Array.isArray(data?.payments) ? data.payments : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setPayments([]) } finally { setLoading(false) }
  }, [page, payType, payStatus, activeTab])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const tabs = [
    { id: 'transactions' as const, label: 'Transactions' },
    { id: 'intents' as const,      label: 'Payment Intents' },
  ]

  const totalTx = pagination?.totalElements ?? pagination?.total_elements ?? pagination?.total ?? 0

  return (
    <div className="p-8">
      {loading && payments.length === 0 && activeTab === 'transactions' && <AdminPageLoader />}

      {selectedPayment && (
        <PaymentDetailPanel payment={selectedPayment} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
      )}


      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#f3f4f6]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium font-body border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#d51520] text-[#d51520]'
                : 'border-transparent text-[#4b5563] hover:text-[#111827]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions tab content */}
      {activeTab === 'transactions' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <select value={payType} onChange={e => { setPayType(e.target.value); setPage(1) }}
              className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
              {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t || 'All Types'}</option>)}
            </select>
            <select value={payStatus} onChange={e => { setPayStatus(e.target.value); setPage(1) }}
              className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
              {PAY_STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                    {['User', 'Amount', 'Reference', 'Type', 'Coupon', 'Status', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#f3f4f6]">
                      {[140, 80, 150, 100, 80, 80, 100].map((w, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                      ))}
                    </tr>
                  )) : payments.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center">
                      <Invoice01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                      <p className="text-[14px] font-semibold text-[#111827] font-display">No payments found</p>
                    </td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} onClick={() => setSelected(p)}
                      className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-medium text-[#111827] font-body">{userName(p.user)}</p>
                        {p.user?.email && <p className="text-[11px] text-[#4b5563] font-body">{p.user.email}</p>}
                      </td>
                      <td className="px-4 py-3.5"><span className="text-[13px] font-semibold text-[#111827] font-display">{resolveAmount(p)}</span></td>
                      <td className="px-4 py-3.5"><span className="text-[11px] font-mono text-[#4b5563] font-body tracking-wide">{resolvePayRef(p)}</span></td>
                      <td className="px-4 py-3.5"><span className="text-[12px] text-[#4b5563] font-body">{p.paymentType ?? p.payment_type ?? '—'}</span></td>
                      <td className="px-4 py-3.5">
                        {p.coupon?.code
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f5f3ff] text-[#7c3aed] text-[11px] font-bold font-display">{p.coupon.code}</span>
                          : <span className="text-[#d1d5db] text-[12px] font-body">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusPill payment={p} onUpdated={handleUpdated} /></td>
                      <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(p.createdAt ?? p.created_at)}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
                <p className="text-[12px] text-[#4b5563] font-body">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, totalTx)} of {totalTx.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment Intents tab content */}
      {activeTab === 'intents' && <PaymentIntentsTab />}
    </div>
  )
}
