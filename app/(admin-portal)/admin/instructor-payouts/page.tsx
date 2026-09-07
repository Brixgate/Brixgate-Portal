'use client'

import { useEffect, useState } from 'react'
import { apiClient, getApiError } from '@/lib/api-client'
import {
  Invoice01Icon,
  PlusSignIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  AlertCircleIcon,
  Delete01Icon,
  CheckmarkCircle01Icon,
} from 'hugeicons-react'

interface Adjustment {
  id: number
  type: 'BONUS' | 'DEDUCTION'
  label: string
  amount: number
  created_at: string
}

interface Payout {
  id: number
  cohort_id: number
  program_id: number
  instructor_user_id: number
  instructor_name: string
  revenue_total: number
  student_count: number
  percentage_applied: number
  allocation_percent: number
  flat_fee_applied: boolean
  base_amount: number
  bonus_total: number
  deduction_total: number
  total_amount: number
  currency: string
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED'
  paid_at?: string
  paid_reference?: string
  notes?: string
  adjustments?: Adjustment[]
}

const STATUS_FILTERS = ['All', 'DRAFT', 'APPROVED', 'PAID', 'CANCELLED'] as const

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID:      'bg-green-50 text-green-700 border border-green-200',
    APPROVED:  'bg-blue-50 text-blue-700 border border-blue-200',
    DRAFT:     'bg-amber-50 text-amber-700 border border-amber-200',
    CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
  }
  const dots: Record<string, string> = {
    PAID: 'bg-green-600', APPROVED: 'bg-blue-600', DRAFT: 'bg-amber-500', CANCELLED: 'bg-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${styles[status] ?? styles.DRAFT}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? dots.DRAFT}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  DRAFT:    [{ label: 'Approve', value: 'APPROVED' }, { label: 'Cancel', value: 'CANCELLED' }],
  APPROVED: [{ label: 'Reopen to Draft', value: 'DRAFT' }, { label: 'Mark Paid', value: 'PAID' }, { label: 'Cancel', value: 'CANCELLED' }],
  PAID:     [],
  CANCELLED:[],
}

function AdjustmentModal({
  payoutId,
  onClose,
  onSaved,
}: { payoutId: number; onClose: () => void; onSaved: () => void }) {
  const [type,   setType]   = useState<'BONUS' | 'DEDUCTION'>('BONUS')
  const [label,  setLabel]  = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  async function submit() {
    if (!label || !amount) { setErr('All fields are required.'); return }
    setSaving(true); setErr('')
    try {
      await apiClient.post(`/admin/instructor-payouts/${payoutId}/adjustments`, {
        type, label, amount: parseFloat(amount),
      })
      onSaved()
    } catch (e) {
      setErr(getApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-[0px_12px_40px_rgba(16,24,40,0.15)] w-full max-w-[420px] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f3f4f6]">
          <h2 className="text-[16px] font-bold text-[#111827] font-display">Add Adjustment</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Type</label>
            <select value={type} onChange={e => setType(e.target.value as 'BONUS' | 'DEDUCTION')}
              className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] bg-white">
              <option value="BONUS">Bonus</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Excellent reviews"
              className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Amount (₦)</label>
            <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10000"
              className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
          </div>
          {err && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 font-body">
              <AlertCircleIcon size={14} color="#dc2626" strokeWidth={1.5} /> {err}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#f3f4f6] flex justify-end gap-3">
          <button onClick={onClose} className="h-10 px-4 rounded-[8px] border border-[#d1d5db] text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] font-display">Cancel</button>
          <button onClick={submit} disabled={saving} className="h-10 px-5 rounded-[8px] bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold font-display disabled:opacity-50">
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusModal({
  payout,
  onClose,
  onSaved,
}: { payout: Payout; onClose: () => void; onSaved: () => void }) {
  const transitions = NEXT_STATUS[payout.status] ?? []
  const [targetStatus, setTargetStatus] = useState(transitions[0]?.value ?? '')
  const [reference, setReference]       = useState('')
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [err, setErr]                   = useState('')

  async function submit() {
    setSaving(true); setErr('')
    try {
      const body: Record<string, unknown> = { status: targetStatus, status_value: targetStatus }
      if (targetStatus === 'PAID') {
        body.paid_reference = reference; body.paidReference = reference
      }
      if (notes) { body.notes = notes }
      await apiClient.patch(`/admin/instructor-payouts/${payout.id}`, body)
      onSaved()
    } catch (e) {
      setErr(getApiError(e))
    } finally {
      setSaving(false)
    }
  }

  if (!transitions.length) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-[0px_12px_40px_rgba(16,24,40,0.15)] w-full max-w-[440px] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f3f4f6]">
          <h2 className="text-[16px] font-bold text-[#111827] font-display">Update Status</h2>
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">Payout #{payout.id} · {payout.instructor_name}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">New Status</label>
            <select value={targetStatus} onChange={e => setTargetStatus(e.target.value)}
              className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] bg-white">
              {transitions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {targetStatus === 'PAID' && (
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Payment Reference *</label>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. TRF-2026-09-001"
                className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Notes <span className="text-[#9ca3af]">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. September payroll run"
              className="w-full px-3 py-2.5 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] resize-none" />
          </div>
          {err && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 font-body">
              <AlertCircleIcon size={14} color="#dc2626" strokeWidth={1.5} /> {err}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#f3f4f6] flex justify-end gap-3">
          <button onClick={onClose} className="h-10 px-4 rounded-[8px] border border-[#d1d5db] text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] font-display">Cancel</button>
          <button onClick={submit} disabled={saving || (targetStatus === 'PAID' && !reference)}
            className="h-10 px-5 rounded-[8px] bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold font-display disabled:opacity-50">
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PayoutRow({ payout, onRefresh }: { payout: Payout; onRefresh: () => void }) {
  const [open, setOpen]               = useState(false)
  const [adjModal, setAdjModal]       = useState(false)
  const [statusModal, setStatusModal] = useState(false)
  const [delAdj, setDelAdj]           = useState<number | null>(null)

  const canAdjust = payout.status === 'DRAFT'
  const canTransition = NEXT_STATUS[payout.status]?.length > 0

  async function deleteAdj(adjId: number) {
    if (!confirm('Remove this adjustment?')) return
    setDelAdj(adjId)
    try {
      await apiClient.delete(`/admin/instructor-payouts/${payout.id}/adjustments/${adjId}`)
      onRefresh()
    } catch { /* swallow */ }
    finally { setDelAdj(null) }
  }

  return (
    <>
      <div
        className="grid grid-cols-[1fr_140px_140px_130px_130px_40px] px-4 py-3 items-center border-b border-[#eaecf0] hover:bg-[#f9fafb] transition-colors cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="text-[13px] font-semibold text-[#111827] font-display">{payout.instructor_name}</p>
          <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">Cohort #{payout.cohort_id}</p>
        </div>
        <span className="text-[13px] text-[#374151] font-body">{fmt(payout.base_amount ?? 0)}</span>
        <span className="text-[13px] font-bold text-[#111827] font-display">{fmt(payout.total_amount ?? 0)}</span>
        <StatusBadge status={payout.status} />
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {canTransition && (
            <button onClick={() => setStatusModal(true)}
              title="Update status"
              className="flex items-center gap-1 h-7 px-2.5 rounded-[6px] border border-[#d1d5db] text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] font-body">
              <CheckmarkCircle01Icon size={13} color="#374151" strokeWidth={1.5} />
              Status
            </button>
          )}
        </div>
        <div className="flex justify-end">
          {open ? <ArrowUp01Icon size={16} color="#9ca3af" strokeWidth={1.5} /> : <ArrowDown01Icon size={16} color="#9ca3af" strokeWidth={1.5} />}
        </div>
      </div>

      {open && (
        <div className="border-b border-[#eaecf0] bg-[#fafafa] px-6 py-5">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Revenue Basis</p>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{fmt(payout.revenue_total ?? 0)}</p>
              <p className="text-[12px] text-[#6b7280] font-body">{payout.student_count} students · {payout.percentage_applied}%</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Allocation</p>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{payout.allocation_percent}%</p>
              <p className="text-[12px] text-[#6b7280] font-body">{payout.flat_fee_applied ? 'Flat fee (low enrolment)' : 'Pool share'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Payment Ref</p>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{payout.paid_reference ?? '—'}</p>
              {payout.paid_at && <p className="text-[12px] text-[#6b7280] font-body">{formatDate(payout.paid_at)}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Notes</p>
              <p className="text-[13px] text-[#374151] font-body">{payout.notes ?? '—'}</p>
            </div>
          </div>

          {/* Breakdown + adjustments */}
          <div className="bg-white rounded-[8px] border border-[#eaecf0] overflow-hidden mb-4">
            <div className="px-4 py-2 border-b border-[#eaecf0] bg-[#f9fafb] flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Breakdown</p>
              {canAdjust && (
                <button onClick={() => setAdjModal(true)}
                  className="flex items-center gap-1 h-6 px-2 rounded-[5px] border border-[#d1d5db] text-[11px] font-medium text-[#374151] hover:bg-[#f3f4f6] font-body">
                  <PlusSignIcon size={11} color="#374151" strokeWidth={2} /> Add Adjustment
                </button>
              )}
            </div>
            <div className="divide-y divide-[#f3f4f6]">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-[#374151] font-body">Base Amount</span>
                <span className="text-[13px] font-medium text-[#111827] font-display">{fmt(payout.base_amount ?? 0)}</span>
              </div>
              {(payout.adjustments ?? []).map(adj => (
                <div key={adj.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${adj.type === 'BONUS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {adj.type}
                    </span>
                    <span className="text-[13px] text-[#374151] font-body">{adj.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-medium font-display ${adj.type === 'BONUS' ? 'text-green-700' : 'text-red-600'}`}>
                      {adj.type === 'BONUS' ? '+' : '−'}{fmt(adj.amount)}
                    </span>
                    {canAdjust && (
                      <button onClick={() => deleteAdj(adj.id)} disabled={delAdj === adj.id}
                        className="p-1 rounded hover:bg-red-50 transition-colors" title="Remove">
                        <Delete01Icon size={13} color="#d51520" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-[#f9fafb]">
                <span className="text-[13px] font-bold text-[#111827] font-display">Total</span>
                <span className="text-[14px] font-bold text-[#111827] font-display">{fmt(payout.total_amount ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjModal && (
        <AdjustmentModal
          payoutId={payout.id}
          onClose={() => setAdjModal(false)}
          onSaved={() => { setAdjModal(false); onRefresh() }}
        />
      )}

      {statusModal && (
        <StatusModal
          payout={payout}
          onClose={() => setStatusModal(false)}
          onSaved={() => { setStatusModal(false); onRefresh() }}
        />
      )}
    </>
  )
}

export default function InstructorPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<typeof STATUS_FILTERS[number]>('All')
  const [cohortInput, setCohortInput] = useState('')

  function load() {
    const params = new URLSearchParams({ page: '1', size: '200' })
    if (cohortInput) params.set('cohortId', cohortInput)
    setLoading(true)
    apiClient.get(`/admin/instructor-payouts?${params}`)
      .then(res => {
        const d = res.data?.data ?? res.data
        const arr = d?.payouts ?? d?.content ?? d?.data ?? (Array.isArray(d) ? d : [])
        setPayouts(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = activeFilter === 'All' ? payouts : payouts.filter(p => p.status === activeFilter)
  const sorted   = [...filtered].sort((a, b) => b.id - a.id)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827] font-display leading-[36px]">Instructor Payouts</h1>
          <p className="mt-1 text-[14px] text-[#4b5563] font-body">
            View and manage payouts. Generate payouts from the individual cohort page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={cohortInput}
            onChange={e => setCohortInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Filter by Cohort ID…"
            className="h-10 px-3 rounded-[8px] border border-[#d1d5db] text-[13px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] w-[200px]"
          />
          <button onClick={load}
            className="h-10 px-4 rounded-[8px] bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold font-display">
            Search
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
        {/* Filter chips */}
        <div className="px-6 pt-5 pb-4 border-b border-[#eaecf0] flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`rounded-full px-4 h-8 text-[13px] font-medium transition-colors ${
                activeFilter === f ? 'bg-[#d51520] text-white' : 'bg-white border border-[#eaecf0] text-[#374151] hover:bg-[#f9fafb]'
              }`}>
              {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_140px_140px_130px_130px_40px] px-4 py-2 bg-[#f9fafb] border-b border-[#eaecf0]">
          {['Instructor', 'Base Amount', 'Total', 'Status', 'Actions', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold uppercase tracking-widest text-[#98a2b3] font-display">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#f9fafb] rounded-[8px] animate-pulse" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
              <Invoice01Icon size={28} color="#98a2b3" strokeWidth={1.5} />
            </div>
            <h4 className="text-[16px] font-semibold text-[#101828] font-display mb-2">No payouts found</h4>
            <p className="text-[14px] text-[#4b5563] font-body max-w-[320px]">
              Generate payouts from the cohort detail page. Once created, they appear here for lifecycle management.
            </p>
          </div>
        ) : (
          <div>
            {sorted.map(p => <PayoutRow key={p.id} payout={p} onRefresh={load} />)}
            <div className="px-4 py-3 text-[12px] text-[#9ca3af] font-body">
              Showing {sorted.length} of {payouts.length} payout{payouts.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
