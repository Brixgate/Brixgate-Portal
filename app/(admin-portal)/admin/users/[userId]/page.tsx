'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, AlertCircleIcon,
  CheckmarkCircle01Icon, Invoice01Icon, Wallet01Icon,
  Money01Icon, UserBlock01Icon,
} from 'hugeicons-react'
import { apiClient, getApiError } from '@/lib/api-client'

// ── API types ──────────────────────────────────────────────────────────────────
interface ApiUser {
  id: number
  name?: string; full_name?: string
  first_name?: string; firstName?: string
  last_name?: string; lastName?: string
  email: string
  role?: string
  status?: number   // 1 = active, 0 = suspended
  phone?: string; phone_number?: string; phoneNumber?: string; full_phone_number?: string; fullPhoneNumber?: string
  created_at?: string; createdAt?: string
  last_login_at?: string; lastLoginAt?: string
}

interface ApiInstallment {
  id: number
  installment_number?: number; installmentNumber?: number
  amount_due?: number; amount?: number   // API field is amount_due
  amount_paid?: number
  outstanding_amount?: number
  due_date?: string; dueDate?: string
  grace_due_date?: string
  status: 'PAID' | 'PENDING' | 'UPCOMING' | 'OVERDUE'
  paid_at?: string; paidAt?: string
}

interface ApiPlan {
  id: number
  cohort_id?: number; cohortId?: number
  program_id?: number
  cohort_title?: string; cohortTitle?: string
  program_title?: string; programTitle?: string
  payment_mode?: string
  next_due_date?: string
  status: string
  access_status?: string
  total_amount?: number; totalAmount?: number
  amount_paid?: number; amountPaid?: number
  outstanding_amount?: number; amount_outstanding?: number; amountOutstanding?: number
  installments?: ApiInstallment[]
  payment_schedule?: ApiInstallment[]
}

interface ApiWalletTx {
  id: number; amount: number
  type?: string; description?: string; reference?: string
  created_at?: string; createdAt?: string
  reason?: string; note?: string
}

interface ApiWallet {
  balance?: number; available_balance?: number; availableBalance?: number
  currency?: string
  transactions?: ApiWalletTx[]; ledger?: ApiWalletTx[]; entries?: ApiWalletTx[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function uName(u?: ApiUser | null): string {
  if (!u) return '—'
  if (u.name || u.full_name) return (u.name ?? u.full_name)!
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function fmt(n: number) {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PLAN_STATUS: Record<string, { bg: string; text: string }> = {
  ACTIVE:    { bg: 'bg-[#ecfdf3] border border-[#bbf7d0]', text: 'text-[#16a34a]' },
  COMPLETED: { bg: 'bg-gray-100 border border-gray-200',    text: 'text-gray-600'  },
  SUSPENDED: { bg: 'bg-amber-50 border border-amber-200',   text: 'text-amber-700' },
  DEFAULTED: { bg: 'bg-[#fef2f2] border border-[#fecdca]', text: 'text-[#d51520]' },
}

const INST_STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  PAID:     { bg: 'bg-[#ecfdf3] border border-[#bbf7d0]', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]' },
  PENDING:  { bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700',   dot: 'bg-blue-500'  },
  UPCOMING: { bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700',   dot: 'bg-blue-500'  },
  OVERDUE:  { bg: 'bg-[#fef2f2] border border-[#fecdca]', text: 'text-[#d51520]', dot: 'bg-[#d51520]' },
}

const ROLE_STYLE: Record<string, string> = {
  ADMIN:      'bg-[#fef2f2] text-[#d51520]',
  INSTRUCTOR: 'bg-[#eff6ff] text-[#1d4ed8]',
  STUDENT:    'bg-[#ecfdf3] text-[#027a48]',
  PROSPECT:   'bg-[#fffbeb] text-[#b45309]',
}

// ── Wallet adjust modal ────────────────────────────────────────────────────────
function AdjustWalletModal({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [amount,  setAmount]  = useState('')
  const [type,    setType]    = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [reason,  setReason]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit() {
    const n = parseFloat(amount)
    if (!n || n <= 0) { setError('Enter a valid positive amount'); return }
    if (!reason.trim())   { setError('Reason is required'); return }
    setSaving(true); setError('')
    try {
      await apiClient.post(`/admin/users/${userId}/wallet/adjust`, {
        amount: n, type, reason: reason.trim(),
      })
      onDone()
    } catch (e) { setError(getApiError(e)) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[440px] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h3 className="text-[15px] font-bold text-[#111827] font-display">Adjust Wallet Balance</h3>
          <p className="text-[12px] text-[#6b7280] font-body mt-0.5">Every adjustment is recorded in the ledger.</p>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Credit / Debit */}
          <div>
            <p className="text-[12px] font-medium text-[#374151] font-body mb-1.5">Adjustment Type</p>
            <div className="flex gap-2">
              {(['CREDIT', 'DEBIT'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold font-display border transition-colors ${
                    type === t
                      ? t === 'CREDIT' ? 'bg-[#ecfdf3] border-[#bbf7d0] text-[#16a34a]' : 'bg-[#fef2f2] border-[#fecdca] text-[#d51520]'
                      : 'bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                  }`}>
                  {t === 'CREDIT' ? '+ Add Credit' : '− Deduct'}
                </button>
              ))}
            </div>
          </div>
          {/* Amount */}
          <div>
            <p className="text-[12px] font-medium text-[#374151] font-body mb-1.5">Amount (₦)</p>
            <input
              type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full h-10 px-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
            />
          </div>
          {/* Reason */}
          <div>
            <p className="text-[12px] font-medium text-[#374151] font-body mb-1.5">Reason</p>
            <textarea
              rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Overpayment refund, scholarship credit…"
              className="w-full px-3.5 py-2.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none"
            />
          </div>
          {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}</p>}
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}

// ── Suspend / Activate modal ──────────────────────────────────────────────────
function SuspendModal({ user, onClose, onDone }: { user: ApiUser; onClose: () => void; onDone: (updated: ApiUser) => void }) {
  const isSuspended = user.status === 0
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit() {
    setSaving(true); setError('')
    try {
      const newStatus = isSuspended ? 1 : 0
      await apiClient.patch(`/admin/users/${user.id}`, { status: newStatus })
      onDone({ ...user, status: newStatus })
    } catch (e) { setError(getApiError(e)) } finally { setSaving(false) }
  }

  const action = isSuspended ? 'Reactivate' : 'Suspend'
  const actionColor = isSuspended
    ? 'bg-[#d51520] hover:bg-[#b81119]'
    : 'bg-[#374151] hover:bg-[#111827]'

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[420px] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h3 className="text-[15px] font-bold text-[#111827] font-display">{action} Account</h3>
          <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
            {isSuspended
              ? 'This will restore access for this user.'
              : 'This will immediately block login access for this user.'}
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 bg-[#f9fafb] rounded-[8px] p-4">
            <div className="w-9 h-9 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
              <UserBlock01Icon size={16} color="#d51520" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#111827] font-body">{uName(user)}</p>
              <p className="text-[12px] text-[#6b7280] font-body">{user.email}</p>
            </div>
          </div>
          {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body mt-3"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}</p>}
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold text-white font-display disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${actionColor}`}>
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            {saving ? 'Saving…' : `${action} Account`}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminUserProfilePage() {
  const params  = useParams()
  const router  = useRouter()
  const userId  = params.userId as string

  const [user,         setUser]         = useState<ApiUser | null>(null)
  const [plans,        setPlans]        = useState<ApiPlan[]>([])
  const [wallet,       setWallet]       = useState<ApiWallet | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [adjustModal,  setAdjustModal]  = useState(false)
  const [suspendModal, setSuspendModal] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [userRes, plansRes, walletRes] = await Promise.allSettled([
        apiClient.get(`/admin/users/${userId}`),
        apiClient.get(`/admin/enrollment-payment-plans?user_id=${userId}`),
        apiClient.get(`/admin/users/${userId}/wallet`),
      ])

      if (userRes.status === 'fulfilled') {
        const raw = userRes.value.data
        setUser((raw?.data ?? raw) as ApiUser)
      }

      if (plansRes.status === 'fulfilled') {
        const raw   = plansRes.value.data
        const outer = raw?.data ?? raw
        // List endpoint returns enrollment_payment_plans (plural) or a plain array
        const list  = (
          Array.isArray(outer?.enrollment_payment_plans) ? outer.enrollment_payment_plans
          : Array.isArray(outer)                          ? outer
          : Array.isArray(outer?.plans)                   ? outer.plans
          : Array.isArray(outer?.content)                 ? outer.content
          : Array.isArray(outer?.items)                   ? outer.items
          : []
        ) as ApiPlan[]

        // Enrich each plan with its full installment schedule
        const details = await Promise.allSettled(
          list.map(p => apiClient.get(`/admin/enrollment-payment-plans/${p.id}`))
        )
        const enriched = details.map((d, i) => {
          if (d.status === 'fulfilled') {
            const r = d.value.data
            // Detail endpoint wraps result in enrollment_payment_plan (singular)
            return (r?.data?.enrollment_payment_plan ?? r?.data ?? r) as ApiPlan
          }
          return list[i]
        })
        setPlans(enriched)
      } else {
        setError(getApiError(plansRes.reason))
      }

      if (walletRes.status === 'fulfilled') {
        const raw = walletRes.value.data
        setWallet((raw?.data ?? raw) as ApiWallet)
      }
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  const displayName = user ? uName(user) : `User #${userId}`
  const walletBal   = wallet?.balance ?? wallet?.available_balance ?? wallet?.availableBalance ?? 0
  const walletTxs   = (wallet?.transactions ?? wallet?.ledger ?? wallet?.entries ?? []).slice(0, 10)

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 bg-white border-b border-[#f3f4f6]">
        <button onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        <div>
          <p className="text-[11px] text-[#9ca3af] font-body">Admin · Users</p>
          <h1 className="text-[15px] font-bold text-[#111827] font-display">{displayName}</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loading01Icon size={28} color="#d51520" className="animate-spin" />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">

          {/* Profile card */}
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                <span className="text-[20px] font-bold text-[#d51520] font-display">{initials(displayName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] font-bold text-[#111827] font-display">{displayName}</h2>
                  {user?.role && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${ROLE_STYLE[user.role.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                      {user.role}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#6b7280] font-body mt-0.5">{user?.email ?? '—'}</p>
                {(user?.full_phone_number ?? user?.phone ?? user?.phone_number ?? user?.phoneNumber) && (
                  <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
                    {user?.full_phone_number ?? user?.phone ?? user?.phone_number ?? user?.phoneNumber}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {user?.status != null && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${
                    user.status === 1 ? 'bg-[#ecfdf3] text-[#16a34a]' : 'bg-[#fef2f2] text-[#d51520]'
                  }`}>
                    {user.status === 1 ? 'Active' : 'Suspended'}
                  </span>
                )}
                <p className="text-[11px] text-[#9ca3af] font-body">
                  Joined {fmtDate(user?.created_at ?? user?.createdAt)}
                </p>
                {user && (
                  <button
                    onClick={() => setSuspendModal(true)}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-[7px] border text-[11px] font-semibold font-display transition-colors ${
                      user.status === 0
                        ? 'border-[#bbf7d0] text-[#16a34a] hover:bg-[#ecfdf3]'
                        : 'border-[#fecdca] text-[#d51520] hover:bg-[#fef2f2]'
                    }`}
                  >
                    <UserBlock01Icon size={12} strokeWidth={1.5} />
                    {user.status === 0 ? 'Reactivate' : 'Suspend'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-4">
              <AlertCircleIcon size={16} color="#d51520" strokeWidth={1.5} />
              <p className="text-[13px] text-[#d51520] font-body">{error}</p>
            </div>
          )}

          {/* Wallet */}
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#f3f4f6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[#fef2f2] flex items-center justify-center">
                  <Wallet01Icon size={18} color="#d51520" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Wallet Balance</p>
                  <p className="text-[22px] font-bold text-[#111827] font-display leading-tight">{fmt(walletBal)}</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustModal(true)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[12px] font-semibold font-display text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                <Money01Icon size={13} color="#374151" strokeWidth={1.5} />
                Adjust Balance
              </button>
            </div>

            {walletTxs.length > 0 ? (
              <div className="px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">Recent Ledger</p>
                <div className="flex flex-col divide-y divide-[#f3f4f6]">
                  {walletTxs.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'CREDIT' ? 'bg-[#ecfdf3]' : 'bg-[#fef2f2]'
                        }`}>
                          <Money01Icon size={13}
                            color={tx.type === 'CREDIT' ? '#16a34a' : '#d51520'}
                            strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-[#374151] font-body">
                            {tx.description ?? tx.reason ?? tx.note ?? tx.reference ?? 'Adjustment'}
                          </p>
                          <p className="text-[10px] text-[#9ca3af] font-body">{fmtDate(tx.created_at ?? tx.createdAt)}</p>
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
            ) : (
              <div className="px-6 py-5 text-center">
                <p className="text-[13px] text-[#9ca3af] font-body">No wallet transactions yet</p>
              </div>
            )}
          </div>

          {/* Payment plans */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[15px] font-semibold text-[#111827] font-display">Payment Plans</p>
              {plans.length > 0 && (
                <span className="text-[11px] font-semibold text-[#6b7280] bg-[#f3f4f6] rounded-full px-2 py-0.5 font-display">
                  {plans.length}
                </span>
              )}
            </div>

            {plans.length === 0 ? (
              <div className="bg-white rounded-[10px] border border-[#eaecf0] py-10 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mb-3">
                  <Invoice01Icon size={22} color="#9ca3af" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">No installment plans</p>
                <p className="text-[12px] text-[#9ca3af] font-body max-w-[240px]">
                  This student enrolled with a full payment — no installment plan exists.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {plans.map(plan => {
                  const insts = plan.installments ?? plan.payment_schedule ?? []
                  const paidCount = insts.filter(i => i.status === 'PAID').length
                  const total = insts.length
                  const outstanding = plan.outstanding_amount ?? plan.amount_outstanding ?? plan.amountOutstanding ?? 0
                  const prog  = plan.total_amount ?? plan.totalAmount ?? 0
                  const paid  = plan.amount_paid  ?? plan.amountPaid  ?? 0
                  const pct   = prog > 0 ? Math.round((paid / prog) * 100) : 0
                  const sc    = PLAN_STATUS[plan.status] ?? PLAN_STATUS.ACTIVE
                  const label = [plan.program_title ?? plan.programTitle, plan.cohort_title ?? plan.cohortTitle]
                    .filter(Boolean).join(' — ') || `Plan #${plan.id}`
                  const isExpanded = expandedPlan === plan.id

                  return (
                    <div key={plan.id} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
                      {/* Plan header */}
                      <button
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                        className="w-full px-6 pt-5 pb-4 flex items-start justify-between gap-4 text-left hover:bg-[#fafafa] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[8px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                            <Invoice01Icon size={17} color="#d51520" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-[14px] font-semibold text-[#111827] font-display leading-snug">{label}</p>
                            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
                              {paidCount} of {total} installments paid
                              {plan.payment_mode && ` · ${plan.payment_mode.replace(/_/g, ' ')}`}
                            </p>
                            {plan.next_due_date && outstanding > 0 && (
                              <p className="text-[11px] text-[#d97706] font-body mt-0.5">
                                Next due: {fmtDate(plan.next_due_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold font-display ${sc.bg} ${sc.text}`}>
                            {plan.status}
                          </span>
                        </div>
                      </button>

                      {/* Summary row */}
                      <div className="mx-6 mb-4 grid grid-cols-3 divide-x divide-[#eaecf0] rounded-[8px] border border-[#eaecf0]">
                        {[
                          { label: 'Total',       value: fmt(plan.total_amount ?? plan.totalAmount ?? 0) },
                          { label: 'Paid',        value: fmt(plan.amount_paid ?? plan.amountPaid ?? 0) },
                          { label: 'Outstanding', value: fmt(outstanding) },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col items-center py-2.5 px-3">
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
                            <p className="text-[14px] font-bold text-[#111827] font-display mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      {prog > 0 && (
                        <div className="mx-6 mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] text-[#6b7280] font-body">Payment progress</p>
                            <p className="text-[11px] font-semibold text-[#374151] font-display">{pct}%</p>
                          </div>
                          <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                            <div className="h-full bg-[#d51520] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Installments — expandable */}
                      {isExpanded && insts.length > 0 && (
                        <>
                          <div className="h-px bg-[#eaecf0]" />
                          <div className="px-6 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
                              Installment Schedule
                            </p>
                            <div className="flex flex-col divide-y divide-[#f3f4f6]">
                              {insts.map((inst, idx) => {
                                const sc = INST_STATUS[inst.status] ?? INST_STATUS.UPCOMING
                                const num = inst.installment_number ?? inst.installmentNumber ?? (idx + 1)
                                return (
                                  <div key={inst.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold font-display ${
                                        inst.status === 'PAID' ? 'bg-[#ecfdf3] text-[#16a34a]' :
                                        inst.status === 'OVERDUE' ? 'bg-[#fef2f2] text-[#d51520]' :
                                        'bg-[#f3f4f6] text-[#6b7280]'
                                      }`}>
                                        {inst.status === 'PAID'
                                          ? <CheckmarkCircle01Icon size={14} strokeWidth={1.5} />
                                          : num}
                                      </div>
                                      <div>
                                        <p className="text-[13px] font-semibold text-[#111827] font-display">
                                          {fmt(inst.amount_due ?? inst.amount ?? 0)}
                                        </p>
                                        <p className="text-[11px] text-[#6b7280] font-body mt-0.5">
                                          Due {fmtDate(inst.due_date ?? inst.dueDate)}
                                          {(inst.paid_at ?? inst.paidAt) ? ` · Paid ${fmtDate(inst.paid_at ?? inst.paidAt)}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${sc.bg} ${sc.text}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                      {inst.status}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Expand / collapse toggle */}
                      {insts.length > 0 && (
                        <button
                          onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                          className="w-full py-3 text-[12px] font-semibold text-[#6b7280] font-display border-t border-[#f3f4f6] hover:bg-[#fafafa] transition-colors"
                        >
                          {isExpanded ? 'Hide schedule' : `View ${total} installment${total !== 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {adjustModal && (
        <AdjustWalletModal
          userId={userId}
          onClose={() => setAdjustModal(false)}
          onDone={() => { setAdjustModal(false); loadAll() }}
        />
      )}

      {suspendModal && user && (
        <SuspendModal
          user={user}
          onClose={() => setSuspendModal(false)}
          onDone={updated => { setUser(updated); setSuspendModal(false) }}
        />
      )}
    </div>
  )
}
