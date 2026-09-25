'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, AlertCircleIcon,
  CheckmarkCircle01Icon, Payment01Icon, UserBlock01Icon,
  Mail01Icon, Call02Icon, Calendar01Icon, Time01Icon,
  Invoice01Icon, MoneyReceive01Icon,
} from 'hugeicons-react'
import { apiClient, getApiError, unwrap } from '@/lib/api-client'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ApiUser {
  id: number
  name?: string; full_name?: string
  first_name?: string; firstName?: string
  last_name?: string; lastName?: string
  email: string
  role?: string
  status?: number
  phone?: string; phone_number?: string; phoneNumber?: string
  full_phone_number?: string; fullPhoneNumber?: string
  created_at?: string; createdAt?: string
  last_login_at?: string; lastLoginAt?: string
  profile_picture_url?: string
}

interface ApiInstallment {
  id: number
  installment_number?: number; installmentNumber?: number
  amount_due?: number; amount?: number
  amount_paid?: number
  outstanding_amount?: number
  due_date?: string; dueDate?: string
  grace_due_date?: string; graceDueDate?: string
  status: string
  paid_at?: string; paidAt?: string
}

interface ApiPlan {
  id: number
  cohort_id?: number; cohortId?: number
  cohort_title?: string; cohortTitle?: string
  program_title?: string; programTitle?: string
  payment_mode?: string; paymentMode?: string
  installment_calculation_type?: string
  next_due_date?: string; nextDueDate?: string
  status: string
  access_status?: string; accessStatus?: string
  total_amount?: number; totalAmount?: number
  amount_paid?: number; amountPaid?: number
  outstanding_amount?: number; amount_outstanding?: number; amountOutstanding?: number
  currency?: string
  installments?: ApiInstallment[]
  payment_schedule?: ApiInstallment[]
}

interface CohortEnrollment {
  id?: number
  user_id?: number; userId?: number
  cohort_id?: number; cohortId?: number
  cohort_title?: string; cohortTitle?: string
  enrollment_type?: string; enrollmentType?: string
  status?: string
  completion_status?: string; completionStatus?: string
  seats_purchased?: number; seatsPurchased?: number
  seats_used?: number; seatsUsed?: number
  organization_name?: string; organizationName?: string
  created_at?: string; createdAt?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function uName(u?: ApiUser | null): string {
  if (!u) return '—'
  if (u.name ?? u.full_name) return (u.name ?? u.full_name)!
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

function fmt(n: number, currency = 'NGN') {
  if (currency === 'USD') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  if (currency === 'GBP') return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const PLAN_STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'bg-[#ecfdf3] border border-[#bbf7d0] text-[#16a34a]',
  COMPLETED: 'bg-gray-100 border border-gray-200 text-gray-600',
  SUSPENDED: 'bg-amber-50 border border-amber-200 text-amber-700',
  DEFAULTED: 'bg-[#fef2f2] border border-[#fecdca] text-[#d51520]',
  PENDING:   'bg-blue-50 border border-blue-200 text-blue-700',
}

const INST_STATUS_STYLE: Record<string, { chip: string; dot: string }> = {
  PAID:     { chip: 'bg-[#ecfdf3] border border-[#bbf7d0] text-[#16a34a]',   dot: 'bg-[#16a34a]'  },
  PENDING:  { chip: 'bg-blue-50 border border-blue-200 text-blue-700',        dot: 'bg-blue-500'   },
  UPCOMING: { chip: 'bg-blue-50 border border-blue-200 text-blue-700',        dot: 'bg-blue-400'   },
  OVERDUE:  { chip: 'bg-[#fef2f2] border border-[#fecdca] text-[#d51520]',   dot: 'bg-[#d51520]'  },
}

// ── Grace extension modal ──────────────────────────────────────────────────────
function GraceExtensionModal({
  cohortId, memberId, currentDeadline, onClose, onDone,
}: {
  cohortId: string; memberId: number | string | null; currentDeadline?: string | null
  onClose: () => void; onDone: () => void
}) {
  const [graceDate, setGraceDate] = useState('')
  const [reason,    setReason]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit() {
    if (!graceDate) { setError('Please select a new deadline date.'); return }
    if (!memberId)  { setError('Could not resolve cohort member record — try refreshing.'); return }
    const baseline   = currentDeadline ? new Date(currentDeadline) : new Date()
    const targetDate = new Date(graceDate)
    const additionalDays = Math.ceil((targetDate.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24))
    if (additionalDays <= 0) { setError('New date must be after the current deadline.'); return }
    setSaving(true); setError('')
    try {
      await apiClient.post(
        `/admin/cohorts/${cohortId}/members/${memberId}/payment-grace-extension`,
        { additional_days: additionalDays, reason: reason || 'Grace period extended by admin' }
      )
      onDone()
    } catch (e) { setError(getApiError(e)) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={!saving ? onClose : undefined} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[440px] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h3 className="text-[15px] font-bold text-[#111827] font-display">Extend Grace Period</h3>
          {currentDeadline && (
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
              Current deadline: <span className="font-semibold text-[#111827]">{fmtDate(currentDeadline)}</span>
            </p>
          )}
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-[12px] font-medium text-[#374151] font-body mb-1.5">New deadline date</p>
            <input
              type="date"
              value={graceDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setGraceDate(e.target.value); setError('') }}
              className="w-full h-10 px-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/10"
            />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#374151] font-body mb-1.5">Reason <span className="text-[#9ca3af] font-normal">(optional)</span></p>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Approved by finance team"
              className="w-full h-10 px-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0369a1] focus:ring-2 focus:ring-[#0369a1]/10"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}
            </p>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 rounded-[8px] bg-[#0369a1] text-[13px] font-semibold text-white font-display hover:bg-[#075985] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Confirm Extension
          </button>
        </div>
      </div>
    </>
  )
}

// ── Suspend / Reactivate modal ─────────────────────────────────────────────────
function SuspendModal({ user, onClose, onDone }: {
  user: ApiUser; onClose: () => void; onDone: (updated: ApiUser) => void
}) {
  const isSuspended = user.status === 0
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSubmit() {
    setSaving(true); setError('')
    try {
      await apiClient.patch(`/admin/users/${user.id}`, { status: isSuspended ? 1 : 0 })
      onDone({ ...user, status: isSuspended ? 1 : 0 })
    } catch (e) { setError(getApiError(e)) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={!saving ? onClose : undefined} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[440px] overflow-hidden">
        <div className={`px-6 pt-5 pb-4 border-b ${isSuspended ? 'border-[#bbf7d0] bg-[#ecfdf3]' : 'border-[#fecdca] bg-[#fef2f2]'}`}>
          <h3 className={`text-[15px] font-bold font-display ${isSuspended ? 'text-[#16a34a]' : 'text-[#d51520]'}`}>
            {isSuspended ? 'Reactivate account?' : 'Suspend account?'}
          </h3>
          <p className="text-[12px] text-[#374151] font-body mt-1">
            {isSuspended
              ? 'This will restore full portal access for the student.'
              : 'The student will immediately lose access to the portal.'}
          </p>
        </div>
        {error && (
          <div className="px-6 pt-4">
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}
            </p>
          </div>
        )}
        <div className="px-6 py-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold text-white font-display disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${
              isSuspended ? 'bg-[#16a34a] hover:bg-[#15803d]' : 'bg-[#d51520] hover:bg-[#b81119]'
            }`}>
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            {isSuspended ? 'Yes, Reactivate' : 'Yes, Suspend'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CohortMemberPage() {
  const params   = useParams()
  const router   = useRouter()
  const cohortId = params.cohortId as string
  const userId   = params.userId   as string

  const [user,          setUser]         = useState<ApiUser | null>(null)
  const [enrollment,    setEnrollment]   = useState<CohortEnrollment | null>(null)
  const [plan,          setPlan]         = useState<ApiPlan | null>(null)
  const [cohortMemberId, setCohortMemberId] = useState<number | string | null>(null)
  const [loading,       setLoading]      = useState(true)
  const [error,         setError]        = useState('')
  const [showGrace,     setShowGrace]    = useState(false)
  const [showSuspend,   setShowSuspend]  = useState(false)
  const [graceSuccess,  setGraceSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // 1. User profile
      const userRes = await apiClient.get(`/admin/users/${userId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawUser: any = userRes.data?.data ?? userRes.data
      const userData: ApiUser = rawUser?.user ?? rawUser
      setUser(userData)

      // 2. Enrollment + payment plans + cohort member record (for grace extension ID)
      const [enrollRes, plansRes, membersRes] = await Promise.allSettled([
        apiClient.get(`/admin/cohort-enrollments?cohort_id=${cohortId}&user_id=${userId}`),
        apiClient.get(`/admin/enrollment-payment-plans?user_id=${userId}`),
        apiClient.get(`/admin/cohorts/${cohortId}/members?size=500`),
      ])

      if (enrollRes.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = enrollRes.value.data?.data ?? enrollRes.value.data
        const list: CohortEnrollment[] = Array.isArray(raw?.enrollments) ? raw.enrollments
          : Array.isArray(raw?.content) ? raw.content
          : Array.isArray(raw)          ? raw
          : []
        const match = list.find(e =>
          String(e.cohort_id ?? e.cohortId) === String(cohortId)
        ) ?? list[0] ?? null
        setEnrollment(match)
      }

      // Resolve cohort member record ID for grace extension
      if (membersRes.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = unwrap(membersRes.value.data)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const members: any[] = Array.isArray(raw?.members) ? raw.members
          : Array.isArray(raw?.content) ? raw.content
          : Array.isArray(raw)          ? raw
          : []
        // Match by user ID, or fall back to email from the user profile we already fetched
        const userEmail = userData?.email?.toLowerCase() ?? ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = members.find((m: any) => {
          if (String(m.user?.id ?? m.user_id ?? m.userId) === String(userId)) return true
          if (userEmail && (m.user?.email ?? '').toLowerCase() === userEmail) return true
          return false
        })
        if (match) setCohortMemberId(match.id)
      }

      if (plansRes.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any = plansRes.value.data?.data ?? plansRes.value.data
        const list: ApiPlan[] = Array.isArray(raw?.enrollment_payment_plans) ? raw.enrollment_payment_plans
          : Array.isArray(raw?.plans)   ? raw.plans
          : Array.isArray(raw?.content) ? raw.content
          : Array.isArray(raw)          ? raw
          : []
        // Find the plan for this cohort
        const match = list.find(p =>
          String(p.cohort_id ?? p.cohortId) === String(cohortId)
        ) ?? list[0] ?? null

        if (match) {
          // Enrich with full installment schedule from the detail endpoint
          try {
            const detailRes = await apiClient.get(`/admin/enrollment-payment-plans/${match.id}`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dr: any = detailRes.data?.data ?? detailRes.data
            setPlan(dr?.enrollment_payment_plan ?? dr?.plan ?? dr ?? match)
          } catch {
            setPlan(match)
          }
        }
      }
    } catch (e) { setError(getApiError(e)) } finally { setLoading(false) }
  }, [cohortId, userId])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loading01Icon size={24} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
    </div>
  )

  if (error) return (
    <div className="p-10">
      <div className="flex items-center gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-4 max-w-lg">
        <AlertCircleIcon size={16} color="#d51520" strokeWidth={1.5} />
        <p className="text-[13px] text-[#d51520] font-body">{error}</p>
      </div>
    </div>
  )

  const name          = uName(user)
  const isActive      = user?.status === 1 || user?.status === undefined
  const phone         = user?.full_phone_number ?? user?.fullPhoneNumber ?? user?.phone_number ?? user?.phoneNumber ?? user?.phone
  const currency      = plan?.currency ?? 'NGN'
  const installments  = plan?.installments ?? plan?.payment_schedule ?? []
  // enrollment?.id is the enrollment record, not the cohort member record — don't fall back to userId
  const memberId      = cohortMemberId ?? enrollment?.id ?? null
  const nextDue       = plan?.next_due_date ?? plan?.nextDueDate
  const planStatus    = plan?.status?.toUpperCase()

  return (
    <>
      {showGrace && (
        <GraceExtensionModal
          cohortId={cohortId}
          memberId={memberId}
          currentDeadline={nextDue}
          onClose={() => setShowGrace(false)}
          onDone={() => { setShowGrace(false); setGraceSuccess(true); load() }}
        />
      )}
      {showSuspend && user && (
        <SuspendModal
          user={user}
          onClose={() => setShowSuspend(false)}
          onDone={updated => { setUser(updated); setShowSuspend(false) }}
        />
      )}

      <div className="p-8 max-w-[1100px]">
        {/* Back nav */}
        <button
          onClick={() => router.push(`/admin/cohorts/${cohortId}?tab=people`)}
          className="flex items-center gap-2 text-[13px] text-[#4b5563] font-body hover:text-[#111827] transition-colors mb-6"
        >
          <ArrowLeft01Icon size={15} strokeWidth={2} />
          Back to People
        </button>

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
              <span className="text-[20px] font-bold text-[#d51520] font-display">{initials(name)}</span>
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#111827] font-display leading-tight">{name}</h1>
              <p className="text-[13px] text-[#4b5563] font-body mt-0.5">{user?.email ?? '—'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {user?.role && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display bg-[#ecfdf3] text-[#027a48]">
                    {user.role}
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                  isActive ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fef2f2] text-[#d51520]'
                }`}>
                  {isActive ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setGraceSuccess(false); setShowGrace(true) }}
              className="flex items-center gap-2 h-9 px-4 border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1] rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#e0f2fe] transition-colors"
            >
              <Time01Icon size={14} strokeWidth={1.5} />
              Extend Grace Period
            </button>
            <button
              onClick={() => setShowSuspend(true)}
              className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-[12px] font-semibold font-display transition-colors ${
                isActive
                  ? 'border border-[#fecdca] bg-[#fef2f2] text-[#d51520] hover:bg-[#fee2e2]'
                  : 'border border-[#bbf7d0] bg-[#ecfdf3] text-[#027a48] hover:bg-[#d1fae5]'
              }`}
            >
              {isActive
                ? <><UserBlock01Icon size={14} strokeWidth={1.5} /> Suspend</>
                : <><CheckmarkCircle01Icon size={14} strokeWidth={1.5} /> Reactivate</>
              }
            </button>
          </div>
        </div>

        {/* Grace success banner */}
        {graceSuccess && (
          <div className="mb-6 rounded-[10px] border border-[#bbf7d0] bg-[#ecfdf3] px-5 py-4 flex items-start gap-3">
            <CheckmarkCircle01Icon size={16} color="#027a48" strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#027a48] font-display">Grace period extended</p>
              <p className="text-[12px] text-[#065f46] font-body mt-0.5">The student&apos;s deadline has been updated and access restored if previously locked.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_400px] gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* Personal details */}
            <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
              <div className="px-6 pt-5 pb-3 border-b border-[#f3f4f6]">
                <p className="text-[13px] font-bold text-[#111827] font-display">Personal Information</p>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">Full Name</p>
                  <p className="text-[13px] font-medium text-[#111827] font-body">{name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">Email Address</p>
                  <p className="text-[13px] font-medium text-[#111827] font-body flex items-center gap-1.5">
                    <Mail01Icon size={13} color="#6b7280" strokeWidth={1.5} />
                    {user?.email ?? '—'}
                  </p>
                </div>
                {phone && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">Phone</p>
                    <p className="text-[13px] font-medium text-[#111827] font-body flex items-center gap-1.5">
                      <Call02Icon size={13} color="#6b7280" strokeWidth={1.5} />
                      {phone}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">Registered</p>
                  <p className="text-[13px] font-medium text-[#111827] font-body flex items-center gap-1.5">
                    <Calendar01Icon size={13} color="#6b7280" strokeWidth={1.5} />
                    {fmtDate(user?.created_at ?? user?.createdAt)}
                  </p>
                </div>
                {(user?.last_login_at ?? user?.lastLoginAt) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">Last Login</p>
                    <p className="text-[13px] font-medium text-[#111827] font-body">{fmtDateTime(user?.last_login_at ?? user?.lastLoginAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">Account Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                    isActive ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fef2f2] text-[#d51520]'
                  }`}>
                    {isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            </div>

            {/* Enrollment details */}
            <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
              <div className="px-6 pt-5 pb-3 border-b border-[#f3f4f6]">
                <p className="text-[13px] font-bold text-[#111827] font-display">Cohort Enrollment</p>
              </div>
              {!enrollment ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-[13px] text-[#9ca3af] font-body">No enrollment record found for this cohort.</p>
                </div>
              ) : (
                <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-5">
                  {[
                    { label: 'Enrollment Type', value: (enrollment.enrollment_type ?? enrollment.enrollmentType ?? '—').replace(/_/g, ' ') },
                    { label: 'Enrollment Status', value: enrollment.status ?? '—' },
                    { label: 'Completion',  value: (enrollment.completion_status ?? enrollment.completionStatus ?? '—').replace(/_/g, ' ') },
                    { label: 'Joined',      value: fmtDate(enrollment.created_at ?? enrollment.createdAt) },
                    ...(enrollment.seats_purchased ?? enrollment.seatsPurchased
                      ? [{ label: 'Seats Purchased', value: String(enrollment.seats_purchased ?? enrollment.seatsPurchased) }]
                      : []),
                    ...(enrollment.organization_name ?? enrollment.organizationName
                      ? [{ label: 'Organisation', value: enrollment.organization_name ?? enrollment.organizationName ?? '' }]
                      : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-1">{label}</p>
                      <p className="text-[13px] font-medium text-[#111827] font-body">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Installment schedule */}
            {installments.length > 0 && (
              <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
                <div className="px-6 pt-5 pb-3 border-b border-[#f3f4f6]">
                  <p className="text-[13px] font-bold text-[#111827] font-display">Installment Schedule</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f9fafb]">
                        {['#', 'Amount Due', 'Paid', 'Outstanding', 'Due Date', 'Paid On', 'Status'].map(h => (
                          <th key={h} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display ${
                            ['Amount Due', 'Paid', 'Outstanding'].includes(h) ? 'text-right' : 'text-left'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst, i) => {
                        const num  = inst.installment_number ?? inst.installmentNumber ?? (i + 1)
                        const due  = inst.amount_due ?? inst.amount ?? 0
                        const paid = inst.amount_paid ?? 0
                        const os   = inst.outstanding_amount ?? Math.max(0, due - paid)
                        const st   = (inst.status ?? 'PENDING').toUpperCase()
                        const style = INST_STATUS_STYLE[st] ?? INST_STATUS_STYLE['PENDING']
                        return (
                          <tr key={inst.id ?? i} className="border-b border-[#f3f4f6] last:border-0">
                            <td className="px-4 py-3.5 text-[13px] font-semibold text-[#111827] font-display">{num}</td>
                            <td className="px-4 py-3.5 text-right text-[13px] font-semibold text-[#111827] font-display">{fmt(due, currency)}</td>
                            <td className="px-4 py-3.5 text-right text-[13px] font-semibold text-[#027a48] font-display">{fmt(paid, currency)}</td>
                            <td className="px-4 py-3.5 text-right text-[13px] font-semibold font-display" style={{ color: os > 0 ? '#d51520' : '#9ca3af' }}>{fmt(os, currency)}</td>
                            <td className="px-4 py-3.5">
                              <p className="text-[12px] text-[#374151] font-body">{fmtDate(inst.due_date ?? inst.dueDate)}</p>
                              {(inst.grace_due_date ?? inst.graceDueDate) && (
                                <p className="text-[10px] text-[#9ca3af] font-body mt-0.5">Grace: {fmtDate(inst.grace_due_date ?? inst.graceDueDate)}</p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-[12px] text-[#4b5563] font-body">{fmtDate(inst.paid_at ?? inst.paidAt)}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${style.chip}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {st}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right column — payment summary */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
              <div className="px-6 pt-5 pb-3 border-b border-[#f3f4f6]">
                <p className="text-[13px] font-bold text-[#111827] font-display">Payment Summary</p>
              </div>

              {!plan ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mx-auto mb-3">
                    <Payment01Icon size={22} color="#9ca3af" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] text-[#374151] font-display font-semibold mb-1">No payment record</p>
                  <p className="text-[12px] text-[#9ca3af] font-body">No payment plan found for this cohort.</p>
                </div>
              ) : (
                <div className="px-6 py-5 flex flex-col gap-4">
                  {/* Status banner */}
                  {planStatus && (
                    <div className={`rounded-[8px] px-4 py-3 flex items-center justify-between ${PLAN_STATUS_STYLE[planStatus] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>
                      <p className="text-[12px] font-semibold font-display">Plan status</p>
                      <span className="text-[12px] font-bold font-display">{planStatus}</span>
                    </div>
                  )}

                  {/* Amounts */}
                  <div className="flex flex-col gap-0 rounded-[8px] border border-[#f3f4f6] overflow-hidden">
                    {[
                      { icon: <Invoice01Icon     size={14} color="#7c3aed" strokeWidth={1.5} />, tint: '#f5f3ff', label: 'Total Amount',  value: fmt(plan.total_amount ?? plan.totalAmount ?? 0, currency) },
                      { icon: <MoneyReceive01Icon size={14} color="#0d9488" strokeWidth={1.5} />, tint: '#f0fdfa', label: 'Amount Paid',   value: fmt(plan.amount_paid ?? plan.amountPaid ?? 0, currency), green: true },
                      { icon: <Payment01Icon      size={14} color="#d97706" strokeWidth={1.5} />, tint: '#fffbeb', label: 'Outstanding',   value: fmt(plan.outstanding_amount ?? plan.amount_outstanding ?? plan.amountOutstanding ?? 0, currency), red: true },
                    ].map(({ icon, tint, label, value, green, red }, i, arr) => (
                      <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-[#f3f4f6]' : ''}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0" style={{ background: tint }}>{icon}</div>
                          <span className="text-[12px] text-[#4b5563] font-body">{label}</span>
                        </div>
                        <span className={`text-[14px] font-bold font-display ${green ? 'text-[#027a48]' : red ? 'text-[#d51520]' : 'text-[#111827]'}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Plan metadata */}
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Payment Mode',  value: (plan.payment_mode ?? plan.paymentMode ?? '—').replace(/_/g, ' ') },
                      { label: 'Currency',       value: currency },
                      { label: 'Next Due Date',  value: fmtDate(nextDue) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[12px] text-[#6b7280] font-body">{label}</span>
                        <span className="text-[12px] font-medium text-[#111827] font-body">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Extend grace CTA inside the card too */}
                  <button
                    onClick={() => { setGraceSuccess(false); setShowGrace(true) }}
                    className="w-full h-9 rounded-[8px] border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1] text-[12px] font-semibold font-display flex items-center justify-center gap-2 hover:bg-[#e0f2fe] transition-colors mt-1"
                  >
                    <Time01Icon size={13} strokeWidth={1.5} />
                    Extend Grace Period
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
