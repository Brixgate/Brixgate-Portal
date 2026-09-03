'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Invoice01Icon, ArrowDown01Icon, ArrowUp01Icon } from 'hugeicons-react'

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

function PayoutRow({ payout }: { payout: Payout }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className="grid grid-cols-[1fr_130px_140px_130px_40px] px-4 py-3 items-center border-b border-[#eaecf0] hover:bg-[#f9fafb] transition-colors cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p className="text-[13px] font-semibold text-[#111827] font-display">Cohort #{payout.cohort_id}</p>
          {payout.paid_at && (
            <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">Paid {formatDate(payout.paid_at)}</p>
          )}
        </div>
        <span className="text-[13px] text-[#374151] font-body">{fmt(payout.base_amount ?? 0)}</span>
        <span className="text-[13px] font-bold text-[#111827] font-display">{fmt(payout.total_amount ?? 0)}</span>
        <StatusBadge status={payout.status} />
        <div className="flex justify-end">
          {open
            ? <ArrowUp01Icon size={16} color="#9ca3af" strokeWidth={1.5} />
            : <ArrowDown01Icon size={16} color="#9ca3af" strokeWidth={1.5} />
          }
        </div>
      </div>

      {open && (
        <div className="border-b border-[#eaecf0] bg-[#fafafa] px-6 py-5">
          <div className="grid grid-cols-3 gap-6 mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Revenue Basis</p>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{fmt(payout.revenue_total ?? 0)}</p>
              <p className="text-[12px] text-[#6b7280] font-body">{payout.student_count} student{payout.student_count !== 1 ? 's' : ''} · {payout.percentage_applied}% rate</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Your Allocation</p>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{payout.allocation_percent}%</p>
              <p className="text-[12px] text-[#6b7280] font-body">
                {payout.flat_fee_applied ? 'Flat fee applied (low enrolment)' : 'Percentage of pool'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] mb-1">Payment Reference</p>
              <p className="text-[14px] font-semibold text-[#111827] font-display">{payout.paid_reference ?? '—'}</p>
              {payout.notes && <p className="text-[12px] text-[#6b7280] font-body">{payout.notes}</p>}
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-[8px] border border-[#eaecf0] overflow-hidden">
            <div className="px-4 py-2 border-b border-[#eaecf0] bg-[#f9fafb]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">Breakdown</p>
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
                  <span className={`text-[13px] font-medium font-display ${adj.type === 'BONUS' ? 'text-green-700' : 'text-red-600'}`}>
                    {adj.type === 'BONUS' ? '+' : '−'}{fmt(adj.amount)}
                  </span>
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
    </>
  )
}

export default function InstructorEarningsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<typeof STATUS_FILTERS[number]>('All')

  useEffect(() => {
    apiClient.get('/me/instructor-payouts?page=1&size=100')
      .then(res => {
        const d = res.data?.data ?? res.data
        setPayouts(d?.payouts ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeFilter === 'All' ? payouts : payouts.filter(p => p.status === activeFilter)
  const sorted   = [...filtered].sort((a, b) => b.id - a.id)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#111827] font-display leading-[36px]">My Earnings</h1>
        <p className="mt-1 text-[14px] text-[#4b5563] font-body">All your payouts across cohorts.</p>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
        {/* Filter chips */}
        <div className="px-6 pt-5 pb-4 border-b border-[#eaecf0] flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-full px-4 h-8 text-[13px] font-medium transition-colors ${
                activeFilter === f
                  ? 'bg-[#d51520] text-white'
                  : 'bg-white border border-[#eaecf0] text-[#374151] hover:bg-[#f9fafb]'
              }`}
            >
              {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_130px_140px_130px_40px] px-4 py-2 bg-[#f9fafb] border-b border-[#eaecf0]">
          {['Cohort', 'Base Amount', 'Total', 'Status', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold uppercase tracking-widest text-[#98a2b3] font-display">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#f9fafb] rounded-[8px] animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
              <Invoice01Icon size={28} color="#98a2b3" strokeWidth={1.5} />
            </div>
            <h4 className="text-[16px] font-semibold text-[#101828] font-display mb-2">
              {activeFilter === 'All' ? 'No payouts yet' : `No ${activeFilter.toLowerCase()} payouts`}
            </h4>
            <p className="text-[14px] text-[#4b5563] font-body max-w-[300px]">
              {activeFilter === 'All'
                ? 'Your payouts will appear here once the admin generates them for your cohorts.'
                : `You have no payouts with ${activeFilter.toLowerCase()} status.`}
            </p>
          </div>
        ) : (
          <div>
            {sorted.map(p => <PayoutRow key={p.id} payout={p} />)}
            <div className="px-4 py-3 text-[12px] text-[#9ca3af] font-body">
              Showing {sorted.length} of {payouts.length} payout{payouts.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
