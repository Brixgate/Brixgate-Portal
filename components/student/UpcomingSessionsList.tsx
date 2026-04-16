import Link from 'next/link'
import { Video, Clock, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MOCK_SESSIONS, getSessionsByStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  upcoming:  { label: 'Upcoming',  variant: 'upcoming'  as const },
  live:      { label: 'Live',      variant: 'active'    as const },
  completed: { label: 'Completed', variant: 'completed' as const },
}

export default function UpcomingSessionsList() {
  const { upcoming } = getSessionsByStatus(MOCK_SESSIONS)
  const liveSessions = MOCK_SESSIONS.filter((s) => s.status === 'live')
  const sessions = [...liveSessions, ...upcoming].slice(0, 4)

  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#111827] font-[var(--font-dm-sans)]">
          Upcoming Sessions
        </h3>
        <Link
          href="/student/sessions"
          className="text-[13px] text-[#D51520] font-medium hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </Link>
      </div>
      <div className="h-px bg-[#F3F4F6]" />

      {/* Sessions */}
      <div className="p-4 space-y-1">
        {sessions.length === 0 && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[10px] bg-[#F7F8FA] flex items-center justify-center mb-3">
              <Video className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-medium text-[#111827]">No upcoming sessions</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Sessions will appear here when scheduled.</p>
          </div>
        )}

        {sessions.map((session) => {
          const config = STATUS_CONFIG[session.status]
          const isHighlighted = session.status === 'live'

          return (
            <div
              key={session.id}
              className={cn(
                'flex items-center gap-4 px-3 py-3 rounded-[8px] transition-colors',
                isHighlighted ? 'bg-[#FEF2F2]' : 'hover:bg-[#F9FAFB]'
              )}
            >
              {/* Session number */}
              <div className={cn(
                'w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold font-[var(--font-dm-sans)]',
                isHighlighted ? 'bg-[#D51520] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
              )}>
                {String(session.sessionNumber).padStart(2, '0')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111827] truncate">{session.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[12px] text-[#9CA3AF] flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.8} />
                    {session.time}
                  </span>
                  <span className="text-[12px] text-[#9CA3AF]">·</span>
                  <span className="text-[12px] text-[#9CA3AF]">{session.duration}</span>
                </div>
              </div>

              {/* Badge */}
              <Badge variant={config.variant} className="flex-shrink-0">
                {config.label}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
