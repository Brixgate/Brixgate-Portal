'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import TopNav from '@/components/layout/TopNav'
import {
  Wallet01Icon,
  Payment01Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Loading01Icon,
  CreditCardIcon,
  Invoice01Icon,
  Money01Icon,
  LockIcon,
  RefreshIcon,
  ArrowDown01Icon,
  Calendar03Icon,
  Clock01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiInstallment {
  id: number
  installment_number?: number; installmentNumber?: number
  amount_due?: number; amountDue?: number; amount?: number
  amount_paid?: number; amountPaid?: number
  outstanding_amount?: number; outstandingAmount?: number
  due_date?: string; dueDate?: string
  grace_due_date?: string; graceDueDate?: string
  status: 'PAID' | 'PENDING' | 'UPCOMING' | 'OVERDUE'
  paid_at?: string; paidAt?: string
}

interface ApiPayment {
  id: number
  amount_paid?: number; amountPaid?: number
  payable_amount?: number; payableAmount?: number
  payable_currency?: string; payableCurrency?: string
  currency_paid?: string
  payment_method?: string; paymentMethod?: string
  payment_status?: string; paymentStatus?: string
  payment_reference?: string; brixgate_reference?: string; paymentReference?: string
  installment_role?: string; installmentRole?: string
  payment_date?: string; paymentDate?: string
  created_at?: string; createdAt?: string
}

interface ApiPaymentPlan {
  id: number
  cohort_id?: number; cohortId?: number
  cohort_title?: string; cohortTitle?: string
  program_title?: string; programTitle?: string
  program_id?: number; programId?: number
  status: 'ACTIVE' | 'SUSPENDED' | 'DEFAULTED' | 'COMPLETED' | string
  access_status?: string; accessStatus?: string
  total_amount?: number; totalAmount?: number
  amount_paid?: number; amountPaid?: number
  outstanding_amount?: number; outstandingAmount?: number
  amount_outstanding?: number; amountOutstanding?: number
  number_of_installments?: number; numberOfInstallments?: number
  payments_completed?: number; paymentsCompleted?: number
  payment_mode?: string; paymentMode?: string
  installment_calculation_type?: string; installmentCalculationType?: string
  next_due_date?: string; nextDueDate?: string
  final_due_date?: string; finalDueDate?: string
  start_date?: string; startDate?: string
  installments?: ApiInstallment[]
  payment_schedule?: ApiInstallment[]
  payments?: ApiPayment[]
  pricing_plan_id?: number; pricingPlanId?: number
  pricing_breakdown_id?: number
  payment_option_id?: number; paymentOptionId?: number
  currency?: string
}

interface ApiWallet {
  balance?: number
  available_balance?: number; availableBalance?: number
  currency?: string
  transactions?: ApiWalletTx[]
  ledger?: ApiWalletTx[]
}

interface ApiWalletTx {
  id: number
  amount: number
  type?: 'CREDIT' | 'DEBIT' | string
  description?: string
  reference?: string
  created_at?: string; createdAt?: string
}

// ── Normalised ────────────────────────────────────────────────────────────────
interface Installment {
  id: number
  number: number
  amountDue: number
  amountPaid: number
  outstanding: number
  dueDate: string
  graceDueDate: string | null
  status: 'PAID' | 'PENDING' | 'UPCOMING' | 'OVERDUE'
  paidAt: string | null
}

interface PlanPayment {
  id: number
  amount: number
  currency: string
  status: string
  reference: string
  role: string
  date: string
}

interface PaymentPlan {
  id: number
  cohortId: number
  cohortEnrollmentId: number | null
  label: string
  status: string
  accessStatus: string
  totalAmount: number
  amountPaid: number
  amountOutstanding: number
  numberOfInstallments: number
  paymentsCompleted: number
  paymentMode: string
  calculationType: string
  nextDueDate: string | null
  finalDueDate: string | null
  installments: Installment[]
  payments: PlanPayment[]
  pricingPlanId: number | null
  paymentOptionId: number | null
  currency: string
}

interface WalletTx {
  id: number
  amount: number
  type: string
  description: string
  date: string
}

interface Wallet {
  balance: number
  currency: string
  transactions: WalletTx[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount: number, currency = '₦') {
  return `${currency}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}


function normaliseInstallments(raw: ApiInstallment[]): Installment[] {
  return raw.map((r, i) => ({
    id:           r.id,
    number:       r.installment_number ?? r.installmentNumber ?? (i + 1),
    amountDue:    r.amount_due ?? r.amountDue ?? r.amount ?? 0,
    amountPaid:   r.amount_paid ?? r.amountPaid ?? 0,
    outstanding:  r.outstanding_amount ?? r.outstandingAmount ?? 0,
    dueDate:      fmtDate(r.due_date ?? r.dueDate),
    graceDueDate: r.grace_due_date ?? r.graceDueDate ?? null,
    status:       r.status,
    paidAt:       r.paid_at ?? r.paidAt ?? null,
  }))
}

function normalisePayments(raw: ApiPayment[]): PlanPayment[] {
  return raw.map(r => ({
    id:        r.id,
    amount:    r.amount_paid ?? r.amountPaid ?? r.payable_amount ?? r.payableAmount ?? 0,
    currency:  r.payable_currency ?? r.payableCurrency ?? r.currency_paid ?? 'NGN',
    status:    (r.payment_status ?? r.paymentStatus ?? '').toUpperCase(),
    reference: r.brixgate_reference ?? r.payment_reference ?? r.paymentReference ?? '',
    role:      r.installment_role ?? r.installmentRole ?? '',
    date:      fmtDate(r.payment_date ?? r.paymentDate ?? r.created_at ?? r.createdAt),
  }))
}

function normalisePlan(r: ApiPaymentPlan): PaymentPlan {
  const prog   = r.program_title ?? r.programTitle ?? 'Programme'
  const cohort = r.cohort_title  ?? r.cohortTitle  ?? ''
  const installments = normaliseInstallments(r.installments ?? r.payment_schedule ?? [])
  const payments     = normalisePayments(r.payments ?? [])
  return {
    id:                   r.id,
    cohortId:             r.cohort_id ?? r.cohortId ?? 0,
    cohortEnrollmentId:   null,
    label:                cohort ? `${prog} — ${cohort}` : prog,
    status:               r.status,
    accessStatus:         r.access_status ?? r.accessStatus ?? r.status,
    totalAmount:          r.total_amount       ?? r.totalAmount       ?? 0,
    amountPaid:           r.amount_paid        ?? r.amountPaid        ?? 0,
    amountOutstanding:    r.outstanding_amount ?? r.outstandingAmount ?? r.amount_outstanding ?? r.amountOutstanding ?? 0,
    numberOfInstallments: r.number_of_installments ?? r.numberOfInstallments ?? installments.length,
    paymentsCompleted:    r.payments_completed  ?? r.paymentsCompleted  ?? installments.filter(i => i.status === 'PAID').length,
    paymentMode:          r.payment_mode ?? r.paymentMode ?? '',
    calculationType:      r.installment_calculation_type ?? r.installmentCalculationType ?? '',
    nextDueDate:          r.next_due_date ?? r.nextDueDate ?? null,
    finalDueDate:         r.final_due_date ?? r.finalDueDate ?? null,
    installments,
    payments,
    pricingPlanId:        r.pricing_plan_id ?? r.pricingPlanId ?? null,
    paymentOptionId:      r.payment_option_id ?? r.paymentOptionId ?? null,
    currency:             r.currency ?? 'NGN',
  }
}

function normaliseWallet(r: ApiWallet): Wallet {
  const txs = (r.transactions ?? r.ledger ?? []).map(t => ({
    id:          t.id,
    amount:      t.amount,
    type:        t.type ?? 'CREDIT',
    description: t.description ?? t.reference ?? 'Wallet transaction',
    date:        fmtDate(t.created_at ?? t.createdAt),
  }))
  return {
    balance:      r.balance ?? r.available_balance ?? r.availableBalance ?? 0,
    currency:     r.currency ?? '₦',
    transactions: txs.slice(0, 5),
  }
}

// ── Status badges ─────────────────────────────────────────────────────────────
function InstallmentBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string }> = {
    PAID:     { bg: 'bg-[#ecfdf3] border border-[#bbf7d0]', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]' },
    PENDING:  { bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500'  },
    UPCOMING: { bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500'  },
    OVERDUE:  { bg: 'bg-[#fef2f2] border border-[#fecdca]', text: 'text-[#d51520]',  dot: 'bg-[#d51520]' },
  }
  const c = cfg[status] ?? cfg.PENDING
  const label = status === 'PENDING' ? 'UPCOMING' : status
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  )
}

function PlanStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    ACTIVE:    { bg: 'bg-[#ecfdf3] border border-[#bbf7d0]', text: 'text-[#16a34a]' },
    COMPLETED: { bg: 'bg-gray-100 border border-gray-200',    text: 'text-gray-600'  },
    SUSPENDED: { bg: 'bg-amber-50 border border-amber-200',   text: 'text-amber-700' },
    DEFAULTED: { bg: 'bg-[#fef2f2] border border-[#fecdca]', text: 'text-[#d51520]' },
  }
  const c = cfg[status] ?? cfg.ACTIVE
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${c.bg} ${c.text}`}>
      {status}
    </span>
  )
}

function PaymentStatusDot({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    SUCCESS: 'bg-[#ecfdf3] text-[#15803d] border border-[#bbf7d0]',
    PENDING: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
    FAILED:  'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
  }
  const dot: Record<string, string> = { SUCCESS: '#15803d', PENDING: '#b45309', FAILED: '#dc2626' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display ${cfg[status] ?? 'bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb]'}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot[status] ?? '#6b7280' }} />
      {status || '—'}
    </span>
  )
}

// ── Pay button ────────────────────────────────────────────────────────────────
function PayButton({ plan, installment, onSuccess }: {
  plan: PaymentPlan
  installment: Installment
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      const axiosRes = await apiClient.post('/payments/initiate', {
        payment_type:               'ENROLLMENT',
        entity_id:                  plan.cohortId,
        pricing_plan_id:            plan.pricingPlanId,
        payment_option_id:          plan.paymentOptionId,
        enrollment_payment_plan_id: plan.id,
        payment_installment_id:     installment.id,
        payment_method:             'PAYSTACK',
        currency:                   plan.currency,
      })
      const res = unwrap<{ authorization_url?: string; authorizationUrl?: string; data?: { authorization_url?: string; authorizationUrl?: string } }>(axiosRes.data)
      const url = res.authorization_url ?? res.authorizationUrl
        ?? res.data?.authorization_url ?? res.data?.authorizationUrl
      if (url) {
        window.location.href = url
      } else {
        setError('Payment URL not returned. Please try again.')
      }
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setLoading(false)
      onSuccess()
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handlePay}
        disabled={loading}
        className="inline-flex items-center gap-2 text-[12px] font-semibold font-display px-3 py-1.5 rounded-[6px] bg-[#d51520] text-white hover:bg-[#b81119] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading
          ? <Loading01Icon size={12} className="animate-spin" />
          : <CreditCardIcon size={12} strokeWidth={1.5} />
        }
        {loading ? 'Processing…' : 'Pay Now'}
      </button>
      {error && <p className="text-[11px] text-[#d51520] font-body">{error}</p>}
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onPaySuccess }: { plan: PaymentPlan; onPaySuccess: () => void }) {
  const isSuspended = plan.status === 'SUSPENDED' || plan.status === 'DEFAULTED'
  const nextDue     = plan.installments.find(i => i.status === 'OVERDUE' || i.status === 'PENDING' || i.status === 'UPCOMING')
  const hasOverdue  = plan.installments.some(i => i.status === 'OVERDUE')
  const progressPct = plan.totalAmount > 0
    ? Math.min(100, Math.round((plan.amountPaid / plan.totalAmount) * 100))
    : 0

  const modeLabel = plan.paymentMode === 'FIXED_INSTALLMENT' ? 'Fixed Installment'
    : plan.paymentMode === 'FLEXIBLE' ? 'Flexible'
    : plan.paymentMode || 'Installment'

  const calcLabel = plan.calculationType === 'CUSTOM' ? 'Custom amounts'
    : plan.calculationType === 'EQUAL' ? 'Equal split'
    : ''

  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">

      {/* Access suspended alert */}
      {isSuspended && (
        <div className="mx-6 mt-5 flex items-start gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[8px] p-4">
          <LockIcon size={16} color="#d51520" strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#d51520] font-display">Access suspended</p>
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
              Your portal access has been suspended due to overdue payments. Pay your outstanding balance to restore access.
            </p>
          </div>
          {nextDue && <PayButton plan={plan} installment={nextDue} onSuccess={onPaySuccess} />}
        </div>
      )}

      {/* Overdue warning (not suspended) */}
      {!isSuspended && hasOverdue && (
        <div className="mx-6 mt-5 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-[8px] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertCircleIcon size={16} color="#d97706" strokeWidth={1.5} className="flex-shrink-0" />
            <p className="text-[13px] font-medium text-amber-800 font-body">
              You have an overdue payment. Pay now to maintain access.
            </p>
          </div>
          {nextDue && <PayButton plan={plan} installment={nextDue} onSuccess={onPaySuccess} />}
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
            <Invoice01Icon size={18} color="#d51520" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#111827] font-display leading-snug">{plan.label}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[12px] text-[#6b7280] font-body">
                {plan.paymentsCompleted} of {plan.numberOfInstallments} installments paid
              </p>
              {modeLabel && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] bg-[#f3f4f6] rounded-full px-2 py-0.5 font-display">
                  {modeLabel}{calcLabel ? ` · ${calcLabel}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <PlanStatusBadge status={plan.status} />
      </div>

      {/* Summary row */}
      <div className="mx-6 mb-4 grid grid-cols-3 divide-x divide-[#eaecf0] rounded-[8px] border border-[#eaecf0]">
        {[
          { label: 'Total',       value: fmt(plan.totalAmount)       },
          { label: 'Paid',        value: fmt(plan.amountPaid)        },
          { label: 'Outstanding', value: fmt(plan.amountOutstanding) },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3 px-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
            <p className="text-[15px] font-bold text-[#111827] font-display mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mx-6 mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] text-[#6b7280] font-body">Payment progress</p>
          <p className="text-[11px] font-semibold text-[#374151] font-display">{progressPct}%</p>
        </div>
        <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#d51520] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Next due date banner (active, non-overdue) */}
      {!isSuspended && !hasOverdue && nextDue && plan.status === 'ACTIVE' && (
        <div className="mx-6 mb-4 flex items-center justify-between gap-4 bg-[#fef2f2] border border-[#fecdca] rounded-[8px] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Calendar03Icon size={15} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-[#d51520] font-display">
                Next payment: {fmt(nextDue.outstanding || nextDue.amountDue)} due {nextDue.dueDate}
              </p>
              {nextDue.graceDueDate && (
                <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                  Grace period until {fmtDate(nextDue.graceDueDate)}
                </p>
              )}
            </div>
          </div>
          <PayButton plan={plan} installment={nextDue} onSuccess={onPaySuccess} />
        </div>
      )}

      {/* Installment schedule */}
      {plan.installments.length > 0 && (
        <>
          <div className="h-px bg-[#eaecf0]" />
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Installment Schedule
            </p>
            <div className="flex flex-col divide-y divide-[#f3f4f6]">
              {plan.installments.map(inst => {
                const isNext = inst.id === nextDue?.id && !isSuspended && !hasOverdue
                return (
                  <div
                    key={inst.id}
                    className={`flex items-center justify-between py-3.5 ${isNext ? 'bg-[#fef9f9] -mx-2 px-2 rounded-[6px]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold font-display ${
                        inst.status === 'PAID' ? 'bg-[#ecfdf3] text-[#16a34a]' :
                        inst.status === 'OVERDUE' ? 'bg-[#fef2f2] text-[#d51520]' :
                        'bg-[#f3f4f6] text-[#6b7280]'
                      }`}>
                        {inst.status === 'PAID'
                          ? <CheckmarkCircle01Icon size={14} strokeWidth={1.5} />
                          : inst.number}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#111827] font-display">
                          {fmt(inst.amountDue)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock01Icon size={10} color="#9ca3af" strokeWidth={1.5} />
                          <p className="text-[11px] text-[#6b7280] font-body">
                            Due {inst.dueDate}
                            {inst.graceDueDate ? ` · Grace until ${fmtDate(inst.graceDueDate)}` : ''}
                            {inst.paidAt ? ` · Paid ${fmtDate(inst.paidAt)}` : ''}
                          </p>
                        </div>
                        {inst.status !== 'PAID' && inst.outstanding > 0 && (
                          <p className="text-[11px] text-[#d51520] font-body mt-0.5">
                            {fmt(inst.outstanding)} outstanding
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <InstallmentBadge status={inst.status} />
                      {inst.status === 'OVERDUE' && inst.id === nextDue?.id && !isSuspended && (
                        <PayButton plan={plan} installment={inst} onSuccess={onPaySuccess} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Payment history (from plan detail) */}
      {plan.payments.length > 0 && (
        <>
          <div className="h-px bg-[#eaecf0]" />
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Payment History
            </p>
            <div className="flex flex-col divide-y divide-[#f3f4f6]">
              {plan.payments.map(p => {
                const roleLabel = p.role === 'INITIAL_PAYMENT' ? 'Initial payment'
                  : p.role === 'INSTALLMENT' ? 'Installment'
                  : p.role || 'Payment'
                return (
                  <div key={p.id} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#ecfdf3] flex items-center justify-center flex-shrink-0">
                      <Money01Icon size={14} color="#16a34a" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#111827] font-body">{roleLabel}</p>
                      <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                        {p.date}{p.reference ? ` · ${p.reference}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{fmt(p.amount)}</p>
                      <PaymentStatusDot status={p.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Wallet card ───────────────────────────────────────────────────────────────
function WalletCard({ wallet }: { wallet: Wallet | null }) {
  if (!wallet) return null

  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[#fef2f2] flex items-center justify-center">
            <Wallet01Icon size={18} color="#d51520" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Wallet Balance</p>
            <p className="text-[22px] font-bold text-[#111827] font-display leading-tight mt-0.5">
              {fmt(wallet.balance)}
            </p>
          </div>
        </div>
        <p className="text-[12px] text-[#6b7280] font-body max-w-[200px] text-right leading-snug">
          Wallet credit is automatically applied at checkout.
        </p>
      </div>

      {wallet.transactions.length > 0 && (
        <>
          <div className="h-px bg-[#eaecf0]" />
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Recent Transactions
            </p>
            <div className="flex flex-col divide-y divide-[#f3f4f6]">
              {wallet.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'CREDIT' ? 'bg-[#ecfdf3]' : 'bg-[#fef2f2]'
                    }`}>
                      <Money01Icon size={12}
                        color={tx.type === 'CREDIT' ? '#16a34a' : '#d51520'}
                        strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#374151] font-body">{tx.description}</p>
                      <p className="text-[10px] text-[#9ca3af] font-body">{tx.date}</p>
                    </div>
                  </div>
                  <p className={`text-[13px] font-semibold font-display ${
                    tx.type === 'CREDIT' ? 'text-[#16a34a]' : 'text-[#d51520]'
                  }`}>
                    {tx.type === 'CREDIT' ? '+' : '−'}{fmt(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Recent Payments (full-payment students / general history) ─────────────────
interface StudentPayment {
  id: number
  amount?: number; payable_amount?: number; payableAmount?: number
  currency?: string; payable_currency?: string; payableCurrency?: string
  payment_status?: string; paymentStatus?: string; status?: string
  payment_reference?: string; paymentReference?: string
  payment_type?: string; paymentType?: string
  created_at?: string; createdAt?: string
}

const SP_STYLE: Record<string, string> = {
  SUCCESS: 'bg-[#ecfdf3] text-[#15803d] border border-[#bbf7d0]',
  PENDING: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
  FAILED:  'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
}
const SP_DOT: Record<string, string> = {
  SUCCESS: '#15803d', PENDING: '#b45309', FAILED: '#dc2626',
}

function spStatus(p: StudentPayment)  { return (p.payment_status ?? p.paymentStatus ?? p.status ?? '').toUpperCase() }
function spRef(p: StudentPayment)     { return p.payment_reference ?? p.paymentReference ?? '' }
function spAmount(p: StudentPayment)  {
  const amt = p.payable_amount ?? p.payableAmount ?? p.amount
  const cur = p.payable_currency ?? p.payableCurrency ?? p.currency ?? 'NGN'
  if (amt == null) return '—'
  return `${cur === 'USD' ? '$' : '₦'}${amt.toLocaleString('en-NG')}`
}

function PaymentStatusPill({ payment, onUpdated }: { payment: StudentPayment; onUpdated: (p: StudentPayment) => void }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const wrapRef               = useRef<HTMLDivElement>(null)
  const status  = spStatus(payment)
  const ref     = spRef(payment)
  const pending = status === 'PENDING'

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function requery(e: React.MouseEvent) {
    e.stopPropagation()
    if (!ref || loading) return
    setOpen(false); setLoading(true)
    try {
      const res   = await apiClient.get(`/payments/requery/${ref}`)
      const body  = res.data as Record<string, unknown>
      const inner = (body?.data ?? body) as Record<string, unknown>
      const nested = (inner?.payment ?? inner?.transaction ?? {}) as Record<string, unknown>
      const newStatus = (
        (inner?.payment_status ?? inner?.paymentStatus ?? inner?.status ??
         nested?.payment_status ?? nested?.paymentStatus ?? nested?.status ?? status) as string
      ).toUpperCase()
      const changed = newStatus !== status
      onUpdated({ ...payment, payment_status: newStatus, paymentStatus: newStatus, status: newStatus })
      setToast({
        msg: changed ? `Payment is now ${newStatus}` : 'Payment is still pending — try again shortly',
        ok: changed,
      })
    } catch (err) {
      setToast({ msg: getApiError(err), ok: false })
    } finally { setLoading(false) }
  }

  const base = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display'

  return (
    <div className="relative inline-block" ref={wrapRef}>
      {toast && (
        <div className={`absolute bottom-full mb-2 right-0 whitespace-nowrap px-3 py-1.5 rounded-[8px] text-[12px] font-body shadow-md z-20 ${
          toast.ok ? 'bg-[#ecfdf3] text-[#15803d] border border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]'
        }`}>{toast.msg}</div>
      )}
      {!pending ? (
        <span className={`${base} ${SP_STYLE[status] ?? 'bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb]'}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SP_DOT[status] ?? '#6b7280' }} />
          {status || '—'}
        </span>
      ) : (
        <>
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
            disabled={loading}
            className={`${base} ${SP_STYLE.PENDING} hover:opacity-80 transition-opacity disabled:opacity-60 cursor-pointer`}
          >
            {loading
              ? <Loading01Icon size={11} className="animate-spin flex-shrink-0" strokeWidth={2} />
              : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#b45309]" />}
            {loading ? 'Checking…' : 'PENDING'}
            {!loading && <ArrowDown01Icon size={10} strokeWidth={2} />}
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1.5 bg-white border border-[#e5e7eb] rounded-[8px] shadow-lg z-10 min-w-[150px] overflow-hidden">
              <button
                onClick={requery}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors font-body"
              >
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

function RecentPayments() {
  const [payments, setPayments] = useState<StudentPayment[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    apiClient.get('/payments?size=10')
      .then(res => {
        const body  = res.data as Record<string, unknown>
        const inner = (body?.data ?? body) as Record<string, unknown>
        const list  = Array.isArray(inner?.payments) ? inner.payments
          : Array.isArray(inner)                     ? inner
          : []
        setPayments(list as StudentPayment[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleUpdated(updated: StudentPayment) {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  if (loading) return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] p-6">
      <div className="h-4 w-40 bg-[#f3f4f6] rounded animate-pulse mb-4" />
      {[1,2,3].map(i => <div key={i} className="h-12 bg-[#f3f4f6] rounded animate-pulse mb-2" />)}
    </div>
  )

  if (payments.length === 0) return null

  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0]">
      <div className="px-5 py-4 border-b border-[#f3f4f6]">
        <p className="text-[14px] font-semibold text-[#111827] font-display">All Payments</p>
        <p className="text-[12px] text-[#6b7280] font-body mt-0.5">Your full transaction history</p>
      </div>
      <div className="divide-y divide-[#f3f4f6]">
        {payments.map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-8 h-8 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
              <Payment01Icon size={14} color="#6b7280" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#111827] font-body truncate">
                {p.payment_type ?? p.paymentType ?? 'Payment'}
              </p>
              <p className="text-[11px] text-[#6b7280] font-body mt-0.5">
                {new Date(p.created_at ?? p.createdAt ?? '').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                {spRef(p) ? ` · ${spRef(p)}` : ''}
              </p>
            </div>
            <p className="text-[13px] font-semibold text-[#111827] font-display flex-shrink-0">{spAmount(p)}</p>
            <PaymentStatusPill payment={p} onUpdated={handleUpdated} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [plans,         setPlans]         = useState<PaymentPlan[]>([])
  const [wallet,        setWallet]        = useState<Wallet | null>(null)
  const [loadingPlans,  setLoadingPlans]  = useState(true)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  // unwrap() takes res.data (the JSON body), not a Promise — call it correctly
  const dig = (val: unknown): Record<string, unknown> => {
    if (val && typeof val === 'object') return val as Record<string, unknown>
    return {}
  }

  const loadData = useCallback(async () => {
    setError(null)

    const [walletRes, plansRes] = await Promise.allSettled([
      apiClient.get('/me/wallet'),
      apiClient.get('/me/enrollment-payment-plans'),
    ])

    // ── Wallet ──────────────────────────────────────────────────────────────────
    setLoadingWallet(false)
    if (walletRes.status === 'fulfilled') {
      // res.data = { success, data: { balance, ... } }  OR  { balance, ... }
      const body  = dig(walletRes.value.data)
      const inner = dig(body.data ?? body)
      setWallet(normaliseWallet(inner as ApiWallet))
    }

    // ── Plans list ──────────────────────────────────────────────────────────────
    setLoadingPlans(false)
    if (plansRes.status === 'fulfilled') {
      // res.data = { success, data: { enrollment_payment_plans: [...] } }
      const body  = dig(plansRes.value.data)
      const inner = dig(body.data ?? body)

      const extractList = (val: unknown): ApiPaymentPlan[] => {
        if (Array.isArray(val)) return val as ApiPaymentPlan[]
        if (val && typeof val === 'object') {
          const o = val as Record<string, unknown>
          for (const key of ['enrollment_payment_plans', 'enrollmentPaymentPlans', 'payment_plans', 'paymentPlans', 'plans']) {
            if (Array.isArray(o[key])) return o[key] as ApiPaymentPlan[]
          }
        }
        return []
      }

      const list = extractList(inner)
      if (list.length === 0) { setPlans([]); return }

      // Fetch detail for each plan to get installments + payment history
      const details = await Promise.allSettled(
        list.map(p => apiClient.get(`/me/enrollment-payment-plans/${p.id}`))
      )

      const normalised = details.map((d, i) => {
        if (d.status === 'fulfilled') {
          // res.data = { success, data: { enrollment_payment_plan: { ...installments } } }
          const body  = dig(d.value.data)
          const inner = dig(body.data ?? body)
          const plan  = (inner.enrollment_payment_plan ?? inner) as ApiPaymentPlan
          if (!plan.installments && !plan.payment_schedule) {
            return normalisePlan({ ...list[i], ...plan })
          }
          return normalisePlan(plan)
        }
        return normalisePlan(list[i])
      })

      setPlans(normalised)
    } else {
      setError(getApiError(plansRes.reason))
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const hasAnything = plans.length > 0 || wallet !== null
  const isLoading   = loadingPlans && loadingWallet

  return (
    <>
      <TopNav title="Finance" />

      <div className="px-4 lg:px-8 pb-10">
        <div className="pt-6 pb-5">
          <h1 className="text-[22px] lg:text-[28px] font-semibold text-[#111827] font-display leading-tight">
            Finance
          </h1>
          <p className="text-[13px] lg:text-[14px] text-[#6b7280] font-body mt-1">
            View your payment plans, installment schedule, and wallet balance.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loading01Icon size={28} color="#d51520" className="animate-spin" />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-5">
            <AlertCircleIcon size={18} color="#d51520" strokeWidth={1.5} />
            <p className="text-[13px] text-[#d51520] font-body">{error}</p>
          </div>
        )}

        {!isLoading && !error && !hasAnything && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
              <Payment01Icon size={28} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-semibold text-[#111827] font-display mb-1">No payment plans</p>
            <p className="text-[14px] text-[#6b7280] font-body max-w-[300px]">
              You don&apos;t have any active installment plans. This page will show your payment schedule once you enrol with a part-payment option.
            </p>
          </div>
        )}

        {!isLoading && !error && hasAnything && (
          <div className="flex flex-col gap-5">
            <WalletCard wallet={wallet} />

            {plans.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-semibold text-[#111827] font-display">Payment Plans</p>
                  <span className="text-[11px] font-semibold text-[#6b7280] bg-[#f3f4f6] rounded-full px-2.5 py-0.5 font-display">
                    {plans.length}
                  </span>
                </div>
                {plans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} onPaySuccess={loadData} />
                ))}
              </div>
            )}

            <RecentPayments />
          </div>
        )}
      </div>
    </>
  )
}
