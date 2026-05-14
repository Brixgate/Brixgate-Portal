'use client'

import { useState, useRef, useEffect } from 'react'
import {
  UserGroupIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  Cancel01Icon,
} from 'hugeicons-react'

// ── Types ─────────────────────────────────────────────────────────────────────
export type TeamAccountType = 'individual' | 'team_lead' | 'team_member'
type MemberStatus = 'active' | 'disabled' | 'pending'

interface TeamMember {
  id: string
  email: string
  name?: string
  status: MemberStatus
}

interface TeamData {
  leadName: string
  totalSeats: number
  cohortStarted: boolean
  members: TeamMember[]
}

// ── DUMMY DATA ─────────────────────────────────────────────────────────────────
// DEV: Change DUMMY_ACCOUNT_TYPE to test different UI states
// Options: 'individual' | 'team_lead' | 'team_member'
export const DUMMY_ACCOUNT_TYPE: TeamAccountType = 'team_lead'

const DUMMY_TEAM: TeamData = {
  leadName: 'Sarah Johnson',
  totalSeats: 5,
  cohortStarted: false,
  members: [
    { id: '1', email: 'james.okafor@gmail.com',  status: 'active'   },
    { id: '2', email: 'priya.mehta@outlook.com', status: 'disabled' },
    { id: '3', email: 't.williams@company.io',   status: 'pending'  },
  ],
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function getInitial(value: string): string {
  return value[0]?.toUpperCase() ?? '?'
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:   { label: 'Active',   color: '#16a34a', bg: '#ecfdf3', dot: '#16a34a' },
  disabled: { label: 'Disabled', color: '#d97706', bg: '#fffbeb', dot: '#d97706' },
  pending:  { label: 'Pending',  color: '#9ca3af', bg: '#f3f4f6', dot: '#9ca3af' },
}

// ── Close button (shared) ──────────────────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
      aria-label="Close"
    >
      <Cancel01Icon size={16} color="#6b7280" strokeWidth={1.5} />
    </button>
  )
}

// ── Confirmation modal ─────────────────────────────────────────────────────────
function ConfirmModal({
  type,
  target,
  onConfirm,
  onCancel,
}: {
  type: 'remove' | 'disable' | 'enable'
  target: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const cfg = {
    remove: {
      title: `Remove ${target} from your team?`,
      body: 'Their portal access will be revoked and the seat will return to your available pool.',
      cta: 'Yes, Remove',
      ctaClass: 'bg-[#d51520] hover:bg-[#b81119] text-white',
    },
    disable: {
      title: `Disable ${target}'s access?`,
      body: "They won't be able to log in until you re-enable them. Their seat remains reserved.",
      cta: 'Yes, Disable',
      ctaClass: 'bg-[#d97706] hover:bg-[#b45309] text-white',
    },
    enable: {
      title: `Enable ${target}'s access?`,
      body: 'They will regain access to their portal immediately.',
      cta: 'Yes, Enable',
      ctaClass: 'bg-[#16a34a] hover:bg-[#15803d] text-white',
    },
  }[type]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-[14px] shadow-[0px_20px_60px_rgba(16,24,40,0.22)] w-full max-w-[380px] p-6">
        <p className="text-[15px] font-bold text-[#111827] font-display mb-2">{cfg.title}</p>
        <p className="text-[13px] text-[#6b7280] font-body leading-relaxed mb-6">{cfg.body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-[40px] border border-[#e5e7eb] text-[13px] font-medium font-body text-[#374151] rounded-[8px] hover:bg-[#f9fafb] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-[40px] text-[13px] font-semibold font-display rounded-[8px] transition-colors ${cfg.ctaClass}`}
          >
            {cfg.cta}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Member row (lead view) ────────────────────────────────────────────────────
function MemberRow({
  member,
  cohortStarted,
  onAction,
}: {
  member: TeamMember
  cohortStarted: boolean
  onAction: (id: string, action: 'disable' | 'enable' | 'remove') => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CFG[member.status]
  const showChevron = member.status === 'active' || member.status === 'disabled'

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-[8px] hover:bg-[#f9fafb] transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#1a1d2e] flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-white font-display">
          {getInitial(member.name ?? member.email)}
        </span>
      </div>

      {/* Email / name */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#111827] font-body truncate">
          {member.name ?? member.email}
        </p>
        {member.name && (
          <p className="text-[11px] text-[#9ca3af] font-body truncate">{member.email}</p>
        )}
      </div>

      {/* Status + chevron */}
      <div className="flex items-center gap-1.5 flex-shrink-0 relative" ref={ref}>
        <span
          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-display"
          style={{ color: cfg.color, background: cfg.bg }}
        >
          {cfg.label}
        </span>

        {showChevron && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f6] transition-colors"
            aria-label="Member options"
          >
            <ArrowDown01Icon
              size={13}
              color="#9ca3af"
              strokeWidth={2}
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
            />
          </button>
        )}

        {/* Dropdown */}
        {open && (
          <div className="absolute top-[calc(100%+4px)] right-0 z-10 bg-white rounded-[10px] shadow-[0px_8px_24px_rgba(16,24,40,0.14)] border border-[#f3f4f6] py-1.5 w-[160px]">
            {/* Current state — non-interactive */}
            <div className="px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
              <span className="text-[12px] font-medium font-body" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            <div className="h-px bg-[#f3f4f6] mx-3 my-0.5" />

            {/* Disable / Enable */}
            {member.status === 'active' ? (
              <button
                onClick={() => { setOpen(false); onAction(member.id, 'disable') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium font-body text-[#d97706] hover:bg-[#fffbeb] transition-colors text-left"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onAction(member.id, 'enable') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium font-body text-[#16a34a] hover:bg-[#ecfdf3] transition-colors text-left"
              >
                Enable
              </button>
            )}

            {/* Remove — hidden after cohort starts */}
            {!cohortStarted && (
              <button
                onClick={() => { setOpen(false); onAction(member.id, 'remove') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium font-body text-[#d51520] hover:bg-[#fef2f2] transition-colors text-left"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Team Lead Modal ────────────────────────────────────────────────────────────
function TeamLeadModal({ initialTeam, onClose }: { initialTeam: TeamData; onClose: () => void }) {
  const [members, setMembers]       = useState<TeamMember[]>(initialTeam.members)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteState, setInviteState] = useState<'idle' | 'error' | 'sent'>('idle')
  const [inviteError, setInviteError] = useState('')
  const [confirm, setConfirm]       = useState<{ type: 'remove' | 'disable' | 'enable'; id: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const usedSeats = members.length
  const totalSeats = initialTeam.totalSeats
  const cohortStarted = initialTeam.cohortStarted

  function handleInvite() {
    const email = inviteEmail.trim()
    if (!isValidEmail(email)) {
      setInviteState('error'); setInviteError('Enter a valid email address'); return
    }
    if (usedSeats >= totalSeats) {
      setInviteState('error'); setInviteError('No seats remaining'); return
    }
    if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      setInviteState('error'); setInviteError('Already added'); return
    }

    setMembers((prev) => [...prev, { id: Date.now().toString(), email, status: 'pending' }])
    setInviteState('sent')
    setInviteError('')
    setTimeout(() => {
      setInviteEmail('')
      setInviteState('idle')
      inputRef.current?.focus()
    }, 1500)
  }

  function handleAction(id: string, action: 'disable' | 'enable' | 'remove') {
    setConfirm({ type: action, id })
  }

  function executeConfirm() {
    if (!confirm) return
    if (confirm.type === 'remove') {
      setMembers((prev) => prev.filter((m) => m.id !== confirm.id))
    } else if (confirm.type === 'disable') {
      setMembers((prev) => prev.map((m) => m.id === confirm.id ? { ...m, status: 'disabled' } : m))
    } else {
      setMembers((prev) => prev.map((m) => m.id === confirm.id ? { ...m, status: 'active' } : m))
    }
    setConfirm(null)
  }

  const confirmTarget = confirm ? (members.find((m) => m.id === confirm.id)?.email ?? '') : ''

  return (
    <>
      {/* Focus-trapped overlay — no click to close */}
      <div className="fixed inset-0 bg-black/50 z-40" />

      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-[16px] shadow-[0px_20px_60px_rgba(16,24,40,0.18)] w-full max-w-[520px] overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-[#f3f4f6] flex items-center justify-between">
            <p className="text-[17px] font-bold text-[#111827] font-display">My Team</p>
            <CloseBtn onClick={onClose} />
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">

            {/* Seat counter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#f3f4f6] px-3 py-1.5 rounded-full">
                <UserGroupIcon size={13} color="#374151" strokeWidth={1.5} />
                <span className="text-[12px] font-semibold text-[#374151] font-display">
                  {usedSeats} of {totalSeats} seats used
                </span>
              </div>
              {usedSeats >= totalSeats && (
                <span className="text-[11px] font-medium text-[#d97706] font-body">All seats filled</span>
              )}
            </div>

            {/* Invite row */}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      if (inviteState === 'error') { setInviteState('idle'); setInviteError('') }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && inviteState !== 'sent' && handleInvite()}
                    placeholder="Enter teammate's email"
                    disabled={inviteState === 'sent'}
                    className={`w-full h-[42px] px-3.5 border rounded-[8px] text-[13px] font-body outline-none transition-all placeholder:text-[#9ca3af] ${
                      inviteState === 'error'
                        ? 'border-[#d51520] bg-white text-[#111827]'
                        : inviteState === 'sent'
                        ? 'border-[#16a34a] bg-[#ecfdf3] text-[#16a34a] pr-16'
                        : 'border-[#e5e7eb] bg-white text-[#111827] focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
                    }`}
                  />
                  {inviteState === 'sent' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                      <CheckmarkCircle01Icon size={14} color="#16a34a" strokeWidth={2} />
                      <span className="text-[12px] font-semibold text-[#16a34a] font-body">Sent ✓</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleInvite}
                  disabled={inviteState === 'sent' || usedSeats >= totalSeats}
                  className="h-[42px] px-5 bg-[#111827] hover:bg-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold font-display rounded-[8px] transition-colors flex-shrink-0"
                >
                  Invite
                </button>
              </div>
              {inviteState === 'error' && inviteError && (
                <p className="flex items-center gap-1.5 text-[11px] text-[#d51520] font-body">
                  <AlertCircleIcon size={11} color="#d51520" strokeWidth={1.5} />
                  {inviteError}
                </p>
              )}
            </div>

            {/* Member list */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-2">
                Members
              </p>
              <div className="flex flex-col gap-0.5">
                {members.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[13px] text-[#9ca3af] font-body">
                      No team members yet. Invite someone above.
                    </p>
                  </div>
                ) : (
                  members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      cohortStarted={cohortStarted}
                      onAction={handleAction}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <ConfirmModal
          type={confirm.type}
          target={confirmTarget}
          onConfirm={executeConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

// ── Team Member Modal (read-only) ─────────────────────────────────────────────
function TeamMemberModal({ team, onClose }: { team: TeamData; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-[16px] shadow-[0px_20px_60px_rgba(16,24,40,0.18)] w-full max-w-[480px] overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-[#f3f4f6] flex items-start justify-between gap-4">
            <div>
              <p className="text-[16px] font-bold text-[#111827] font-display">
                {team.leadName}&apos;s team
              </p>
              <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
                You&apos;re a member of this team
              </p>
            </div>
            <CloseBtn onClick={onClose} />
          </div>

          {/* Members */}
          <div className="px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Team Members
            </p>
            <div className="flex flex-col gap-1.5">
              {team.members.map((m) => {
                const cfg = STATUS_CFG[m.status]
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-[8px] bg-[#f9fafb]">
                    <div className="w-8 h-8 rounded-full bg-[#1a1d2e] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white font-display">
                        {getInitial(m.name ?? m.email)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#111827] font-body truncate">
                        {m.name ?? m.email}
                      </p>
                      {m.name && (
                        <p className="text-[11px] text-[#9ca3af] font-body truncate">{m.email}</p>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-display flex-shrink-0"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-6 pb-5">
            <button
              onClick={onClose}
              className="w-full h-[40px] border border-[#e5e7eb] text-[13px] font-medium font-body text-[#374151] rounded-[8px] hover:bg-[#f9fafb] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Upgrade modal (individual accounts) ──────────────────────────────────────
function TeamUpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-[16px] shadow-[0px_20px_60px_rgba(16,24,40,0.18)] w-full max-w-[400px] p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
            aria-label="Close"
          >
            <Cancel01Icon size={16} color="#6b7280" strokeWidth={1.5} />
          </button>

          <div className="w-12 h-12 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mb-5">
            <UserGroupIcon size={22} color="#d51520" strokeWidth={1.5} />
          </div>

          <h2 className="text-[20px] font-bold text-[#111827] font-display mb-2">
            Collaborate with your team
          </h2>
          <p className="text-[14px] text-[#6b7280] font-body leading-relaxed mb-6">
            Team plans start from 2 seats. Upgrade to invite teammates to the same cohort.
          </p>

          <a
            href="https://brixgate.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-[44px] bg-[#d51520] hover:bg-[#b81119] text-white text-[14px] font-semibold font-display rounded-[8px] transition-colors flex items-center justify-center"
          >
            View Pricing
          </a>
        </div>
      </div>
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function TeamFeature({
  accountType,
  onClose,
}: {
  accountType: TeamAccountType
  onClose: () => void
}) {
  if (accountType === 'individual') return <TeamUpgradeModal onClose={onClose} />
  if (accountType === 'team_member') return <TeamMemberModal team={DUMMY_TEAM} onClose={onClose} />
  return <TeamLeadModal initialTeam={DUMMY_TEAM} onClose={onClose} />
}
