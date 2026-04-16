'use client'

import { useState } from 'react'
import TopNav from '@/components/layout/TopNav'
import { MOCK_SESSIONS, MOCK_ENROLLMENTS, getSessionsByStatus } from '@/lib/mock-data'
import type { Session } from '@/lib/types'
import {
  Video01Icon,
  PlayCircleIcon,
  Clock01Icon,
  Calendar01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  RadioIcon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

const TABS = ['Upcoming', 'Past Sessions'] as const
type Tab = (typeof TABS)[number]

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  live: {
    label: 'Live Now',
    bg: '#ecfdf3',
    text: '#16a34a',
    border: '#bbf7d0',
    dot: '#16a34a',
  },
  upcoming: {
    label: 'Upcoming',
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
    dot: '#3b82f6',
  },
  completed: {
    label: 'Completed',
    bg: '#f9fafb',
    text: '#6b7280',
    border: '#e5e7eb',
    dot: '#9ca3af',
  },
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const cfg = STATUS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium font-display px-2.5 py-1 rounded-full border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status === 'live' && 'animate-pulse')}
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  })
}

// ── Session row ───────────────────────────────────────────────────────────────
function SessionRow({
  session,
  isHighlighted,
}: {
  session: Session
  isHighlighted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-5 py-4 border-b border-[#f3f4f6] last:border-b-0 transition-colors',
        isHighlighted ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
      )}
    >
      {/* Session number */}
      <div
        className={cn(
          'w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[13px] font-bold font-display',
          isHighlighted ? 'bg-[#d51520] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'
        )}
      >
        {String(session.sessionNumber).padStart(2, '0')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#111827] font-display truncate">
          {session.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[12px] text-[#9ca3af] font-body">
            <Calendar01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
            {formatDate(session.date)}
          </span>
          <span className="text-[#e5e7eb]">·</span>
          <span className="flex items-center gap-1 text-[12px] text-[#9ca3af] font-body">
            <Clock01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
            {session.time}
          </span>
          <span className="text-[#e5e7eb]">·</span>
          <span className="text-[12px] text-[#9ca3af] font-body">{session.duration}</span>
        </div>
      </div>

      {/* Status */}
      <StatusBadge status={session.status} />

      {/* Action */}
      <div className="flex-shrink-0">
        {session.status === 'live' && (
          <a
            href={session.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[12px] font-medium font-display px-4 py-2 rounded-[7px] hover:bg-[#b81119] transition-colors"
          >
            <RadioIcon size={13} color="white" strokeWidth={2} />
            Join Now
          </a>
        )}
        {session.status === 'upcoming' && (
          <a
            href={session.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#e5e7eb] text-[#374151] text-[12px] font-medium font-display px-4 py-2 rounded-[7px] hover:bg-[#f9fafb] transition-colors"
          >
            <ArrowRight01Icon size={13} color="#374151" strokeWidth={2} />
            Add to Calendar
          </a>
        )}
        {session.status === 'completed' && session.recordingLink && (
          <a
            href={session.recordingLink}
            className="inline-flex items-center gap-2 text-[#d51520] text-[12px] font-medium font-display hover:underline"
          >
            <PlayCircleIcon size={14} color="#d51520" strokeWidth={1.5} />
            Watch Recording
          </a>
        )}
        {session.status === 'completed' && !session.recordingLink && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#9ca3af] font-body">
            <CheckmarkCircle01Icon size={13} color="#9ca3af" strokeWidth={1.5} />
            No recording
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SessionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Upcoming')
  const isEnrolled = MOCK_ENROLLMENTS.length > 0
  const { upcoming, past } = getSessionsByStatus(MOCK_SESSIONS)
  const liveSessions = MOCK_SESSIONS.filter((s) => s.status === 'live')

  // Upcoming tab = live + upcoming; Past tab = completed
  const upcomingSessions = [...liveSessions, ...upcoming.filter((s) => s.status !== 'live')].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const pastSessions = [...past].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const displayed = activeTab === 'Upcoming' ? upcomingSessions : pastSessions
  const liveCount = liveSessions.length

  return (
    <>
      <TopNav title="Live Sessions" />

      <div className="px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
              Live Sessions
            </h1>
            <p className="text-[14px] text-[#6b7280] font-body mt-1">
              Join your scheduled live classes and access past recordings.
            </p>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2 bg-[#ecfdf3] border border-[#bbf7d0] rounded-[8px] px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="text-[13px] font-semibold text-[#16a34a] font-display">
                {liveCount} session live now
              </span>
            </div>
          )}
        </div>

        {!isEnrolled ? (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={Video01Icon}
              title="No sessions yet"
              description="Enrol in a programme to access live sessions and recordings."
              action={{ label: 'Browse Programmes', href: '/student/programs' }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-[#f3f4f6] px-5">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex flex-col items-center mr-6 last:mr-0 pt-0"
                >
                  <span
                    className={cn(
                      'py-4 text-[14px] font-display transition-colors',
                      activeTab === tab
                        ? 'font-semibold text-[#d51520]'
                        : 'font-normal text-[#6b7280] hover:text-[#374151]'
                    )}
                  >
                    {tab}
                    {tab === 'Upcoming' && upcomingSessions.length > 0 && (
                      <span
                        className={cn(
                          'ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full font-display',
                          activeTab === tab
                            ? 'bg-[#fef2f2] text-[#d51520]'
                            : 'bg-[#f3f4f6] text-[#9ca3af]'
                        )}
                      >
                        {upcomingSessions.length}
                      </span>
                    )}
                  </span>
                  <div
                    className={cn(
                      'h-[2px] w-full rounded-t-full transition-colors',
                      activeTab === tab ? 'bg-[#d51520]' : 'bg-transparent'
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Session list */}
            {displayed.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                  <Video01Icon size={24} color="#9ca3af" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">
                  {activeTab === 'Upcoming' ? 'No upcoming sessions' : 'No past sessions'}
                </p>
                <p className="text-[13px] text-[#9ca3af] font-body max-w-[280px]">
                  {activeTab === 'Upcoming'
                    ? 'New sessions will appear here once scheduled.'
                    : 'Completed sessions and recordings will appear here.'}
                </p>
              </div>
            ) : (
              <div>
                {displayed.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    isHighlighted={session.status === 'live'}
                  />
                ))}
              </div>
            )}

            {/* Footer summary */}
            {displayed.length > 0 && (
              <div className="px-5 py-3 bg-[#f9fafb] border-t border-[#f3f4f6]">
                <p className="text-[12px] text-[#9ca3af] font-body">
                  Showing {displayed.length} session{displayed.length !== 1 ? 's' : ''}
                  {activeTab === 'Past Sessions' && ' · Recordings available for watched classes'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
