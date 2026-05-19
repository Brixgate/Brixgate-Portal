'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  UserGroup02Icon,
  Mail01Icon,
  Loading01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  Tick01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
export type TeamAccountType = 'individual' | 'team_lead' | 'team_member'

interface EnrollmentInfo {
  id: number
  enrollmentType: string
  seatsPurchased: number
  seatsUsed: number
  buyerIsParticipant: boolean
  status: string
  completionStatus?: string
  enrollmentDate?: string
  reference?: string
}

interface ApiCohortSummary {
  cohortId: number
  cohortTitle: string
  role: string
  membershipStatus: string
  cohortEnrollment?: EnrollmentInfo
}

interface ApiProgram {
  id: number
  title: string
  myCohorts?: ApiCohortSummary[]
}

interface ApiProgramsResponse {
  programs: ApiProgram[]
}

// Invitee shape — camelCase per Swagger convention
interface Invitee {
  id: number
  inviteeEmail: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  expiresAt?: string
  createdAt?: string
}

interface TeamData {
  enrollmentId: number
  seatsPurchased: number
  seatsUsed: number
  programTitle: string
  cohortTitle: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function deriveAccountType(enrollment: EnrollmentInfo | null | undefined): TeamAccountType {
  if (!enrollment) return 'individual'
  if (enrollment.enrollmentType === 'TEAM') {
    // buyer has seatsPurchased > 0 and can manage invites
    return enrollment.seatsPurchased > 0 ? 'team_lead' : 'team_member'
  }
  return 'individual'
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const variants: Record<string, { label: string; bg: string; color: string }> = {
    PENDING:   { label: 'Pending',   bg: '#FFFBEB', color: '#D97706' },
    ACCEPTED:  { label: 'Accepted',  bg: '#F0FDF4', color: '#16A34A' },
    EXPIRED:   { label: 'Expired',   bg: '#F9FAFB', color: '#6B7280' },
    CANCELLED: { label: 'Cancelled', bg: '#FEF2F2', color: '#D51520' },
  }
  const v = variants[status] ?? { label: status, bg: '#F9FAFB', color: '#6B7280' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display flex-shrink-0"
      style={{ background: v.bg, color: v.color }}
    >
      {v.label}
    </span>
  )
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmDeleteModal({
  email,
  onConfirm,
  onCancel,
  loading,
}: {
  email: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[340px] p-6">
        <p className="text-[15px] font-semibold text-[#111827] font-display mb-1">Delete invite?</p>
        <p className="text-[13px] text-[#6b7280] font-body leading-[1.6] mb-5">
          The invite for{' '}
          <span className="font-medium text-[#374151]">{email}</span>{' '}
          will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-9 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors"
          >
            Keep
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-9 rounded-[8px] bg-[#D51520] text-[13px] font-semibold text-white font-display hover:bg-[#B81119] disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
          >
            {loading && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invitee row ───────────────────────────────────────────────────────────────
function InviteeRow({
  invitee,
  enrollmentId,
  onResent,
  onDeleted,
}: {
  invitee: Invitee
  enrollmentId: number
  onResent: () => void
  onDeleted: (id: number) => void
}) {
  const [open, setOpen]               = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  async function handleResend() {
    setOpen(false)
    setActionLoading(true)
    try {
      // No request body required per Swagger
      await apiClient.post(
        `/cohort-enrollments/${enrollmentId}/invitees/${invitee.id}/resend`
      )
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 3500)
      onResent()
    } catch {
      // silently fail — user can retry
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      // No request body required per Swagger
      await apiClient.delete(
        `/cohort-enrollments/${enrollmentId}/invitees/${invitee.id}`
      )
      onDeleted(invitee.id)
    } catch {
      // silently fail — keep row visible
    } finally {
      setActionLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 py-2.5 px-1 group">
        <div className="w-7 h-7 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
          <Mail01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#111827] font-body truncate">
            {invitee.inviteeEmail}
          </p>
          {resendSuccess && (
            <p className="text-[11px] text-[#16A34A] font-body flex items-center gap-1 mt-0.5">
              <CheckmarkCircle01Icon size={10} color="#16A34A" strokeWidth={2} />
              Invite resent
            </p>
          )}
        </div>

        <StatusChip status={invitee.status} />

        {/* Actions chevron */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={actionLoading}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f6] transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          >
            {actionLoading
              ? <Loading01Icon size={11} className="animate-spin text-[#9ca3af]" strokeWidth={2} />
              : <ArrowDown01Icon size={12} color="#6b7280" strokeWidth={2} />
            }
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-white rounded-[8px] shadow-[0px_4px_16px_rgba(16,24,40,0.12)] border border-[#f3f4f6] w-[148px] py-1 overflow-hidden">
              {invitee.status === 'PENDING' && (
                <button
                  onClick={handleResend}
                  className="w-full text-left px-3 py-2 text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors"
                >
                  Resend invite
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setShowConfirm(true) }}
                className="w-full text-left px-3 py-2 text-[12px] font-medium text-[#D51520] font-body hover:bg-[#fef2f2] transition-colors"
              >
                Delete invite
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDeleteModal
          email={invitee.inviteeEmail}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          loading={actionLoading}
        />
      )}
    </>
  )
}

// ── Pricing plan API shape ────────────────────────────────────────────────────
interface PricingPlan {
  id: number
  name: string                 // INDIVIDUAL | TEAMS | CORPORATE
  price?: number
  originalPrice?: number
  priceLabel?: string
  description?: string
  features?: string[]
  isPopular?: boolean
  ctaLabel?: string
  ctaUrl?: string
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

// ── Pricing modal ─────────────────────────────────────────────────────────────
function PricingModal({ onClose }: { onClose: () => void }) {
  const [plans, setPlans]       = useState<PricingPlan[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res  = await apiClient.get('/pricing-plans')
        const data = unwrap<{ plans?: PricingPlan[]; pricingPlans?: PricingPlan[] }>(res.data)
        const list = data?.plans ?? data?.pricingPlans ?? []
        setPlans(Array.isArray(list) ? list : [])
      } catch (err) {
        setError(getApiError(err) || 'Could not load pricing. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const planOrder = ['INDIVIDUAL', 'TEAMS', 'CORPORATE']
  const sorted = [...plans].sort(
    (a, b) => planOrder.indexOf(a.name?.toUpperCase()) - planOrder.indexOf(b.name?.toUpperCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-[#f5f5f7] rounded-[16px] shadow-2xl w-full max-w-[860px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#f3f4f6]">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] font-display">Choose a Plan</h2>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">Upgrade your Brixgate experience</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3f4f6] transition-colors"
          >
            <Cancel01Icon size={16} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>

        {/* Currency chip */}
        <div className="flex justify-center pt-5 pb-1">
          <div className="flex items-center gap-1.5 bg-[#d51520] text-white text-[11px] font-semibold font-display px-3 py-1 rounded-full">
            <span>₦</span>
            <span>NGN</span>
          </div>
        </div>

        {/* Plans */}
        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-[#9ca3af]">
              <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[13px] font-body">Loading plans…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-center py-12">
              <p className="text-[13px] text-[#d51520] font-body">{error}</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sorted.map((plan) => {
                const isPopular  = plan.isPopular || plan.name?.toUpperCase() === 'TEAMS'
                const isCorp     = plan.name?.toUpperCase() === 'CORPORATE'
                const nameLabel  = plan.name
                  ? plan.name.charAt(0).toUpperCase() + plan.name.slice(1).toLowerCase()
                  : plan.name

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-[12px] p-5 flex flex-col ${
                      isPopular
                        ? 'border-2 border-[#d51520] shadow-md'
                        : 'border border-[#e5e7eb] shadow-sm'
                    }`}
                  >
                    {/* Most popular banner */}
                    {isPopular && (
                      <div className="absolute top-0 right-0 overflow-hidden w-[72px] h-[72px] rounded-tr-[10px]">
                        <div className="absolute top-[14px] right-[-18px] bg-[#d51520] text-white text-[8px] font-bold font-display tracking-wider px-6 py-0.5 rotate-45 shadow-sm">
                          MOST POPULAR
                        </div>
                      </div>
                    )}

                    {/* Plan name */}
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#374151] font-display mb-3">
                      {nameLabel}
                    </p>

                    {/* Price */}
                    {isCorp ? (
                      <div className="mb-3">
                        <p className="text-[20px] font-bold text-[#d51520] font-display leading-none">
                          Custom Pricing
                        </p>
                        <p className="text-[11px] text-[#6b7280] font-body mt-1">
                          Tailored to your organisation
                        </p>
                      </div>
                    ) : plan.price !== undefined ? (
                      <div className="mb-3">
                        <p className="text-[26px] font-bold text-[#111827] font-display leading-none">
                          {formatNaira(plan.price)}
                        </p>
                        {plan.originalPrice && (
                          <p className="text-[11px] text-[#9ca3af] font-body mt-0.5 line-through">
                            was {formatNaira(plan.originalPrice)}
                          </p>
                        )}
                        {plan.priceLabel && (
                          <p className="text-[11px] text-[#6b7280] font-body mt-1">{plan.priceLabel}</p>
                        )}
                      </div>
                    ) : null}

                    {/* Description */}
                    {plan.description && (
                      <p className="text-[11px] text-[#6b7280] font-body leading-[1.6] mb-4">
                        {plan.description}
                      </p>
                    )}

                    {/* Features */}
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="flex flex-col gap-2 mb-5 flex-1">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Tick01Icon size={13} color="#d51520" strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                            <span className="text-[11px] text-[#374151] font-body leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA */}
                    <button
                      onClick={onClose}
                      className={`mt-auto w-full h-9 rounded-full text-[12px] font-semibold font-display transition-colors ${
                        isPopular
                          ? 'bg-[#d51520] text-white hover:bg-[#b81119]'
                          : 'bg-white border border-[#d51520] text-[#d51520] hover:bg-[#fef2f2]'
                      }`}
                    >
                      {plan.ctaLabel ?? (isCorp ? 'Consult Team' : 'Apply Now')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Fallback if API returns nothing */}
          {!loading && !error && sorted.length === 0 && (
            <p className="text-center text-[13px] text-[#9ca3af] font-body py-8">
              No plans available at the moment.
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-[#9ca3af] font-body pb-4">
          All prices exclude applicable local taxes.
        </p>
      </div>
    </div>
  )
}

// ── Upgrade teaser — shown to individual accounts ─────────────────────────────
function TeamUpgradeModal({ onClose }: { onClose: () => void }) {
  const [showPricing, setShowPricing] = useState(false)

  if (showPricing) {
    return <PricingModal onClose={onClose} />
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] shadow-xl w-full max-w-[400px] p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mx-auto mb-5">
          <UserGroup02Icon size={24} color="#d51520" strokeWidth={1.5} />
        </div>
        <h2 className="text-[20px] font-bold text-[#111827] font-display mb-2">
          Unlock Team Access
        </h2>
        <p className="text-[13px] text-[#6b7280] font-body leading-[1.7] max-w-[300px] mx-auto mb-6">
          Invite colleagues, manage seats, and collaborate on your Brixgate programme together.
        </p>
        <button
          onClick={() => setShowPricing(true)}
          className="w-full h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] transition-colors"
        >
          Upgrade to Teams
        </button>
        <button
          onClick={onClose}
          className="mt-3 block w-full text-[12px] text-[#9ca3af] font-body hover:text-[#6b7280] transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

// ── Team member modal — read-only ─────────────────────────────────────────────
function TeamMemberModal({ team, onClose }: { team: TeamData; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] shadow-xl w-full max-w-[400px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-[#f3f4f6]">
          <div>
            <p className="text-[16px] font-bold text-[#111827] font-display">Team Membership</p>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">{team.cohortTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
          >
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-4 text-center mb-4">
            <UserGroup02Icon size={20} color="#d51520" strokeWidth={1.5} className="mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[#111827] font-display">
              You&apos;re part of a team
            </p>
            <p className="text-[12px] text-[#6b7280] font-body mt-1 leading-[1.6]">
              You were added to this programme as part of a team. Contact your team lead to manage seat access.
            </p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6b7280] font-body">Programme</span>
              <span className="text-[#111827] font-semibold font-display truncate ml-4">
                {team.programTitle}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6b7280] font-body">Cohort</span>
              <span className="text-[#111827] font-semibold font-display truncate ml-4">
                {team.cohortTitle}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6b7280] font-body">Enrolment type</span>
              <span className="text-[#111827] font-semibold font-display">Team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Team lead modal — full management ─────────────────────────────────────────
function TeamLeadModal({ team, onClose }: { team: TeamData; onClose: () => void }) {
  const [invitees, setInvitees]               = useState<Invitee[]>([])
  const [loadingInvitees, setLoadingInvitees] = useState(true)
  const [emailInput, setEmailInput]           = useState('')
  const [inviteError, setInviteError]         = useState('')
  const [inviteSuccess, setInviteSuccess]     = useState(false)
  const [inviting, setInviting]               = useState(false)

  const seatsAvailable = team.seatsPurchased - team.seatsUsed

  const loadInvitees = useCallback(async () => {
    try {
      const res = await apiClient.get(`/cohort-enrollments/${team.enrollmentId}/invitees`)
      const data = unwrap<{ invitees?: Invitee[] } | Invitee[]>(res.data)
      // Defensive: handle both { invitees: [] } and bare array shapes
      const list: Invitee[] = Array.isArray(data)
        ? (data as Invitee[])
        : ((data as { invitees?: Invitee[] })?.invitees ?? [])
      setInvitees(list)
    } catch {
      setInvitees([])
    } finally {
      setLoadingInvitees(false)
    }
  }, [team.enrollmentId])

  useEffect(() => { loadInvitees() }, [loadInvitees])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess(false)

    const email = emailInput.trim()
    if (!email)               { setInviteError('Enter an email address.'); return }
    if (!isValidEmail(email)) { setInviteError('Enter a valid email address.'); return }
    if (seatsAvailable <= 0)  { setInviteError('No seats available. All seats have been used.'); return }
    if (invitees.some((i) => i.inviteeEmail.toLowerCase() === email.toLowerCase())) {
      setInviteError('An invite has already been sent to this email.'); return
    }

    setInviting(true)
    try {
      // inviteeEmail is required per Swagger InviteTeamMemberRequest
      await apiClient.post(`/cohort-enrollments/${team.enrollmentId}/invitees`, {
        inviteeEmail: email,
      })
      setEmailInput('')
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3500)
      await loadInvitees()
    } catch (err) {
      setInviteError(getApiError(err))
    } finally {
      setInviting(false)
    }
  }

  function handleDeleted(id: number) {
    setInvitees((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] shadow-xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#f3f4f6] flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-[16px] font-bold text-[#111827] font-display">Manage Team</p>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">{team.cohortTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
          >
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Seat usage bar */}
          <div className="bg-[#f9fafb] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[#6b7280] font-body">Seats used</span>
              <span className="text-[13px] font-bold text-[#111827] font-display">
                {team.seatsUsed} / {team.seatsPurchased}
              </span>
            </div>
            <div className="h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (team.seatsUsed / Math.max(team.seatsPurchased, 1)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-[#9ca3af] font-body mt-1.5">
              {seatsAvailable > 0
                ? `${seatsAvailable} seat${seatsAvailable !== 1 ? 's' : ''} available`
                : 'All seats used — no more invites can be sent'}
            </p>
          </div>

          {/* Invite form */}
          <div>
            <p className="text-[13px] font-semibold text-[#111827] font-display mb-2">
              Invite a teammate
            </p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="flex-1 relative">
                <Mail01Icon
                  size={14}
                  color="#9ca3af"
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value)
                    setInviteError('')
                    setInviteSuccess(false)
                  }}
                  placeholder="colleague@company.com"
                  disabled={seatsAvailable <= 0 || inviting}
                  className={`w-full h-[38px] pl-8 pr-3 border rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all bg-white disabled:bg-[#f9fafb] disabled:cursor-not-allowed ${
                    inviteError
                      ? 'border-[#D51520] focus:ring-2 focus:ring-[#D51520]/10'
                      : 'border-[#e5e7eb] focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={inviting || seatsAvailable <= 0}
                className="h-[38px] px-4 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                {inviting
                  ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />
                  : 'Send invite'
                }
              </button>
            </form>

            {inviteError && (
              <p className="flex items-center gap-1 mt-1.5 text-[11px] text-[#D51520] font-body">
                <AlertCircleIcon size={11} color="#D51520" strokeWidth={1.5} />
                {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="flex items-center gap-1 mt-1.5 text-[11px] text-[#16A34A] font-body">
                <CheckmarkCircle01Icon size={11} color="#16A34A" strokeWidth={1.5} />
                Invite sent successfully
              </p>
            )}
          </div>

          {/* Invitees list */}
          <div>
            <p className="text-[13px] font-semibold text-[#111827] font-display mb-1">
              Invitees
              {!loadingInvitees && invitees.length > 0 && (
                <span className="ml-1.5 text-[11px] font-normal text-[#9ca3af]">
                  ({invitees.length})
                </span>
              )}
            </p>

            {loadingInvitees ? (
              <div className="flex items-center justify-center py-8 gap-2 text-[#9ca3af]">
                <Loading01Icon size={14} className="animate-spin" strokeWidth={1.5} />
                <span className="text-[12px] font-body">Loading invitees…</span>
              </div>
            ) : invitees.length === 0 ? (
              <div className="py-8 text-center">
                <Mail01Icon size={20} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-2" />
                <p className="text-[12px] text-[#9ca3af] font-body">No invites sent yet.</p>
                <p className="text-[11px] text-[#d1d5db] font-body mt-0.5">
                  Invite teammates using the form above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#f3f4f6]">
                {invitees.map((invitee) => (
                  <InviteeRow
                    key={invitee.id}
                    invitee={invitee}
                    enrollmentId={team.enrollmentId}
                    onResent={loadInvitees}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────
// Fetches enrollment data from /users/me/programs, derives account type,
// then renders the appropriate modal. No dummy data — fully wired to real API.
export default function TeamFeature({ onClose }: { onClose: () => void }) {
  const [loading, setLoading]           = useState(true)
  const [accountType, setAccountType]   = useState<TeamAccountType>('individual')
  const [team, setTeam]                 = useState<TeamData | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res  = await apiClient.get('/users/me/programs')
        const data = unwrap<ApiProgramsResponse>(res.data)
        const programs = Array.isArray(data?.programs) ? data.programs : []

        // Walk programs → cohorts, find first TEAM enrollment
        let foundEnrollment: EnrollmentInfo | null = null
        let foundProgram:    ApiProgram | null     = null
        let foundCohort:     ApiCohortSummary | null = null

        outer: for (const program of programs) {
          for (const cohort of program.myCohorts ?? []) {
            if (cohort.cohortEnrollment?.enrollmentType === 'TEAM') {
              foundEnrollment = cohort.cohortEnrollment
              foundProgram    = program
              foundCohort     = cohort
              break outer
            }
          }
        }

        setAccountType(deriveAccountType(foundEnrollment))

        if (foundEnrollment && foundProgram && foundCohort) {
          setTeam({
            enrollmentId:   foundEnrollment.id,
            seatsPurchased: foundEnrollment.seatsPurchased,
            seatsUsed:      foundEnrollment.seatsUsed,
            programTitle:   foundProgram.title,
            cohortTitle:    foundCohort.cohortTitle,
          })
        }
      } catch {
        setAccountType('individual')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-[16px] px-8 py-6 flex items-center gap-3 shadow-xl">
          <Loading01Icon size={18} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
          <span className="text-[13px] font-body text-[#6b7280]">Loading team info…</span>
        </div>
      </div>
    )
  }

  if (accountType === 'individual' || !team) {
    return <TeamUpgradeModal onClose={onClose} />
  }

  if (accountType === 'team_member') {
    return <TeamMemberModal team={team} onClose={onClose} />
  }

  return <TeamLeadModal team={team} onClose={onClose} />
}
