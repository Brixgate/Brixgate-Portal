'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiInstallment {
  id: number
  installment_number?: number; installmentNumber?: number
  amount: number
  due_date?: string; dueDate?: string
  status: 'PAID' | 'UPCOMING' | 'OVERDUE'
  paid_at?: string; paidAt?: string
}

interface ApiPaymentPlan {
  id: number
  cohort_id?: number; cohortId?: number
  cohort_title?: string; cohortTitle?: string
  program_title?: string; programTitle?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'DEFAULTED' | 'COMPLETED' | string
  total_amount?: number; totalAmount?: number
  amount_paid?: number; amountPaid?: number
  amount_outstanding?: number; amountOutstanding?: number
  number_of_installments?: number; numberOfInstallments?: number
  installments?: ApiInstallment[]
  payment_schedule?: ApiInstallment[]
  pricing_plan_id?: number; pricingPlanId?: number
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
  amount: number
  dueDate: string
  status: 'PAID' | 'UPCOMING' | 'OVERDUE'
  paidAt: string | null
}

interface PaymentPlan {
  id: number
  cohortId: number
  label: string          // "Programme — Cohort"
  status: string
  totalAmount: number
  amountPaid: number
  amountOutstanding: number
  installments: Installment[]
  pricingPlanId: number | null
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
    id:     r.id,
    number: r.installment_number ?? r.installmentNumber ?? (i + 1),
    amount: r.amount,
    dueDate: fmtDate(r.due_date ?? r.dueDate),
    status: r.status,
    paidAt: r.paid_at ?? r.paidAt ?? null,
  }))
}

function normalisePlan(r: ApiPaymentPlan): PaymentPlan {
  const prog   = r.program_title ?? r.programTitle ?? 'Programme'
  const cohort = r.cohort_title  ?? r.cohortTitle  ?? ''
  const installments = normaliseInstallments(r.installments ?? r.payment_schedule ?? [])
  return {
    id:                r.id,
    cohortId:          r.cohort_id ?? r.cohortId ?? 0,
    label:             cohort ? `${prog} — ${cohort}` : prog,
    status:            r.status,
    totalAmount:       r.total_amount       ?? r.totalAmount       ?? 0,
    amountPaid:        r.amount_paid        ?? r.amountPaid        ?? 0,
    amountOutstanding: r.amount_outstanding ?? r.amountOutstanding ?? 0,
    installments,
    pricingPlanId:     r.pricing_plan_id ?? r.pricingPlanId ?? null,
    currency:          r.currency ?? 'NGN',
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

// ── Status badge ──────────────────────────────────────────────────────────────
function InstallmentBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string }> = {
    PAID:     { bg: 'bg-[#ecfdf3] border border-[#bbf7d0]', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]' },
    UPCOMING: { bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500'  },
    OVERDUE:  { bg: 'bg-[#fef2f2] border border-[#fecdca]', text: 'text-[#d51520]',  dot: 'bg-[#d51520]' },
  }
  const c = cfg[status] ?? cfg.UPCOMING
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
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

// ── Pay button ────────────────────────────────────────────────────────────────
function PayButton({ plan, installment: _installment, onSuccess: _onSuccess }: {
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
      const res = await unwrap<{ authorization_url?: string; authorizationUrl?: string; data?: { authorization_url?: string; authorizationUrl?: string } }>(
        apiClient.post('/payments/initiate', {
          payment_type:               'ENROLLMENT',
          entity_id:                  plan.cohortId,
          pricing_plan_id:            plan.pricingPlanId,
          enrollment_payment_plan_id: plan.id,
          payment_method:             'PAYSTACK',
          currency:                   plan.currency,
        })
      )
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
  const hasOverdue  = plan.installments.some(i => i.status === 'OVERDUE')
  const nextDue     = plan.installments.find(i => i.status === 'OVERDUE' || i.status === 'UPCOMING')
  const paidCount   = plan.installments.filter(i => i.status === 'PAID').length
  const total       = plan.installments.length

  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
      {/* Suspended / overdue alert */}
      {isSuspended && (
        <div className="mx-6 mt-5 flex items-start gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[8px] p-4">
          <LockIcon size={16} color="#d51520" strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#d51520] font-display">Access suspended</p>
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
              Your access has been suspended due to overdue payments. Pay your outstanding balance to restore access.
            </p>
          </div>
          {nextDue && (
            <PayButton plan={plan} installment={nextDue} onSuccess={onPaySuccess} />
          )}
        </div>
      )}

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
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
              {paidCount} of {total} installments paid
            </p>
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
      {plan.totalAmount > 0 && (
        <div className="mx-6 mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-[#6b7280] font-body">Payment progress</p>
            <p className="text-[11px] font-semibold text-[#374151] font-display">
              {Math.round((plan.amountPaid / plan.totalAmount) * 100)}%
            </p>
          </div>
          <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d51520] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((plan.amountPaid / plan.totalAmount) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Installments table */}
      {plan.installments.length > 0 && (
        <>
          <div className="h-px bg-[#eaecf0]" />
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Installment Schedule
            </p>
            <div className="flex flex-col divide-y divide-[#f3f4f6]">
              {plan.installments.map(inst => (
                <div key={inst.id} className="flex items-center justify-between py-3">
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
                        {fmt(inst.amount)}
                      </p>
                      <p className="text-[11px] text-[#6b7280] font-body mt-0.5">
                        Due {inst.dueDate}
                        {inst.paidAt ? ` · Paid ${fmtDate(inst.paidAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <InstallmentBadge status={inst.status} />
                    {(inst.status === 'OVERDUE' || (inst.status === 'UPCOMING' && !plan.installments.find(x => x.status === 'OVERDUE'))) &&
                     inst === nextDue && !isSuspended && (
                      <PayButton plan={plan} installment={inst} onSuccess={onPaySuccess} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Wallet card ───────────────────────────────────────────────────────────────
function WalletCard({ wallet }: { wallet: Wallet | null; loading: boolean }) {
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [plans,         setPlans]         = useState<PaymentPlan[]>([])
  const [wallet,        setWallet]        = useState<Wallet | null>(null)
  const [loadingPlans,  setLoadingPlans]  = useState(true)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setError(null)
    // Load wallet + plan list in parallel
    const [walletRes, plansRes] = await Promise.allSettled([
      unwrap<ApiWallet | { data?: ApiWallet }>(apiClient.get('/me/wallet')),
      unwrap<ApiPaymentPlan[] | { data?: ApiPaymentPlan[] }>(apiClient.get('/me/enrollment-payment-plans')),
    ])

    // Wallet
    setLoadingWallet(false)
    if (walletRes.status === 'fulfilled') {
      const raw = walletRes.value as ApiWallet & { data?: ApiWallet }
      const w = raw.data ?? raw
      setWallet(normaliseWallet(w))
    }

    // Plans list — then fetch each detail to get installment schedules
    setLoadingPlans(false)
    if (plansRes.status === 'fulfilled') {
      const raw   = plansRes.value as (ApiPaymentPlan[] | { data?: ApiPaymentPlan[] })
      const list  = (Array.isArray(raw) ? raw : raw.data ?? []) as ApiPaymentPlan[]

      if (list.length === 0) { setPlans([]); return }

      // Fetch detail for each plan (has installments)
      const details = await Promise.allSettled(
        list.map(p =>
          unwrap<ApiPaymentPlan | { data?: ApiPaymentPlan }>(
            apiClient.get(`/me/enrollment-payment-plans/${p.id}`)
          )
        )
      )

      const normalised = details.map((d, i) => {
        if (d.status === 'fulfilled') {
          const raw = d.value as ApiPaymentPlan & { data?: ApiPaymentPlan }
          return normalisePlan(raw.data ?? raw)
        }
        return normalisePlan(list[i])
      })

      setPlans(normalised)
    } else {
      setError(getApiError(plansRes.reason))
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const hasAnything  = plans.length > 0 || wallet !== null
  const isLoading    = loadingPlans && loadingWallet

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

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loading01Icon size={28} color="#d51520" className="animate-spin" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex items-center gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-5">
            <AlertCircleIcon size={18} color="#d51520" strokeWidth={1.5} />
            <p className="text-[13px] text-[#d51520] font-body">{error}</p>
          </div>
        )}

        {/* No payment plans */}
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
            {/* Wallet */}
            <WalletCard wallet={wallet} loading={loadingWallet} />

            {/* Plans */}
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
          </div>
        )}
      </div>
    </>
  )
}
