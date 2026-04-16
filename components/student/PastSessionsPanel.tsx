import { MOCK_SESSIONS, getSessionsByStatus } from '@/lib/mock-data'
import Link from 'next/link'

export default function PastSessionsPanel() {
  const { past } = getSessionsByStatus(MOCK_SESSIONS)

  return (
    <div className="bg-white rounded-[10px] p-5 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[16px] font-semibold text-[#111827] font-display leading-none">
          Past Sessions
        </p>
        <span className="text-[11px] font-medium text-[#9ca3af] font-body">
          {past.length} completed
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {past.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-3 py-2.5 px-1 rounded-[6px] hover:bg-[#f9fafb] transition-colors group"
          >
            {/* Session badge */}
            <div className="w-7 h-7 rounded-[6px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-[#d51520] font-display">
                S{session.sessionNumber}
              </span>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#374151] font-body leading-snug truncate">
                {session.title}
              </p>
              <p className="text-[10px] text-[#9ca3af] font-body mt-0.5">
                {new Date(session.date).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            {/* Recording link */}
            {session.recordingLink && (
              <Link
                href={session.recordingLink}
                className="text-[10px] font-semibold text-[#d51520] font-display opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                Watch
              </Link>
            )}
          </div>
        ))}

        {past.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-9 h-9 rounded-[8px] bg-[#f7f8fa] flex items-center justify-center mb-2">
              <div className="w-2 h-2 rounded-full bg-[#d1d5db]" />
            </div>
            <p className="text-[12px] font-medium text-[#374151] font-display">No sessions yet</p>
            <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
              Completed sessions will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
