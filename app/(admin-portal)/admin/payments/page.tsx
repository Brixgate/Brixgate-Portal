'use client'

import { useState, useEffect, useCallback } from 'react'
import { Invoice01Icon, Cancel01Icon, Copy01Icon } from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'
import AdminPageLoader from '@/components/admin/AdminPageLoader'

interface Payment {
  id: number
  user?: { id?: number; name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  payable_amount?: number; payableAmount?: number; amount?: number
  currency?: string; payable_currency?: string; payableCurrency?: string
  payment_status?: string; paymentStatus?: string; status?: string
  payment_reference?: string; paymentReference?: string
  brixgate_reference?: string; brixgateReference?: string
  payment_type?: string; paymentType?: string
  coupon?: { code?: string; discount?: number }
  created_at?: string; createdAt?: string
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const PAYMENT_TYPES = ['', 'ENROLLMENT', 'CERTIFICATE', 'MEMBERSHIP']
const PAY_STATUSES  = ['', 'PENDING', 'SUCCESS', 'FAILED']

function userName(u?: Payment['user']): string {
  if (!u) return '—'
  if (u.name) return u.name
  return `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim() || u.email
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
  const amt = p.payable_amount ?? p.payableAmount ?? p.amount
  if (amt == null) return '—'
  const cur = p.payable_currency ?? p.payableCurrency ?? p.currency ?? 'NGN'
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

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: 'bg-[#ecfdf3] text-[#027a48]',
  PENDING: 'bg-[#fffbeb] text-[#b45309]',
  FAILED:  'bg-[#fef2f2] text-[#d51520]',
}
const STATUS_DOT: Record<string, string> = {
  SUCCESS: '#027a48', PENDING: '#b45309', FAILED: '#d51520',
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function PaymentDetailPanel({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const status = resolveStatus(payment)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-[420px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] font-display">Transaction Details</h2>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">#{payment.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={16} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Amount + status */}
          <div className="bg-[#f9fafb] rounded-[10px] p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-1">Amount Paid</p>
              <p className="text-[28px] font-bold text-[#111827] font-display leading-none">{resolveAmount(payment)}</p>
            </div>
            {status && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold font-display ${STATUS_STYLE[status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[status] ?? '#6b7280' }} />
                {status}
              </span>
            )}
          </div>

          {/* User */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">Customer</p>
            <div className="space-y-2.5">
              <Row label="Name"  value={userName(payment.user)} />
              <Row label="Email" value={payment.user?.email ?? '—'} />
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          {/* References */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">References</p>
            <div className="space-y-2.5">
              <CopyRow label="Payment Reference"   value={resolvePayRef(payment)}   id="payref"    copied={copied} onCopy={copy} />
              <CopyRow label="Brixgate Reference"  value={resolveBrixRef(payment)}  id="brixref"   copied={copied} onCopy={copy} />
              <Row     label="Transaction ID"      value={String(payment.id)} />
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          {/* Payment info */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">Payment Info</p>
            <div className="space-y-2.5">
              <Row label="Payment Type"   value={payment.paymentType ?? payment.payment_type ?? '—'} />
              <Row label="Currency"       value={payment.payable_currency ?? payment.payableCurrency ?? payment.currency ?? 'NGN'} />
              <Row label="Date & Time"    value={formatDateTime(payment.createdAt ?? payment.created_at)} />
              {payment.coupon?.code && (
                <div className="flex items-center justify-between py-2">
                  <p className="text-[12px] text-[#6b7280] font-body">Coupon Applied</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f5f3ff] text-[#7c3aed] text-[11px] font-bold font-display">
                      {payment.coupon.code}
                    </span>
                    {payment.coupon.discount != null && (
                      <span className="text-[12px] text-[#6b7280] font-body">−{payment.coupon.discount}%</span>
                    )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-[12px] text-[#6b7280] font-body">{label}</p>
      <p className="text-[13px] font-medium text-[#111827] font-body text-right max-w-[240px] break-all">{value}</p>
    </div>
  )
}

function CopyRow({ label, value, id, copied, onCopy }: {
  label: string; value: string; id: string; copied: string | null; onCopy: (val: string, key: string) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <p className="text-[12px] text-[#6b7280] font-body">{label}</p>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const [payments, setPayments]         = useState<Payment[]>([])
  const [pagination, setPagination]     = useState<Pagination | null>(null)
  const [page, setPage]                 = useState(1)
  const [payType, setPayType]           = useState('')
  const [payStatus, setPayStatus]       = useState('')
  const [loading, setLoading]           = useState(true)
  const [selectedPayment, setSelected]  = useState<Payment | null>(null)

  const fetchPayments = useCallback(async () => {
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
  }, [page, payType, payStatus])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  return (
    <div className="p-8">
      {loading && payments.length === 0 && <AdminPageLoader />}

      {selectedPayment && (
        <PaymentDetailPanel payment={selectedPayment} onClose={() => setSelected(null)} />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Payments</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
            {pagination ? `${(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0).toLocaleString()} total transactions` : 'All payment records'}
          </p>
        </div>
      </div>

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
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
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
              ) : payments.map(p => {
                const status = resolveStatus(p)
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-[#111827] font-body">{userName(p.user)}</p>
                      {p.user?.email && <p className="text-[11px] text-[#9ca3af] font-body">{p.user.email}</p>}
                    </td>
                    <td className="px-4 py-3.5"><span className="text-[13px] font-semibold text-[#111827] font-display">{resolveAmount(p)}</span></td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-mono text-[#6b7280] font-body tracking-wide">{resolvePayRef(p)}</span>
                    </td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-[#6b7280] font-body">{p.paymentType ?? p.payment_type ?? '—'}</span></td>
                    <td className="px-4 py-3.5">
                      {p.coupon?.code
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f5f3ff] text-[#7c3aed] text-[11px] font-bold font-display">{p.coupon.code}</span>
                        : <span className="text-[#d1d5db] text-[12px] font-body">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {status && (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT[status] ?? '#6b7280' }} />
                          {status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><p className="text-[12px] text-[#9ca3af] font-body">{formatDate(p.createdAt ?? p.created_at)}</p></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0)} of {(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0).toLocaleString()}
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
