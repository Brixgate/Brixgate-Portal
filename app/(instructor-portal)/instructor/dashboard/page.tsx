'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import {
  Invoice01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Money01Icon,
} from 'hugeicons-react'

interface Payout {
  id: number
  cohort_id: number
  program_id: number
  total_amount: number
  base_amount: number
  bonus_total: number
  deduction_total: number
  currency: string
  status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED'
  paid_at?: string
  paid_reference?: string
  notes?: string
}

interface Pagination {
  total_elements: number
}

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
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${styles[status] ?? styles.DRAFT}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'PAID' ? 'bg-green-600' : status === 'APPROVED' ? 'bg-blue-600' : status === 'CANCELLED' ? 'bg-gray-400' : 'bg-amber-500'}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

export default function InstructorDashboardPage() {
  const { user } = useAuth()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/me/instructor-payouts?page=1&size=100')
      .then(res => {
        const d = res.data?.data ?? res.data
        setPayouts(d?.payouts ?? [])
        setPagination(d?.pagination ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalPaid     = payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const pendingCount  = payouts.filter(p => p.status === 'APPROVED').length
  const pendingAmount = payouts.filter(p => p.status === 'APPROVED').reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const draftCount    = payouts.filter(p => p.status === 'DRAFT').length
  const lastPaid      = payouts.filter(p => p.status === 'PAID' && p.paid_at).sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0]

  const firstName = user?.firstName ?? 'Instructor'

  const STATS = [
    {
      label: 'Total Earned',
      value: fmt(totalPaid),
      sub: `${payouts.filter(p => p.status === 'PAID').length} paid payout${payouts.filter(p => p.status === 'PAID').length !== 1 ? 's' : ''}`,
      icon: Money01Icon,
      accent: '#7C3AED',
      tint: '#F5F3FF',
    },
    {
      label: 'Awaiting Payment',
      value: pendingCount > 0 ? fmt(pendingAmount) : '—',
      sub: `${pendingCount} approved payout${pendingCount !== 1 ? 's' : ''}`,
      icon: CheckmarkCircle01Icon,
      accent: '#0D9488',
      tint: '#F0FDFA',
    },
    {
      label: 'In Draft',
      value: String(draftCount),
      sub: draftCount === 0 ? 'No drafts pending' : `payout${draftCount !== 1 ? 's' : ''} not yet approved`,
      icon: Clock01Icon,
      accent: '#D97706',
      tint: '#FFFBEB',
    },
    {
      label: 'Last Payment',
      value: lastPaid ? formatDate(lastPaid.paid_at!) : '—',
      sub: lastPaid ? lastPaid.paid_reference ?? '' : 'No payments yet',
      icon: Invoice01Icon,
      accent: '#EA580C',
      tint: '#FFF7ED',
    },
  ]

  const recentPayouts = [...payouts]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)

  return (
    <div className="p-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#111827] font-display leading-[36px]">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-[14px] text-[#4b5563] font-body">
          Here&apos;s an overview of your earnings and payout status.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6 animate-pulse">
              <div className="h-4 bg-[#f3f4f6] rounded w-2/3 mb-4" />
              <div className="h-8 bg-[#f3f4f6] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[#f3f4f6] rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6 mb-8">
          {STATS.map(({ label, value, sub, icon: Icon, accent, tint }) => (
            <div key={label} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98a2b3]">{label}</p>
                <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: tint }}>
                  <Icon size={18} color={accent} strokeWidth={1.5} />
                </div>
              </div>
              <p className="mt-3 text-[28px] font-bold leading-none text-[#101828] font-display">{value}</p>
              <p className="mt-1 text-[13px] text-[#98a2b3] font-body">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent payouts */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#101828] font-display">Recent Payouts</h3>
          <a href="/instructor/earnings" className="text-[13px] text-[#d51520] hover:underline font-body">
            View all
          </a>
        </div>
        <div className="h-px bg-[#eaecf0]" />

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-[#f9fafb] rounded-[8px] animate-pulse" />
            ))}
          </div>
        ) : recentPayouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
              <Invoice01Icon size={28} color="#98a2b3" strokeWidth={1.5} />
            </div>
            <h4 className="text-[16px] font-semibold text-[#101828] font-display mb-2">No payouts yet</h4>
            <p className="text-[14px] text-[#4b5563] font-body max-w-[300px]">
              Your payouts will appear here once the admin generates them for your cohorts.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_120px_140px_120px] px-4 py-2 bg-[#f9fafb] border-b border-[#eaecf0]">
              {['Cohort', 'Base Amount', 'Total Amount', 'Status'].map(h => (
                <span key={h} className="text-[11px] font-semibold uppercase tracking-widest text-[#98a2b3] font-display">{h}</span>
              ))}
            </div>
            {recentPayouts.map((p, i) => (
              <div key={p.id}
                className={`grid grid-cols-[1fr_120px_140px_120px] px-4 py-3 items-center border-b border-[#eaecf0] last:border-0 hover:bg-[#f9fafb] transition-colors ${i % 2 === 0 ? '' : ''}`}>
                <span className="text-[13px] font-medium text-[#111827] font-display">Cohort #{p.cohort_id}</span>
                <span className="text-[13px] text-[#374151] font-body">{fmt(p.base_amount ?? 0)}</span>
                <span className="text-[13px] font-semibold text-[#111827] font-display">{fmt(p.total_amount ?? 0)}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
