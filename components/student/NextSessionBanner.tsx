import { Calendar, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MOCK_SESSIONS, getSessionsByStatus } from '@/lib/mock-data'

export default function NextSessionBanner() {
  const { upcoming } = getSessionsByStatus(MOCK_SESSIONS)
  const liveSessions = MOCK_SESSIONS.filter((s) => s.status === 'live')
  const nextSession = liveSessions[0] ?? upcoming[0]

  if (!nextSession) return null

  const isLive = nextSession.status === 'live'

  return (
    <div className="bg-[#FEF2F2] rounded-[12px] px-6 py-5 flex items-center justify-between gap-6 border border-[#FECACA]">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Icon bubble */}
        <div className="w-11 h-11 rounded-[10px] bg-[#D51520] flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" strokeWidth={2} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#D51520]">
              {isLive ? '🔴 Live Now' : 'Next Session'}
            </span>
          </div>
          <p className="text-[15px] font-semibold text-[#111827] font-[var(--font-dm-sans)]">
            Session {String(nextSession.sessionNumber).padStart(2, '0')} — {nextSession.title}
          </p>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
              {new Date(nextSession.date).toLocaleDateString('en-NG', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
              {nextSession.time} · {nextSession.duration}
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button asChild className="flex-shrink-0 gap-2">
        <a href={nextSession.zoomLink} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4" strokeWidth={2} />
          {isLive ? 'Join Now' : 'Join Session'}
        </a>
      </Button>
    </div>
  )
}
